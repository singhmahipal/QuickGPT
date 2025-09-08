import axios from "axios";
import imagekit from "../configs/imageKit.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import openai from "../configs/openai.js";

//Text-based AI Chat Message Controller
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        //check credits
        if (req.user.credits < 1) {
            return res.json({success: false, message: "you don't have enough credits to use this feature"});
        }

        const {chatId, prompt} = req.body;

        const chat = await Chat.findOne({userId, _id: chatId});
        chat.messages.push({role: "user", content: prompt, timeStamp: Date.now(), isImage: false});

        const { choices } = await openai.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const reply = {...choices[0].message, timeStamp: Date.now(), isImage: false}
    
        chat.messages.push(reply);
        await chat.save();
        await UserActivation.updateOne({_id: userId}, {$inc: {credits: -1}});

        return res.json({success: true, reply});
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

// Image generation message controller
export const imageMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        //checks credits
        if (req.user.credits < 2) {
            return res.json({success: false, message: "you don't have enough credits to use this features"});
        }

        const {prompt, chatId, isPublished} = req.body;

        //find chat
        const chat = await Chat.findOne({userId, _id: chatId});

        //push user message
        chat.messages.push({
            role: "user",
            content: prompt,
            timeStamp: Date.now(),
            isImage: false
        });

        //encode the prompt
        const encodedPrompt = encodeURIComponent(prompt);

        //construct imagekit AI generation URL
        const generatedImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/apnagpt/${Date.now()}.png?tr=w-800,h-800`;

        //trigger generation by fetching from imagekit
        const aiImageResponse = await axios.get(generatedImageUrl, {responseType: "arraybuffer"});

        //convert to base64
        const base64Image = `data:image/png;base64,${Buffer.from(aiImageResponse.data,"binary").toString('base64')}`;

        //upload to imagekit media library
        const uploadResponse = await imagekit.upload({
            file: base64Image,
            fileName: `${Date.now()}.png`,
            folder: "apnagpt"
        });

        const reply = {
            role: 'assistant',
            content: uploadResponse.url,
            timeStamp: Date.now(),
            isImage: true,
            isPublished
        };

        chat.messages.push(reply);
        await chat.save();
        await User.updateOne({_id: userId}, {$inc: {credits: -2}});

        return res.json({success: true, reply});
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}