import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { API } from "../config/api";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Bonjour ! 👋 Je suis l'assistant de CREATIVINDUSTRY. Comment puis-je vous aider ? Je peux répondre à vos questions sur nos services de mariage, podcast ou plateau TV."
        }
      ]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/chat`, {
        session_id: sessionId,
        message: userMessage
      });
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Désolé, je rencontre un problème. Veuillez nous contacter au +33 1 23 45 67 89"
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 right-6 z-50 w-14 h-14 flex items-center justify-center transition-all ${
          isOpen ? "bg-white/20 rotate-0" : "bg-primary"
        }`}
        data-testid="chat-toggle"
      >
        {isOpen ? <X size={24} className="text-white" /> : <MessageCircle size={24} className="text-black" />}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-36 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-card border border-white/10 shadow-2xl"
            data-testid="chat-window"
          >
            {/* Header */}
            <div className="bg-primary p-4">
              <h3 className="font-primary font-bold text-black">CREATIVINDUSTRY</h3>
              <p className="text-black/70 text-sm">Assistant virtuel</p>
            </div>

            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-black"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 px-4 py-2 text-sm text-white/60">
                    En train d'écrire...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="border-t border-white/10 p-4 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Écrivez votre message..."
                className="flex-1 bg-background border border-white/20 px-4 py-2 text-sm focus:border-primary focus:outline-none"
                data-testid="chat-input"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn-primary px-4 py-2 disabled:opacity-50"
                data-testid="chat-send"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
