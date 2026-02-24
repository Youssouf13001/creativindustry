import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Play, Pause, ChevronLeft, ChevronRight, 
  Volume2, VolumeX, Maximize2, Share2, QrCode,
  Instagram, MessageCircle, Mail, Download, Copy, Check
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

const GallerySlideshowModal = ({ 
  isOpen, 
  onClose, 
  photos = [], 
  galleryName = "Galerie",
  shareUrl = "",
  musicUrl = null // Optional background music URL
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasMusic, setHasMusic] = useState(false);
  
  const audioRef = useRef(null);
  const slideshowRef = useRef(null);
  const controlsTimeout = useRef(null);

  // Generate QR Code
  useEffect(() => {
    if (shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#D4AF37', light: '#1a1a1a' }
      }).then(setQrCodeUrl);
    }
  }, [shareUrl]);

  // Check if music is available
  useEffect(() => {
    setHasMusic(!!musicUrl);
  }, [musicUrl]);

  // Auto slideshow
  useEffect(() => {
    if (isPlaying && photos.length > 1) {
      slideshowRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % photos.length);
      }, 4000); // 4 seconds per photo
    }
    return () => clearInterval(slideshowRef.current);
  }, [isPlaying, photos.length]);

  // Handle audio
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && !isMuted) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isMuted]);

  // Auto-hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeout.current);
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      switch (e.key) {
        case 'ArrowLeft': goToPrevious(); break;
        case 'ArrowRight': goToNext(); break;
        case ' ': e.preventDefault(); setIsPlaying(p => !p); break;
        case 'Escape': onClose(); break;
        case 'm': setIsMuted(m => !m); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % photos.length);
  };

  const handleShare = (platform) => {
    const text = encodeURIComponent(`Découvrez cette galerie photo : ${galleryName}`);
    const url = encodeURIComponent(shareUrl);
    
    const urls = {
      instagram: `https://www.instagram.com/`, // Can't share directly, just open
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      email: `mailto:?subject=${encodeURIComponent(galleryName)}&body=${text}%20${url}`
    };
    
    if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Lien copié !");
    } else {
      window.open(urls[platform], '_blank');
    }
  };

  const downloadPhoto = async () => {
    const photo = photos[currentIndex];
    if (!photo) return;
    
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.filename || `photo-${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  if (!isOpen) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
        onMouseMove={handleMouseMove}
        onClick={() => setShowControls(true)}
      >
        {/* Background Music */}
        <audio ref={audioRef} src={musicUrl} loop />

        {/* Main Image */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              src={currentPhoto?.url}
              alt={currentPhoto?.filename || `Photo ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain"
            />
          </AnimatePresence>
        </div>

        {/* Controls Overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* Top Bar */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-primary font-bold text-xl text-white">{galleryName}</h3>
                    <p className="text-white/60 text-sm">{currentIndex + 1} / {photos.length}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Share Button */}
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <Share2 size={20} className="text-white" />
                    </button>
                    {/* Close Button */}
                    <button
                      onClick={onClose}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X size={20} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Share Menu */}
              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-20 right-4 bg-card border border-white/10 rounded-lg p-4 pointer-events-auto"
                  >
                    <h4 className="font-bold mb-3 text-white">Partager la galerie</h4>
                    
                    {/* QR Code */}
                    {qrCodeUrl && (
                      <div className="mb-4 p-2 bg-background rounded text-center">
                        <img src={qrCodeUrl} alt="QR Code" className="mx-auto w-32 h-32" />
                        <p className="text-xs text-white/50 mt-1">Scannez pour accéder</p>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => handleShare('whatsapp')}
                        className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded transition-colors"
                      >
                        <MessageCircle size={20} className="text-green-500" />
                        <span className="text-white">WhatsApp</span>
                      </button>
                      <button
                        onClick={() => handleShare('instagram')}
                        className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded transition-colors"
                      >
                        <Instagram size={20} className="text-pink-500" />
                        <span className="text-white">Instagram</span>
                      </button>
                      <button
                        onClick={() => handleShare('email')}
                        className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded transition-colors"
                      >
                        <Mail size={20} className="text-blue-400" />
                        <span className="text-white">Email</span>
                      </button>
                      <button
                        onClick={() => handleShare('copy')}
                        className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded transition-colors"
                      >
                        {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} className="text-white" />}
                        <span className="text-white">{copied ? "Copié !" : "Copier le lien"}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Arrows */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={goToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors pointer-events-auto"
                  >
                    <ChevronLeft size={32} className="text-white" />
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors pointer-events-auto"
                  >
                    <ChevronRight size={32} className="text-white" />
                  </button>
                </>
              )}

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
                <div className="flex items-center justify-between">
                  {/* Left Controls */}
                  <div className="flex items-center gap-3">
                    {/* Play/Pause */}
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-3 bg-primary hover:bg-primary/90 rounded-full transition-colors"
                    >
                      {isPlaying ? (
                        <Pause size={24} className="text-black" />
                      ) : (
                        <Play size={24} className="text-black ml-0.5" />
                      )}
                    </button>
                    
                    {/* Mute/Unmute */}
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX size={20} className="text-white" />
                      ) : (
                        <Volume2 size={20} className="text-white" />
                      )}
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 mx-6">
                    <div className="flex gap-1">
                      {photos.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentIndex(idx)}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            idx === currentIndex ? 'bg-primary' : 'bg-white/30 hover:bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={downloadPhoto}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <Download size={20} className="text-white" />
                    </button>
                  </div>
                </div>

                {/* Keyboard Hints */}
                <div className="flex justify-center gap-6 mt-3 text-white/40 text-xs">
                  <span>← → Navigation</span>
                  <span>Espace Play/Pause</span>
                  <span>M Musique</span>
                  <span>Esc Fermer</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default GallerySlideshowModal;
