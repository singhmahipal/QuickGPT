import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import toast from "react-hot-toast";

// ─── Axios Base URL ────────────────────────────────────────────────────────────
axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL;

const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loadingUser, setLoadingUser] = useState(true);

    // Guard ref: prevents fetchUserChats from auto-creating a chat more than once
    const chatCreationInProgress = useRef(false);

    // ─── Axios Interceptors ──────────────────────────────────────────────────────
    // Set up once on mount. Automatically attaches "Bearer <token>" to every
    // outgoing request so individual callers never need to pass headers manually.
    useEffect(() => {
        // Request interceptor — inject token
        const reqInterceptor = axios.interceptors.request.use(
            (config) => {
                const storedToken = localStorage.getItem('token');
                if (storedToken) {
                    config.headers['Authorization'] = `Bearer ${storedToken}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor — handle 401 globally
        const resInterceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                const status = error.response?.status;
                const code   = error.response?.data?.code;

                if (status === 401) {
                    // Token expired or invalid — clear session and redirect to login
                    console.warn('[Auth] 401 received — clearing session');
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);

                    const msg = code === 'TOKEN_EXPIRED'
                        ? 'Your session expired. Please log in again.'
                        : 'Authentication failed. Please log in.';
                    toast.error(msg);
                }

                return Promise.reject(error);
            }
        );

        // Clean up interceptors when provider unmounts
        return () => {
            axios.interceptors.request.eject(reqInterceptor);
            axios.interceptors.response.eject(resInterceptor);
        };
    }, []); // run once on mount — interceptors reference localStorage directly

    // ─── Fetch User ───────────────────────────────────────────────────────────────
    const fetchUser = async () => {
        try {
            const { data } = await axios.get('/api/user/data');
            // No manual header needed — request interceptor injects it

            if (data.success) {
                setUser(data.user);
            } else {
                toast.error(data.message);
                // Invalid token response — clear auth state
                localStorage.removeItem('token');
                setToken(null);
            }
        } catch (error) {
            // 401s are already handled by the response interceptor
            if (error.response?.status !== 401) {
                toast.error(error.response?.data?.message || error.message);
            }
        } finally {
            setLoadingUser(false);
        }
    };

    // ─── Create New Chat ─────────────────────────────────────────────────────────
    const createNewChat = async () => {
        try {
            if (!user) return toast('Login to create a new chat');
            navigate('/');
            await axios.post('/api/chat/create', {});
            await fetchUserChats();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    // ─── Fetch User Chats ────────────────────────────────────────────────────────
    // BUG FIX: The previous version recursively called fetchUserChats() after
    // createNewChat() with no guard — if creation failed or returned 0 chats,
    // this looped infinitely and triggered 429 Too Many Requests.
    const fetchUserChats = async () => {
        try {
            const { data } = await axios.get('/api/chat/get');

            if (data.success) {
                setChats(data.chats);

                if (data.chats.length === 0) {
                    // Only auto-create one chat — never recurse
                    if (!chatCreationInProgress.current) {
                        chatCreationInProgress.current = true;
                        try {
                            await axios.post('/api/chat/create', {});
                            // Re-fetch once after creating
                            const { data: freshData } = await axios.get('/api/chat/get');
                            if (freshData.success) {
                                setChats(freshData.chats);
                                if (freshData.chats.length > 0) {
                                    setSelectedChat(freshData.chats[0]);
                                }
                            }
                        } finally {
                            chatCreationInProgress.current = false;
                        }
                    }
                } else {
                    setSelectedChat(data.chats[0]);
                }
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                toast.error(error.response?.data?.message || error.message);
            }
        }
    };

    // ─── Theme Effect ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // ─── Fetch Chats when User changes ───────────────────────────────────────────
    useEffect(() => {
        if (user) {
            fetchUserChats();
        } else {
            setChats([]);
            setSelectedChat(null);
        }
    }, [user]);

    // ─── Fetch User when Token changes ───────────────────────────────────────────
    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setUser(null);
            setLoadingUser(false);
        }
    }, [token]);

    const value = {
        navigate,
        user, setUser,
        fetchUser,
        chats, setChats,
        selectedChat, setSelectedChat,
        theme, setTheme,
        createNewChat,
        loadingUser,
        fetchUserChats,
        token, setToken,
        axios,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);