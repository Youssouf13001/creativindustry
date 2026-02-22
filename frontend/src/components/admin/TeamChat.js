import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MessageSquare, X, Send, Users, User, Bell, ChevronDown } from "lucide-react";
import { API } from "../../config/api";

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+fn5+fnp2Vhn50Z15eZ3B8ipSTj4uFfHRqZWdscHZ8gISGhoOAe3d0cW9tb3J2en6BhISEgoB9end1cnFwcXN2eX2AgoSEg4GAf317endzcnFxc3Z5fICChISDgYB+fXt6eHZ1dHR1d3l7fYCBg4SDgoGAfn18e3p4d3Z2d3h6e31/gYKDg4KBgH9+fXx7enl4eHh5ent9f4GCg4OCgYB/fn18fHt6enp6e3x9f4CCg4OCgYCAf35+fXx8e3t7e3x8fX+AgYKCgoGAgH9/fn59fHx8fHx9fX5/gIGBgoKBgYCAf39+fn19fX19fX5+f4CAgYGBgYGAgIB/f39+fn5+fn5+f39/gICAgYGBgICAf39/f35+fn5+fn9/f4CAgICAgICAgH9/f39/f35+fn5/f39/gICAgICAgIB/f39/f39/f39/f39/f4CAgICAgICAf39/f39/f39/f39/f4CAgICAgICAf39/f39/f39/f39/gICAgICAgICAf39/f39/f39/f3+AgICAgICAgIB/f39/f39/f39/f4CAgICAgICAgH9/f39/f39/f39/gICAgICAgICAf39/f39/f39/f3+AgICAgICAgIB/f39/f39/f39/f4CAgICAgICAgH9/f39/f39/f39/gICAgICAgICAgA==";

const TeamChat = ({ token, currentAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null); // null = broadcast
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  
  const headers = { Authorization: `Bearer ${token}` };

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;
  }, []);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load messages
  const loadMessages = async () => {
    try {
      const res = await axios.get(`${API}/team-chat/messages`, { headers });
      const newMessages = res.data;
      
      // Check for new messages
      if (newMessages.length > 0) {
        const latestId = newMessages[newMessages.length - 1].id;
        if (lastMessageIdRef.current && latestId !== lastMessageIdRef.current) {
          // New message arrived
          const latestMessage = newMessages[newMessages.length - 1];
          if (latestMessage.sender_id !== currentAdmin?.id) {
            // Play sound and show notification
            playNotificationSound();
            showNotification(latestMessage);
          }
        }
        lastMessageIdRef.current = latestId;
      }
      
      setMessages(newMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const res = await axios.get(`${API}/team-chat/unread-count`, { headers });
      setUnreadCount(res.data.unread_count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  // Load team members
  const loadTeamMembers = async () => {
    try {
      const res = await axios.get(`${API}/team-chat/online-users`, { headers });
      setTeamMembers(res.data.filter(m => m.id !== currentAdmin?.id));
    } catch (error) {
      console.error("Error loading team members:", error);
    }
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      audioRef.current?.play();
    } catch (e) {
      console.log("Audio play failed:", e);
    }
  };

  // Show browser notification
  const showNotification = (message) => {
    if (Notification.permission === "granted") {
      new Notification(`Message de ${message.sender_name}`, {
        body: message.content,
        icon: "/favicon.ico"
      });
    }
  };

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Poll for new messages
  useEffect(() => {
    if (!token) return;
    
    loadMessages();
    loadUnreadCount();
    loadTeamMembers();
    
    const interval = setInterval(() => {
      loadMessages();
      if (!isOpen) loadUnreadCount();
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(interval);
  }, [token]);

  // Scroll when messages change
  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Mark as read when opened
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      axios.post(`${API}/team-chat/mark-read`, {}, { headers });
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setLoading(true);
    try {
      await axios.post(`${API}/team-chat/send`, {
        content: newMessage.trim(),
        recipient_id: selectedRecipient
      }, { headers });
      
      setNewMessage("");
      loadMessages();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format time
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-yellow-600 text-black shadow-lg hover:shadow-xl transition-all flex items-center justify-center ${isOpen ? 'hidden' : ''}`}
        data-testid="team-chat-btn"
      >
        <MessageSquare className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-yellow-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-black" />
              <div>
                <h3 className="font-bold text-black">Chat Équipe</h3>
                <p className="text-black/70 text-xs">{teamMembers.length + 1} membre(s)</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>

          {/* Recipient Selector */}
          <div className="p-2 border-b border-white/10 bg-white/5">
            <select
              value={selectedRecipient || ""}
              onChange={(e) => setSelectedRecipient(e.target.value || null)}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm [&>option]:bg-[#1a1a1a]"
            >
              <option value="">📢 Tout le monde</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>
                  💬 {member.name} ({member.role === "complet" ? "Admin" : "Collab."})
                </option>
              ))}
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-white/40 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun message</p>
                <p className="text-xs">Commencez la conversation !</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isOwnMessage = msg.sender_id === currentAdmin?.id;
                const showDate = idx === 0 || formatDate(messages[idx - 1].created_at) !== formatDate(msg.created_at);
                
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center text-white/30 text-xs py-2">
                        {formatDate(msg.created_at)}
                      </div>
                    )}
                    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                        {!isOwnMessage && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              msg.sender_role === "complet" 
                                ? "bg-primary/30 text-primary" 
                                : "bg-blue-500/30 text-blue-400"
                            }`}>
                              {msg.sender_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="text-white/60 text-xs">{msg.sender_name}</span>
                          </div>
                        )}
                        <div className={`px-4 py-2 rounded-2xl ${
                          isOwnMessage 
                            ? 'bg-primary text-black rounded-br-sm' 
                            : 'bg-white/10 text-white rounded-bl-sm'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <p className={`text-xs mt-1 ${isOwnMessage ? 'text-right' : 'text-left'} text-white/30`}>
                          {formatTime(msg.created_at)}
                          {msg.recipient_id && (
                            <span className="ml-1">• Message privé</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-white/5">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Écrivez votre message..."
                className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:border-primary"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !newMessage.trim()}
                className="w-10 h-10 rounded-full bg-primary hover:bg-primary/80 text-black flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default TeamChat;
