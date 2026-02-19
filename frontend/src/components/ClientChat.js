import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Send, X, Paperclip, Image, File, Loader, MinusCircle } from "lucide-react";
import axios from "axios";
import { API, BACKEND_URL } from "../config/api";
import { toast } from "sonner";

const ClientChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);
  
  const token = localStorage.getItem("client_token");
  const clientUser = JSON.parse(localStorage.getItem("client_user") || "{}");
  const headers = { Authorization: `Bearer ${token}` };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/chat/my-messages`, { headers });
      setMessages(res.data);
      setUnreadCount(0);
    } catch (e) {
      console.error("Error fetching messages:", e);
    }
  }, [token]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/chat/client/unread-count`, { headers });
      setUnreadCount(res.data.unread_count);
    } catch (e) {
      console.error("Error fetching unread count:", e);
    }
  }, [token]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (!token || !clientUser.id) return;
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/api/ws/chat/client/${clientUser.id}?token=${token}`);
    
    ws.onopen = () => {
      setConnected(true);
      console.log("Chat WebSocket connected");
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_message") {
        setMessages(prev => [...prev, data.message]);
        if (!isOpen || isMinimized) {
          setUnreadCount(prev => prev + 1);
        }
        scrollToBottom();
      }
    };
    
    ws.onclose = () => {
      setConnected(false);
      console.log("Chat WebSocket disconnected");
      // Reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    wsRef.current = ws;
  }, [token, clientUser.id, isOpen, isMinimized]);

  // Initialize
  useEffect(() => {
    if (token) {
      fetchUnreadCount();
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, fetchUnreadCount, connectWebSocket]);

  // Fetch messages when opening chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      fetchMessages();
      scrollToBottom();
    }
  }, [isOpen, isMinimized, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !wsRef.current) return;
    
    const messageData = {
      content: newMessage,
      message_type: "text"
    };
    
    wsRef.current.send(JSON.stringify(messageData));
    
    // Optimistic update
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender_type: "client",
      sender_name: clientUser.name || "Moi",
      content: newMessage,
      message_type: "text",
      created_at: new Date().toISOString()
    }]);
    
    setNewMessage("");
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await axios.post(`${API}/chat/upload`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      
      // Send message with file
      const messageData = {
        content: file.name,
        message_type: res.data.message_type,
        file_url: res.data.file_url,
        file_name: res.data.file_name
      };
      
      wsRef.current.send(JSON.stringify(messageData));
      
      // Optimistic update
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender_type: "client",
        sender_name: clientUser.name || "Moi",
        content: file.name,
        message_type: res.data.message_type,
        file_url: res.data.file_url,
        file_name: res.data.file_name,
        created_at: new Date().toISOString()
      }]);
      
    } catch (e) {
      toast.error("Erreur lors de l'envoi du fichier");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Format time
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Render message content
  const renderMessageContent = (msg) => {
    if (msg.message_type === "image" && msg.file_url) {
      return (
        <a href={`${BACKEND_URL}${msg.file_url}`} target="_blank" rel="noopener noreferrer">
          <img 
            src={`${BACKEND_URL}${msg.file_url}`} 
            alt={msg.file_name} 
            className="max-w-[200px] max-h-[200px] rounded object-cover"
          />
        </a>
      );
    }
    if (msg.message_type === "file" && msg.file_url) {
      return (
        <a 
          href={`${BACKEND_URL}${msg.file_url}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <File size={16} />
          {msg.file_name || "Fichier"}
        </a>
      );
    }
    return <p className="text-sm">{msg.content}</p>;
  };

  if (!token) return null;

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          data-testid="client-chat-button"
          className="fixed bottom-6 right-6 z-50 bg-primary text-black w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
        >
          <MessageSquare size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`fixed bottom-6 right-6 z-50 bg-card border border-white/20 shadow-2xl flex flex-col transition-all ${
            isMinimized ? "w-72 h-12" : "w-96 h-[500px]"
          }`}
          data-testid="client-chat-window"
        >
          {/* Header */}
          <div className="bg-primary text-black px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} />
              <span className="font-bold">Chat CREATIVINDUSTRY</span>
              {connected && <span className="w-2 h-2 bg-green-600 rounded-full" title="Connecté"></span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMinimized(!isMinimized)} className="hover:opacity-70">
                <MinusCircle size={18} />
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:opacity-70">
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-white/50 py-8">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Commencez une conversation avec notre équipe</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          msg.sender_type === "client"
                            ? "bg-primary text-black"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        {msg.sender_type === "admin" && (
                          <p className="text-xs font-bold mb-1 text-primary">{msg.sender_name}</p>
                        )}
                        {renderMessageContent(msg)}
                        <p className={`text-xs mt-1 ${msg.sender_type === "client" ? "text-black/60" : "text-white/40"}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-white/60 hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {uploading ? <Loader size={20} className="animate-spin" /> : <Paperclip size={20} />}
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Écrivez votre message..."
                    className="flex-1 bg-white/10 border border-white/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="bg-primary text-black p-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ClientChat;
