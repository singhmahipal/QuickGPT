import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { assets } from '../assets/assets';
import moment from 'moment';
import toast from 'react-hot-toast';

const Sidebar = ({ isMenuOpen, setIsMenuOpen }) => {
  const {
    chats,
    setSelectedChat,
    theme,
    setTheme,
    user,
    navigate,
    createNewChat,
    axios,
    setChats,
    fetchUserChats,
    setToken,
    token
  } = useAppContext();

  const [search, setSearch] = useState('');
  const [isChatsLoading, setIsChatsLoading] = useState(false);

  const loadChats = async () => {
    setIsChatsLoading(true);
    try {
      await fetchUserChats();
    } catch (error) {
      toast.error("Failed to load chats");
    } finally {
      setIsChatsLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      loadChats();
    }
  }, [user, token]);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    toast.success('Logged out successfully');
  };

  const deleteChat = async (e, chatId) => {
    try {
      e.stopPropagation();
      const confirmDelete = window.confirm('Are you sure you want to delete this chat?');
      if (!confirmDelete) return;

      const { data } = await axios.post('/api/chat/delete', { chatId }, { headers: { Authorization: token } });
      if (data.success) {
        setChats(prev => prev.filter(chat => chat._id !== chatId));
        await fetchUserChats();
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats;

    const searchLower = search.toLowerCase();
    return chats.filter(chat => {
      const firstMessage = chat.messages[0];
      const searchText = firstMessage ? firstMessage.content : chat.name;
      return searchText.toLowerCase().includes(searchLower);
    });
  }, [chats, search]);

  return (
    <div
      className={`flex flex-col h-screen min-w-72 p-5 dark:bg-gradient-to-b from-[#242124]/30 to-[#000000]/30 border-[#80609f]/30 backdrop-blur-3xl transition-all duration-500 max-md:absolute left-0 z-1 ${
        !isMenuOpen && 'max-md:-translate-x-full'
      }`}
    >

      {/* Top Section (static) */}
      <div className="shrink-0">
        {/* Logo */}
        <img
          src={theme === 'dark' ? assets.logo_full : assets.logo_full_dark}
          alt="logo"
          className="w-full max-w-48"
        />

        {/* New Chat Button */}
        <button
          onClick={createNewChat}
          className="flex justify-center items-center w-full py-2 mt-10 text-white bg-gradient-to-r from-[#a456f7] to-[#3d81f6] text-sm rounded-md cursor-pointer"
        >
          <span className="mr-2 text-xl">+</span> New Chat
        </button>

        {/* Search Box */}
        <div className="flex items-center gap-2 p-3 mt-4 border border-gray-400 dark:border-white/20 rounded-md">
          <img src={assets.search_icon} alt="search icon" className="w-4 not-dark:invert" />
          <input
            type="text"
            onChange={e => setSearch(e.target.value)}
            value={search}
            placeholder="Search conversations"
            className="text-xs placeholder:text-gray-400 outline-none flex-1"
          />
        </div>
      </div>

      {/* Middle Section: Scrollable Recent Chats */}
      <div className="flex-1 overflow-y-auto mt-4">
        {filteredChats.length > 0 && <p className="text-sm mb-2">Recent Chats</p>}

        {isChatsLoading ? (
          <div className="animate-pulse space-y-3 pr-1">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="p-2 px-4 border border-gray-300 dark:border-[#80609f]/15 rounded-md"
              >
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 pr-1">
            {filteredChats.map(chat => (
              <ChatItem
                key={chat._id}
                chat={chat}
                onChatSelect={() => {
                  navigate('/');
                  setSelectedChat(chat);
                  setIsMenuOpen(false);
                }}
                onDelete={e =>
                  toast.promise(deleteChat(e, chat._id), { loading: 'Deleting...' })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="shrink-0 mt-4 space-y-4">
        {/* Community Images */}
        <div
          onClick={() => {
            navigate('/community');
            setIsMenuOpen(false);
          }}
          className="flex items-center gap-2 p-3 border border-gray-300 dark:border-white/15 rounded-md cursor-pointer hover:scale-103 transition-all"
        >
          <img src={assets.gallery_icon} alt="community" className="w-4.5 not-dark:invert" />
          <div className="flex flex-col text-sm">
            <p>Community Images</p>
          </div>
        </div>

        {/* Credits */}
        <div
          onClick={() => {
            navigate('/credits');
            setIsMenuOpen(false);
          }}
          className="flex items-center gap-2 p-3 border border-gray-300 dark:border-white/15 rounded-md cursor-pointer hover:scale-103 transition-all"
        >
          <img src={assets.diamond_icon} alt="credits" className="w-4.5 dark:invert" />
          <div className="flex flex-col text-sm">
            <p>Credits: {user?.credits}</p>
            <p className="text-xs text-gray-400">Purchase credits to use QuickGPT</p>
          </div>
        </div>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between gap-2 p-3 border border-gray-300 dark:border-white/15 rounded-md">
          <div className="flex items-center gap-2 text-sm">
            <img src={assets.theme_icon} alt="theme" className="w-4 h-5 not-dark:invert" />
            <p>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</p>
          </div>
          <label className="relative inline-flex cursor-pointer">
            <input
              onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              type="checkbox"
              className="sr-only peer"
              checked={theme === 'dark'}
            />
            <div className="w-9 h-5 bg-gray-400 rounded-full peer-checked:bg-purple-600 transition-all"></div>
            <span className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4"></span>
          </label>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 p-3 border border-gray-300 dark:border-white/15 rounded-md cursor-pointer group">
          <img src={assets.user_icon} alt="user" className="w-7 rounded-full" />
          <p className="flex-1 text-sm dark:text-primary truncate">{user ? user.name : 'Login your account'}</p>
          {user && (
            <img
              onClick={logout}
              src={assets.logout_icon}
              className="h-5 cursor-pointer hidden not-dark:invert group-hover:block"
              alt="logout"
            />
          )}
        </div>
      </div>

      {/* Close icon for mobile */}
      <img
        onClick={() => setIsMenuOpen(false)}
        src={assets.close_icon}
        alt="close"
        className="absolute top-3 right-3 w-5 h-5 cursor-pointer md:hidden not-dark:invert"
      />
    </div>
  );
};

// ChatItem Component
const ChatItem = React.memo(({ chat, onChatSelect, onDelete }) => {
  const displayText =
    chat.messages.length > 0 ? chat.messages[0].content.slice(0, 32) : chat.name;

  const timeAgo = moment(chat.updatedAt).fromNow();

  return (
    <div
      onClick={onChatSelect}
      className="p-2 px-4 dark:bg-[#57317c]/10 border border-gray-300 dark:border-[#80609f]/15 rounded-md cursor-pointer flex justify-between group hover:bg-gray-50 dark:hover:bg-[#57317c]/20 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm">{displayText}</p>
        <p className="text-xs text-gray-500 dark:text-[#b1a6c0]">{timeAgo}</p>
      </div>
      <img
        onClick={onDelete}
        src={assets.bin_icon}
        alt="delete icon"
        className="opacity-0 group-hover:opacity-100 w-4 cursor-pointer not-dark:invert transition-opacity flex-shrink-0 ml-2"
      />
    </div>
  );
});

ChatItem.displayName = 'ChatItem';

export default Sidebar;
