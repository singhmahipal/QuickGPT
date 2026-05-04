import { assets } from '../assets/assets';
import { useAppContext } from '../context/AppContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import Message from './Message';
import toast from 'react-hot-toast';
import moment from 'moment';

const ChatBox = () => {
  const containerRef = useRef(null);

  // token is no longer needed here — axios interceptor injects it automatically
  const { selectedChat, theme, user, axios, setUser } = useAppContext();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState('text');
  const [isPublished, setIsPublished] = useState(false);

  // Synchronous guard against double-submit.
  // React setState is async — a second Enter/click can fire before loading=true
  // propagates through the render cycle. useRef is synchronous and instant.
  const submittingRef = useRef(false);

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Synchronous guard — blocks double-submit before React re-renders
    if (submittingRef.current) return;

    if (!user) return toast.error('Login to send message');
    if (!selectedChat?._id) return toast.error('Please select a chat first.');

    if ((mode === 'image' && user.credits < 2) || (mode === 'text' && user.credits < 1)) {
      return toast.error('Not enough credits to continue.');
    }

    // Lock immediately — synchronous, before any awaits
    submittingRef.current = true;
    setLoading(true);

    const promptCopy = prompt;
    setPrompt('');

    // Optimistically show user message in UI
    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: promptCopy,
        timeStamp: Date.now(),
        isImage: false,
      }
    ]);

    try {
      const { data } = await axios.post(
        `/api/message/${mode}`,
        {
          chatId: selectedChat._id,
          prompt: promptCopy,
          isPublished
        }
      );

      if (data.success) {
        setMessages(prev => [...prev, data.reply]);

        const creditCost = mode === 'image' ? 2 : 1;
        setUser(prev => ({ ...prev, credits: prev.credits - creditCost }));
      } else {
        // Structured error from backend — show specific message
        toast.error(data.message || 'Something went wrong.');
        setMessages(prev => prev.slice(0, -1)); // remove optimistic user message
        setPrompt(promptCopy);                  // restore prompt so user can retry
      }
    } catch (error) {
      const status  = error.response?.status;
      const errData = error.response?.data;

      console.error('[ChatBox] Request failed:', { status, errData, msg: error.message });

      if (status === 429) {
        const wait = errData?.retryAfter ?? 10;
        toast.error(`⏱ Rate limited — please wait ${wait}s before trying again.`, { duration: wait * 1000 });
      } else if (status === 402) {
        toast.error('Not enough credits. Please purchase more.');
      } else if (status === 502 || status === 503) {
        toast.error('AI service temporarily unavailable. Please try again in a moment.');
      } else if (status >= 500) {
        toast.error('Server error. Our team has been notified.');
      } else if (!status) {
        // Network error — no response at all
        toast.error('Network error — check your internet connection.');
      } else {
        toast.error(errData?.message || error.message || 'Something went wrong.');
      }

      setMessages(prev => prev.slice(0, -1)); // remove optimistic user message
      setPrompt(promptCopy);                  // restore prompt
    } finally {
      setLoading(false);
      submittingRef.current = false; // always unlock, even on error
    }
  }, [user, selectedChat, mode, prompt, isPublished, axios, setUser]);


  // Load selected chat messages
  useEffect(() => {
    if (selectedChat) {
      setMessages(selectedChat.messages);
    }
  }, [selectedChat]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  return (
    <div className='flex-1 flex flex-col justify-between m-5 md:m-10 xl:mx-30 max-md:mt-14 2xl:pr-40'>

      {/* Chat Messages */}
      <div ref={containerRef} className="flex-1 mb-5 overflow-y-scroll">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-primary">
            <img src={theme === "dark" ? assets.logo_full : assets.logo_full_dark} alt="logo" className="w-full max-w-56 sm:max-w-68" />
            <p className="mt-5 text-4xl sm:text-6xl text-center text-gray-400 dark:text-white">Ask me anything</p>
          </div>
        )}

        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}

        {/* Three dots loading animation */}
        {loading && (
          <div className="loader flex items-center gap-1.5 mt-4 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-white animate-bounce [animation-delay:0ms]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-white animate-bounce [animation-delay:150ms]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-white animate-bounce [animation-delay:300ms]"></div>
          </div>
        )}
      </div>

      {/* Image publish toggle */}
      {mode === 'image' && (
        <label className="inline-flex items-center gap-2 mb-3 text-sm mx-auto">
          <p className="text-xs">Publish Generated Image to Community</p>
          <input
            type="checkbox"
            className="cursor-pointer"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
        </label>
      )}

      {/* Prompt input box */}
      <form onSubmit={onSubmit} className='bg-primary/20 dark:bg-[#583c79]/30 border border-primary dark:border-[#80609f]/30 rounded-full w-full max-w-2xl p-3 pl-4 mx-auto flex gap-4 items-center'>
        <select
          onChange={(e) => setMode(e.target.value)}
          value={mode}
          className="text-sm pl-3 pr-2 outline-none"
        >
          <option value="text" className="dark:bg-purple-900">Text</option>
          <option value="image" className="dark:bg-purple-900">Image</option>
        </select>
        <input
          type="text"
          onChange={(e) => setPrompt(e.target.value)}
          value={prompt}
          placeholder='Type your prompt here...'
          className='flex-1 w-full text-sm outline-none'
          required
          disabled={loading}
        />
        <button disabled={loading}>
          <img
            src={loading ? assets.stop_icon : assets.send_icon}
            alt="send or stop icon"
            className="w-8 cursor-pointer"
          />
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
