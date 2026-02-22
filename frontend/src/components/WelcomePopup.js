import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "../config/api";

const WelcomePopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const checkAndShowPopup = async () => {
      // Check if already shown this session
      const popupShown = sessionStorage.getItem("welcomePopupShown");
      
      try {
        const res = await axios.get(`${API}/welcome-popup`);
        const data = res.data;
        
        setPopupData(data);
        
        // Show popup if enabled and not shown this session (or if show_once_per_session is false)
        if (data.enabled && data.video_url) {
          if (!data.show_once_per_session || !popupShown) {
            // Small delay for better UX
            setTimeout(() => {
              setIsOpen(true);
              if (data.show_once_per_session) {
                sessionStorage.setItem("welcomePopupShown", "true");
              }
            }, 1500);
          }
        }
      } catch (e) {
        console.error("Error fetching welcome popup:", e);
      }
    };

    checkAndShowPopup();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setIsPlaying(false);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!popupData || !popupData.enabled || !popupData.video_url) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          data-testid="welcome-popup-backdrop"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm"></div>

          {/* Popup Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.4, type: "spring", damping: 20 }}
            className="relative w-full max-w-4xl bg-card border border-white/20 overflow-hidden shadow-2xl"
            data-testid="welcome-popup-content"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/80 transition-colors group"
              data-testid="close-popup-btn"
            >
              <X size={24} className="text-white/70 group-hover:text-white" />
            </button>

            {/* Video Container */}
            <div className="relative aspect-video bg-black">
              {!isPlaying ? (
                <>
                  {/* Video Thumbnail / Preview */}
                  <video
                    src={`${API.replace('/api', '')}${popupData.video_url}`}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  
                  {/* Overlay with Play Button */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsPlaying(true)}
                      className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
                      data-testid="play-video-btn"
                    >
                      <Play size={36} className="text-black ml-1" fill="black" />
                    </motion.button>
                  </div>

                  {/* Gradient overlays */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-card to-transparent"></div>
                </>
              ) : (
                <video
                  src={`${API.replace('/api', '')}${popupData.video_url}`}
                  className="w-full h-full object-contain bg-black"
                  controls
                  autoPlay
                  playsInline
                  data-testid="video-player"
                />
              )}
            </div>

            {/* Text Content */}
            <div className="p-8 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-primary font-bold text-2xl md:text-3xl mb-3"
              >
                <span className="text-gold-gradient">{popupData.title}</span>
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-secondary text-white/60 mb-6"
              >
                {popupData.subtitle}
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center gap-4"
              >
                <button
                  onClick={handleClose}
                  className="btn-outline px-6 py-3 text-sm"
                  data-testid="popup-close-btn"
                >
                  Fermer
                </button>
                <Link
                  to={popupData.button_link}
                  onClick={handleClose}
                  className="btn-primary px-6 py-3 text-sm inline-flex items-center gap-2"
                  data-testid="popup-cta-btn"
                >
                  {popupData.button_text}
                  <ArrowRight size={16} />
                </Link>
              </motion.div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-primary/10 to-transparent pointer-events-none"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomePopup;
