import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Video, Play, X, ArrowLeft, Users, Heart, Mic, Tv } from "lucide-react";
import { API } from "../config/api";

const CATEGORIES = [
  { id: "wedding", label: "Mariages", icon: Heart, color: "from-pink-500 to-rose-600" },
  { id: "podcast", label: "Podcast", icon: Mic, color: "from-blue-500 to-indigo-600" },
  { id: "tv_set", label: "Plateau TV", icon: Tv, color: "from-purple-500 to-violet-600" }
];

const PortfolioPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
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

  // Group items by category and client
  const getClientsByCategory = (category) => {
    const categoryItems = items.filter(i => i.category === category && i.is_active !== false);
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
      // Use first photo as cover if not set
      if (!clientsMap[clientName].coverPhoto && item.media_type === "photo") {
        clientsMap[clientName].coverPhoto = item.cover_photo || item.media_url;
      }
    });
    
    return Object.values(clientsMap);
  };

  const getClientItems = (category, clientName) => {
    return items.filter(i => 
      i.category === category && 
      (i.client_name || "Autres") === clientName &&
      i.is_active !== false
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
