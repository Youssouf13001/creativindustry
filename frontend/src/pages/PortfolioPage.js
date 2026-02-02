import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Video, Play, X, ArrowLeft, Users, Heart, Mic, Tv, ChevronLeft, ChevronRight, Pause } from "lucide-react";
import { API } from "../config/api";

const CATEGORIES = [
  { id: "wedding", label: "Mariages", icon: Heart, color: "from-pink-500 to-rose-600" },
  { id: "podcast", label: "Podcast", icon: Mic, color: "from-blue-500 to-indigo-600" },
  { id: "tv_set", label: "Plateau TV", icon: Tv, color: "from-purple-500 to-violet-600" }
];

// Stories Component (Instagram-like)
const StoriesSection = ({ stories, onStoryClick }) => {
  const scrollRef = useRef(null);
  
  if (!stories || stories.length === 0) return null;
  
  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  return (
    <div className="mb-12">
      <h2 className="font-primary font-bold text-lg mb-4 flex items-center gap-2">
        <Play className="text-primary" size={20} /> Stories
      </h2>
      <div className="relative">
        {/* Scroll buttons */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 p-2 rounded-full hover:bg-primary transition-colors hidden md:block"
        >
          <ChevronLeft size={20} />
        </button>
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 p-2 rounded-full hover:bg-primary transition-colors hidden md:block"
        >
          <ChevronRight size={20} />
        </button>
        
        {/* Stories container */}
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0 cursor-pointer group"
              onClick={() => onStoryClick(index)}
            >
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-[3px] bg-gradient-to-br from-primary via-pink-500 to-purple-500">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-background">
                  {story.thumbnail_url ? (
                    <img 
                      src={story.thumbnail_url} 
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <video 
                      src={story.media_url} 
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                </div>
              </div>
              <p className="text-xs text-center mt-2 text-white/70 truncate w-20 md:w-24">
                {story.client_name || story.title}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Story Viewer (Full screen like Instagram)
const StoryViewer = ({ stories, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef(null);
  const progressInterval = useRef(null);
  
  const currentStory = stories[currentIndex];
  const duration = (currentStory?.story_duration || 3) * 1000; // Convert to ms
  
  useEffect(() => {
    if (isPaused) return;
    
    setProgress(0);
    const startTime = Date.now();
    
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        goToNext();
      }
    }, 50);
    
    return () => clearInterval(progressInterval.current);
  }, [currentIndex, isPaused, duration]);
  
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPaused, currentIndex]);
  
  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };
  
  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'ArrowLeft') goToPrev();
    if (e.key === 'Escape') onClose();
    if (e.key === ' ') setIsPaused(!isPaused);
  };
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isPaused]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      data-testid="story-viewer"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 text-white/70 hover:text-white p-2"
      >
        <X size={32} />
      </button>
      
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-16 flex gap-1 z-20">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100"
              style={{ 
                width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%' 
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Story info */}
      <div className="absolute top-12 left-4 z-20 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-pink-500 p-[2px]">
          <div className="w-full h-full rounded-full bg-black overflow-hidden">
            {currentStory?.thumbnail_url && (
              <img src={currentStory.thumbnail_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
        </div>
        <div>
          <p className="font-primary font-bold text-sm">{currentStory?.client_name || currentStory?.title}</p>
          <p className="text-xs text-white/60">{currentStory?.category === 'wedding' ? 'Mariage' : currentStory?.category === 'podcast' ? 'Podcast' : 'Plateau TV'}</p>
        </div>
      </div>
      
      {/* Navigation areas */}
      <div 
        className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-pointer"
        onClick={goToPrev}
      />
      <div 
        className="absolute right-0 top-0 w-1/3 h-full z-10 cursor-pointer"
        onClick={goToNext}
      />
      <div 
        className="absolute left-1/3 top-0 w-1/3 h-full z-10 cursor-pointer"
        onClick={() => setIsPaused(!isPaused)}
      />
      
      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center z-5 pointer-events-none">
          <div className="bg-black/50 rounded-full p-4">
            <Pause size={48} className="text-white" />
          </div>
        </div>
      )}
      
      {/* Story content */}
      <div className="w-full h-full max-w-lg mx-auto flex items-center justify-center">
        <video
          ref={videoRef}
          src={currentStory?.media_url}
          className="max-h-[80vh] max-w-full object-contain"
          autoPlay
          muted
          playsInline
          loop={false}
        />
      </div>
      
      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          onClick={goToPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 p-3 rounded-full hidden md:block"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 p-3 rounded-full hidden md:block"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </motion.div>
  );
};

const PortfolioPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [storyViewerIndex, setStoryViewerIndex] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await axios.get(`${API}/portfolio`);
        setItems(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  // Parse URL params to restore state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get("category");
    const client = params.get("client");
    if (category) setSelectedCategory(category);
    if (client) setSelectedClient(decodeURIComponent(client));
  }, [location]);

  // Get all stories
  const stories = items.filter(i => i.media_type === "story" && i.is_active !== false);

  // Group items by category and client (excluding stories)
  const getClientsByCategory = (category) => {
    const categoryItems = items.filter(i => 
      i.category === category && 
      i.is_active !== false && 
      i.media_type !== "story"
    );
    const clientsMap = {};
    
    categoryItems.forEach(item => {
      const clientName = item.client_name || "Autres";
      if (!clientsMap[clientName]) {
        clientsMap[clientName] = {
          name: clientName,
          items: [],
          coverPhoto: null
        };
      }
      clientsMap[clientName].items.push(item);
      
      // Set cover photo: prioritize cover_photo > photo media > video thumbnail
      if (!clientsMap[clientName].coverPhoto) {
        if (item.cover_photo) {
          clientsMap[clientName].coverPhoto = item.cover_photo;
        } else if (item.media_type === "photo") {
          clientsMap[clientName].coverPhoto = item.media_url;
        } else if (item.media_type === "video" && item.thumbnail_url) {
          clientsMap[clientName].coverPhoto = item.thumbnail_url;
        }
      }
    });
    
    return Object.values(clientsMap);
  };

  const getClientItems = (category, clientName) => {
    return items.filter(i => 
      i.category === category && 
      (i.client_name || "Autres") === clientName &&
      i.is_active !== false &&
      i.media_type !== "story"
    );
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedClient(null);
    navigate(`/portfolio?category=${categoryId}`);
  };

  const handleClientSelect = (clientName) => {
    setSelectedClient(clientName);
    navigate(`/portfolio?category=${selectedCategory}&client=${encodeURIComponent(clientName)}`);
  };

  const handleBack = () => {
    if (selectedClient) {
      setSelectedClient(null);
      navigate(`/portfolio?category=${selectedCategory}`);
    } else if (selectedCategory) {
      setSelectedCategory(null);
      navigate("/portfolio");
    }
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-white/60">Chargement...</div>
      </div>
    );
  }

  // Render client gallery
  if (selectedCategory && selectedClient) {
    const clientItems = getClientItems(selectedCategory, selectedClient);
    const photos = clientItems.filter(i => i.media_type === "photo");
    const videos = clientItems.filter(i => i.media_type === "video");
    const categoryInfo = CATEGORIES.find(c => c.id === selectedCategory);

    return (
      <div className="pt-20 min-h-screen" data-testid="portfolio-client-gallery">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header with back button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-white/60 hover:text-primary transition-colors mb-6"
              data-testid="portfolio-back-btn"
            >
              <ArrowLeft size={20} />
              <span>Retour aux clients</span>
            </button>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${categoryInfo?.color} flex items-center justify-center`}>
                {categoryInfo && <categoryInfo.icon size={24} className="text-white" />}
              </div>
              <div>
                <p className="text-sm text-white/60 uppercase tracking-wider">{categoryInfo?.label}</p>
                <h1 className="font-primary font-black text-3xl md:text-4xl tracking-tighter">
                  <span className="text-gold-gradient">{selectedClient}</span>
                </h1>
              </div>
            </div>
          </motion.div>

          {/* Photos Section */}
          {photos.length > 0 && (
            <section className="mb-16">
              <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-3">
                <Image className="text-primary" size={20} /> Photos ({photos.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="relative group cursor-pointer overflow-hidden aspect-square"
                    onClick={() => setSelectedItem(item)}
                    data-testid={`portfolio-photo-${item.id}`}
                  >
                    <img
                      src={item.media_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <div>
                        <h3 className="font-primary font-semibold text-sm">{item.title}</h3>
                        {item.description && (
                          <p className="text-white/70 text-xs">{item.description}</p>
                        )}
                      </div>
                    </div>
                    {item.is_featured && (
                      <div className="absolute top-2 right-2 bg-primary text-black text-xs px-2 py-1 font-primary font-bold">
                        Featured
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Videos Section */}
          {videos.length > 0 && (
            <section>
              <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-3">
                <Video className="text-primary" size={20} /> Vidéos ({videos.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card border border-white/10 overflow-hidden card-hover"
                    data-testid={`portfolio-video-${item.id}`}
                  >
                    <div className="relative aspect-video">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-black/50 flex items-center justify-center">
                          <Play size={48} className="text-primary" />
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <div className="w-16 h-16 bg-primary flex items-center justify-center">
                          <Play size={32} className="text-black ml-1" />
                        </div>
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-primary font-semibold">{item.title}</h3>
                      {item.description && (
                        <p className="text-white/60 text-sm mt-1">{item.description}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {clientItems.length === 0 && (
            <div className="text-center text-white/60 py-20">Aucun élément trouvé pour ce client</div>
          )}
        </div>

        {/* Lightbox */}
        <Lightbox selectedItem={selectedItem} onClose={() => setSelectedItem(null)} />
      </div>
    );
  }

  // Render clients list for a category
  if (selectedCategory) {
    const clients = getClientsByCategory(selectedCategory);
    const categoryInfo = CATEGORIES.find(c => c.id === selectedCategory);
    const categoryStories = stories.filter(s => s.category === selectedCategory);

    return (
      <div className="pt-20 min-h-screen" data-testid="portfolio-clients-list">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-white/60 hover:text-primary transition-colors mb-6"
              data-testid="portfolio-back-btn"
            >
              <ArrowLeft size={20} />
              <span>Retour aux catégories</span>
            </button>
            <div className="text-center">
              <div className={`inline-flex w-16 h-16 bg-gradient-to-br ${categoryInfo?.color} items-center justify-center mb-4`}>
                {categoryInfo && <categoryInfo.icon size={32} className="text-white" />}
              </div>
              <h1 className="font-primary font-black text-4xl md:text-5xl tracking-tighter uppercase mb-2">
                <span className="text-gold-gradient">{categoryInfo?.label}</span>
              </h1>
              <p className="font-secondary text-white/60">{clients.length} projet{clients.length > 1 ? 's' : ''}</p>
            </div>
          </motion.div>

          {/* Category Stories */}
          {categoryStories.length > 0 && (
            <StoriesSection 
              stories={categoryStories} 
              onStoryClick={(index) => setStoryViewerIndex(index)}
            />
          )}

          {/* Clients Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client, index) => (
              <motion.div
                key={client.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group cursor-pointer"
                onClick={() => handleClientSelect(client.name)}
                data-testid={`portfolio-client-${client.name}`}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-card border border-white/10">
                  {client.coverPhoto ? (
                    <img
                      src={client.coverPhoto}
                      alt={client.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
                      <Users size={48} className="text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="font-primary font-bold text-xl mb-1 group-hover:text-primary transition-colors">
                      {client.name}
                    </h3>
                    <p className="text-white/60 text-sm flex items-center gap-2">
                      <Image size={14} />
                      {client.items.filter(i => i.media_type === "photo").length} photos
                      <Video size={14} className="ml-2" />
                      {client.items.filter(i => i.media_type === "video").length} vidéos
                    </p>
                  </div>
                  <div className="absolute inset-0 border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              </motion.div>
            ))}
          </div>

          {clients.length === 0 && (
            <div className="text-center text-white/60 py-20">Aucun projet dans cette catégorie</div>
          )}
        </div>

        {/* Story Viewer */}
        <AnimatePresence>
          {storyViewerIndex !== null && (
            <StoryViewer 
              stories={categoryStories} 
              initialIndex={storyViewerIndex} 
              onClose={() => setStoryViewerIndex(null)} 
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render categories selection (home view)
  return (
    <div className="pt-20 min-h-screen" data-testid="portfolio-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="font-primary font-black text-4xl md:text-5xl lg:text-6xl tracking-tighter uppercase mb-4">
            <span className="text-gold-gradient">Portfolio</span>
          </h1>
          <p className="font-secondary text-white/60 text-lg">Découvrez nos réalisations par catégorie</p>
        </motion.div>

        {/* Stories Section (all stories) */}
        {stories.length > 0 && (
          <StoriesSection 
            stories={stories} 
            onStoryClick={(index) => setStoryViewerIndex(index)}
          />
        )}

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CATEGORIES.map((category, index) => {
            const clients = getClientsByCategory(category.id);
            const totalItems = clients.reduce((acc, c) => acc + c.items.length, 0);
            const coverPhoto = clients[0]?.coverPhoto;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                className="group cursor-pointer"
                onClick={() => handleCategorySelect(category.id)}
                data-testid={`portfolio-category-${category.id}`}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-card border border-white/10">
                  {coverPhoto ? (
                    <img
                      src={coverPhoto}
                      alt={category.label}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${category.color} opacity-30`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  
                  {/* Icon */}
                  <div className={`absolute top-6 left-6 w-14 h-14 bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                    <category.icon size={28} className="text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="font-primary font-black text-2xl md:text-3xl uppercase tracking-tighter mb-2 group-hover:text-primary transition-colors">
                      {category.label}
                    </h2>
                    <p className="text-white/60 text-sm">
                      {clients.length} client{clients.length > 1 ? 's' : ''} • {totalItems} média{totalItems > 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {/* Hover border */}
                  <div className="absolute inset-0 border-4 border-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {storyViewerIndex !== null && (
          <StoryViewer 
            stories={stories} 
            initialIndex={storyViewerIndex} 
            onClose={() => setStoryViewerIndex(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Lightbox Component
const Lightbox = ({ selectedItem, onClose }) => {
  if (!selectedItem) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
        onClick={onClose}
        data-testid="portfolio-lightbox"
      >
        <button
          className="absolute top-6 right-6 text-white/70 hover:text-white z-10"
          onClick={onClose}
        >
          <X size={32} />
        </button>
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="max-w-5xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {selectedItem.media_type === "photo" ? (
            <img
              src={selectedItem.media_url}
              alt={selectedItem.title}
              className="w-full max-h-[80vh] object-contain"
            />
          ) : (
            <div className="aspect-video">
              <iframe
                src={selectedItem.media_url}
                title={selectedItem.title}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          )}
          <div className="mt-4 text-center">
            <h3 className="font-primary font-bold text-xl">{selectedItem.title}</h3>
            {selectedItem.description && (
              <p className="text-white/60 mt-2">{selectedItem.description}</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PortfolioPage;
