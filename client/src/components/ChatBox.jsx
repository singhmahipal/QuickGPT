import { assets } from '../assets/assets';
import { useAppContext } from '../context/AppContext';
import { useState, useEffect, useRef } from 'react';
import Message from './Message';
import toast from 'react-hot-toast';
import moment from 'moment';

const ChatBox = () => {
  const containerRef = useRef(null);

  const { selectedChat, theme, user, axios, token, setUser } = useAppContext();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState('text');
  const [isPublished, setIsPublished] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!user) return toast.error('Login to send message');
    if (!selectedChat?._id) return toast.error('Please select a chat first.');
    if (user?.isActive === false) return toast.error('Please activate your account before using this feature.');

    if ((mode === 'image' && user.credits < 2) || (mode === 'text' && user.credits < 1)) {
      return toast.error('Not enough credits to continue.');
    }

    setLoading(true);
    const promptCopy = prompt;
    setPrompt('');

    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: promptCopy,
        timestamp: new Date().toISOString(),
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
        },
        {
          headers: { Authorization: token }
        }
      );

      if (data.success) {
        setMessages(prev => [...prev, data.reply]);

        // Decrease credits
        const creditCost = mode === 'image' ? 2 : 1;
        setUser(prev => ({
          ...prev,
          credits: prev.credits - creditCost
        }));
      } else {
        toast.error(data.message || 'Something went wrong.');
        setPrompt(promptCopy);
      }
    } catch (error) {
      console.error("Request error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || error.message);
      setPrompt(promptCopy);
    } finally {
      setLoading(false);
    }
  };


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
