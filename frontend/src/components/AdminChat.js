import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Send, X, Paperclip, File, Loader, User, Circle, ChevronLeft, Download, Image } from "lucide-react";
import axios from "axios";
import { API, BACKEND_URL } from "../config/api";
import { toast } from "sonner";

const AdminChat = ({ isOpen, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [onlineClients, setOnlineClients] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);
  
  const token = localStorage.getItem("admin_token");
  const adminUser = JSON.parse(localStorage.getItem("admin_user") || "{}");
  const headers = { Authorization: `Bearer ${token}` };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/chat/conversations`, { headers });
      setConversations(res.data);
    } catch (e) {
      console.error("Error fetching conversations:", e);
    }
  }, [token]);

  // Fetch messages for a client
  const fetchMessages = useCallback(async (clientId) => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/chat/messages/${clientId}`, { headers });
      setMessages(res.data);
    } catch (e) {
      console.error("Error fetching messages:", e);
    }
  }, [token]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (!token || !adminUser.id) return;
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/api/ws/chat/admin/${adminUser.id}?token=${token}`);
    
    ws.onopen = () => {
      setConnected(true);
      console.log("Admin Chat WebSocket connected");
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "online_clients") {
        setOnlineClients(data.clients);
      } else if (data.type === "client_online") {
        setOnlineClients(prev => {
          if (!prev.find(c => c.id === data.client_id)) {
            return [...prev, { id: data.client_id, name: data.client_name }];
          }
          return prev;
        });
        toast.info(`${data.client_name} est en ligne`);
      } else if (data.type === "client_offline") {
        setOnlineClients(prev => prev.filter(c => c.id !== data.client_id));
      } else if (data.type === "new_message") {
        // Add message if from current selected client
        if (selectedClient && data.message.conversation_id === `client_${selectedClient.id}`) {
          setMessages(prev => [...prev, data.message]);
          scrollToBottom();
        }
        // Refresh conversations to update unread count
        fetchConversations();
      }
    };
    
    ws.onclose = () => {
      setConnected(false);
      console.log("Admin Chat WebSocket disconnected");
      setTimeout(connectWebSocket, 5000);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    wsRef.current = ws;
  }, [token, adminUser.id, selectedClient, fetchConversations]);

  // Initialize
  useEffect(() => {
    if (isOpen && token) {
      fetchConversations();
      connectWebSocket();
    }
    return () => {
      if (wsRef.current && !isOpen) {
        wsRef.current.close();
      }
    };
  }, [isOpen, token, fetchConversations, connectWebSocket]);

  // Fetch messages when selecting client
  useEffect(() => {
    if (selectedClient) {
      fetchMessages(selectedClient.id);
    }
  }, [selectedClient, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !wsRef.current || !selectedClient) return;
    
    const messageData = {
      content: newMessage,
      recipient_id: selectedClient.id,
      message_type: "text"
    };
    
    wsRef.current.send(JSON.stringify(messageData));
    
    // Optimistic update
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender_type: "admin",
      sender_name: adminUser.name || "Admin",
      content: newMessage,
      message_type: "text",
      created_at: new Date().toISOString()
    }]);
    
    setNewMessage("");
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedClient) return;
    
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
        recipient_id: selectedClient.id,
        message_type: res.data.message_type,
        file_url: res.data.file_url,
        file_name: res.data.file_name
      };
      
      wsRef.current.send(JSON.stringify(messageData));
      
      // Optimistic update
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender_type: "admin",
        sender_name: adminUser.name || "Admin",
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

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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

  // Check if client is online
  const isClientOnline = (clientId) => {
    return onlineClients.some(c => c.id === clientId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" data-testid="admin-chat-modal">
      <div className="bg-card border border-white/20 w-full max-w-4xl h-[600px] flex">
        {/* Sidebar - Conversations */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-primary" />
              <h2 className="font-bold">Messages</h2>
              {connected && <Circle size={8} className="fill-green-500 text-green-500" />}
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Online clients */}
          {onlineClients.length > 0 && (
            <div className="p-3 bg-green-500/10 border-b border-white/10">
              <p className="text-xs text-green-400 mb-2">En ligne maintenant</p>
              <div className="flex flex-wrap gap-1">
                {onlineClients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full hover:bg-green-500/30"
                  >
                    {client.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-white/50">
                <p>Aucune conversation</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.conversation_id}
                  onClick={() => setSelectedClient(conv.client)}
                  className={`w-full p-3 text-left border-b border-white/5 hover:bg-white/5 transition-colors ${
                    selectedClient?.id === conv.client?.id ? "bg-white/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {conv.client?.profile_photo ? (
                        <img 
                          src={`${BACKEND_URL}${conv.client.profile_photo}`} 
                          alt="" 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User size={20} className="text-primary" />
                        </div>
                      )}
                      {conv.is_online && (
                        <Circle size={10} className="absolute bottom-0 right-0 fill-green-500 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm truncate">{conv.client?.name}</p>
                        <span className="text-xs text-white/40">
                          {formatDate(conv.last_message?.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 truncate">
                        {conv.last_message?.content}
                      </p>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="bg-primary text-black text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedClient ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="md:hidden text-white/60 hover:text-white"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="relative">
                  {selectedClient.profile_photo ? (
                    <img 
                      src={`${BACKEND_URL}${selectedClient.profile_photo}`} 
                      alt="" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User size={20} className="text-primary" />
                    </div>
                  )}
                  {isClientOnline(selectedClient.id) && (
                    <Circle size={10} className="absolute bottom-0 right-0 fill-green-500 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{selectedClient.name}</p>
                  <p className="text-xs text-white/50">
                    {isClientOnline(selectedClient.id) ? "En ligne" : "Hors ligne"}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        msg.sender_type === "admin"
                          ? "bg-primary text-black"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {msg.sender_type === "client" && (
                        <p className="text-xs font-bold mb-1 text-primary">{msg.sender_name}</p>
                      )}
                      {renderMessageContent(msg)}
                      <p className={`text-xs mt-1 ${msg.sender_type === "admin" ? "text-black/60" : "text-white/40"}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
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
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/50">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p>Sélectionnez une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
