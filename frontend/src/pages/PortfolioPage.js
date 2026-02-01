import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Video, Play, X } from "lucide-react";
import { API } from "../config/api";

const PortfolioPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "all", category: "all" });
  const [selectedItem, setSelectedItem] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    const category = params.get("category");
    if (type) setFilter(f => ({ ...f, type }));
    if (category) setFilter(f => ({ ...f, category }));
  }, [location]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        let url = `${API}/portfolio`;
        const params = [];
        if (filter.category !== "all") params.push(`category=${filter.category}`);
        if (filter.type !== "all") params.push(`media_type=${filter.type}`);
        if (params.length) url += `?${params.join("&")}`;
        
        const res = await axios.get(url);
        setItems(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [filter]);

  const photos = items.filter(i => i.media_type === "photo");
  const videos = items.filter(i => i.media_type === "video");

  return (
    <div className="pt-20 min-h-screen" data-testid="portfolio-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-primary font-black text-4xl md:text-5xl tracking-tighter uppercase mb-4">
            <span className="text-gold-gradient">Portfolio</span>
          </h1>
          <p className="font-secondary text-white/60">Découvrez nos réalisations</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <div className="flex gap-2">
            {[
              { value: "all", label: "Tout" },
              { value: "photo", label: "Photos" },
              { value: "video", label: "Vidéos" }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(f => ({ ...f, type: opt.value }))}
                className={`px-6 py-2 text-sm font-primary transition-colors ${
                  filter.type === opt.value 
                    ? "bg-primary text-black" 
                    : "bg-card border border-white/20 text-white/70 hover:border-primary"
                }`}
                data-testid={`filter-type-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[
              { value: "all", label: "Tous" },
              { value: "wedding", label: "Mariages" },
              { value: "podcast", label: "Podcast" },
              { value: "tv_set", label: "Plateau TV" }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(f => ({ ...f, category: opt.value }))}
                className={`px-6 py-2 text-sm font-primary transition-colors ${
                  filter.category === opt.value 
                    ? "bg-primary text-black" 
                    : "bg-card border border-white/20 text-white/70 hover:border-primary"
                }`}
                data-testid={`filter-cat-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-white/60">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-white/60 py-20">Aucun élément trouvé</div>
        ) : (
          <>
            {/* Photos Section */}
            {(filter.type === "all" || filter.type === "photo") && photos.length > 0 && (
              <section className="mb-16">
                {filter.type === "all" && (
                  <h2 className="font-primary font-bold text-2xl mb-8 flex items-center gap-3">
                    <Image className="text-primary" size={24} /> Photos
                  </h2>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
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
            {(filter.type === "all" || filter.type === "video") && videos.length > 0 && (
              <section>
                {filter.type === "all" && (
                  <h2 className="font-primary font-bold text-2xl mb-8 flex items-center gap-3">
                    <Video className="text-primary" size={24} /> Vidéos
                  </h2>
                )}
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
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
            data-testid="portfolio-lightbox"
          >
            <button
              className="absolute top-6 right-6 text-white/70 hover:text-white"
              onClick={() => setSelectedItem(null)}
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
        )}
      </AnimatePresence>
    </div>
  );
};

export default PortfolioPage;
