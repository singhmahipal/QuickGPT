import axios from "axios";
import imagekit from "../configs/imageKit.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import openai from "../configs/openai.js";

// ─── Helper: structured error logger ──────────────────────────────────────────
const logError = (context, error) => {
    console.error(`[${context}]`, {
        message: error.message,
        status: error?.response?.status,
        data: error?.response?.data,
        stack: error.stack?.split('\n')[1]?.trim(),
    });
};

// ─── Text-based AI Chat Message Controller ────────────────────────────────────
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        // ── Credit check ──────────────────────────────────────────────────────
        if (req.user.credits < 1) {
            return res.status(402).json({
                success: false,
                message: "Not enough credits. Please purchase more.",
                errorCode: "INSUFFICIENT_CREDITS"
            });
        }

        const { chatId, prompt } = req.body;

        // ── Validate input ────────────────────────────────────────────────────
        if (!chatId || !prompt?.trim()) {
            return res.status(400).json({
                success: false,
                message: "chatId and prompt are required.",
                errorCode: "MISSING_FIELDS"
            });
        }

        // ── Load chat ─────────────────────────────────────────────────────────
        const chat = await Chat.findOne({ userId, _id: chatId });

        // Bug #5 fix: explicit null guard
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found.",
                errorCode: "CHAT_NOT_FOUND"
            });
        }

        // ── Build full conversation history for Gemini ────────────────────────
        // Bug #1 fix: send ALL previous messages so the model has context.
        // Gemini via OpenAI-compatible API only supports "user" and "assistant" roles.
        const history = chat.messages
            .filter(m => !m.isImage) // skip image messages — model can't process URLs
            .map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
            }));

        // Append the current user prompt
        history.push({ role: 'user', content: prompt });

        // ── Call Gemini via OpenAI-compatible client ───────────────────────────
        let choices;
        try {
            const response = await openai.chat.completions.create({
                model: "gemini-2.5-flash",
                messages: history,
                max_tokens: 2048,
            });
            choices = response.choices;
        } catch (apiError) {
            logError('Gemini API', apiError);

            // Surface Gemini-specific rate limit as 429
            if (apiError?.status === 429 || apiError?.response?.status === 429) {
                return res.status(429).json({
                    success: false,
                    message: "AI service is currently rate limited. Please wait a moment and try again.",
                    errorCode: "UPSTREAM_RATE_LIMIT",
                    retryAfter: 10, // seconds — hint for the frontend
                });
            }

            return res.status(502).json({
                success: false,
                message: "AI service unavailable. Please try again shortly.",
                errorCode: "UPSTREAM_ERROR"
            });
        }

        // ── Persist and respond ───────────────────────────────────────────────
        const aiMessage = choices[0].message;
        const reply = {
            role: aiMessage.role,
            content: aiMessage.content,
            timeStamp: Date.now(),
            isImage: false,
        };

        // Save user message + AI reply to DB
        chat.messages.push({ role: "user", content: prompt, timeStamp: Date.now(), isImage: false });
        chat.messages.push(reply);
        await chat.save();

        // Deduct credit after successful generation
        await User.updateOne({ _id: userId }, { $inc: { credits: -1 } });

        return res.json({ success: true, reply });

    } catch (error) {
        logError('textMessageController', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during text generation.",
            errorCode: "SERVER_ERROR"
        });
    }
};

// ─── Image Generation Message Controller ─────────────────────────────────────
export const imageMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        // ── Credit check ──────────────────────────────────────────────────────
        if (req.user.credits < 2) {
            return res.status(402).json({
                success: false,
                message: "Not enough credits for image generation (requires 2).",
                errorCode: "INSUFFICIENT_CREDITS"
            });
        }

        const { prompt, chatId, isPublished } = req.body;

        // ── Validate input ────────────────────────────────────────────────────
        if (!chatId || !prompt?.trim()) {
            return res.status(400).json({
                success: false,
                message: "chatId and prompt are required.",
                errorCode: "MISSING_FIELDS"
            });
        }

        // ── Load chat ─────────────────────────────────────────────────────────
        const chat = await Chat.findOne({ userId, _id: chatId });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found.",
                errorCode: "CHAT_NOT_FOUND"
            });
        }

        // ── Generate image via Gemini or fallback ─────────────────────────────
        let imageBuffer;
        try {
            const imagenResponse = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
                {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseModalities: ["IMAGE", "TEXT"],
                    }
                },
                {
                    params: { key: process.env.GEMINI_API_KEY },
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000,
                }
            );

            const candidate = imagenResponse.data?.candidates?.[0];
            const inlineData = candidate?.content?.parts?.find(p => p.inlineData)?.inlineData;

            if (inlineData?.data) {
                imageBuffer = Buffer.from(inlineData.data, 'base64');
            } else {
                throw new Error("Gemini image response missing inline data");
            }
        } catch (apiError) {
            logError('Gemini Image API (trying fallback Pollinations)', apiError);
            try {
                const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
                const fallbackRes = await axios.get(fallbackUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                });
                imageBuffer = Buffer.from(fallbackRes.data);
            } catch (fallbackErr) {
                logError('Pollinations Fallback', fallbackErr);
                return res.status(502).json({
                    success: false,
                    message: "Image generation service unavailable. Please try again.",
                    errorCode: "IMAGE_API_ERROR"
                });
            }
        }


        // ── Upload to ImageKit for permanent storage ───────────────────────────
        let uploadResponse;
        try {
            uploadResponse = await imagekit.upload({
                file: imageBuffer,                    // pass raw buffer — most reliable
                fileName: `${Date.now()}.png`,
                folder: "apnagpt",
                useUniqueFileName: true,
            });
        } catch (uploadError) {
            logError('ImageKit Upload', uploadError);
            return res.status(502).json({
                success: false,
                message: "Failed to store the generated image. Please try again.",
                errorCode: "IMAGEKIT_UPLOAD_FAILED"
            });
        }

        // ── Persist and respond ───────────────────────────────────────────────
        const reply = {
            role: 'assistant',
            content: uploadResponse.url,
            timeStamp: Date.now(),
            isImage: true,
            isPublished: !!isPublished,
        };

        chat.messages.push({ role: "user", content: prompt, timeStamp: Date.now(), isImage: false });
        chat.messages.push(reply);
        await chat.save();

        // Deduct credits after confirmed successful generation + upload
        await User.updateOne({ _id: userId }, { $inc: { credits: -2 } });

        return res.json({ success: true, reply });

    } catch (error) {
        logError('imageMessageController', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during image generation.",
            errorCode: "SERVER_ERROR"
        });
    }
};