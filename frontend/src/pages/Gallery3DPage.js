import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader, Move, Mouse, Maximize, Info, X, ChevronLeft, ChevronRight, ZoomIn, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

export default function Gallery3DPage() {
  const { galleryId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [viewMode, setViewMode] = useState('carousel'); // 'carousel' or 'grid'
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await axios.get(`${API}/public/galleries/${galleryId}`);
        setGallery(res.data);
        
        const prepared = (res.data.photos || []).slice(0, 30).map((p, i) => ({
          ...p,
          id: p.id || `photo-${i}`,
          fullUrl: `${API}/public/galleries/${galleryId}/image/${p.id}`,
          title: p.title || p.filename || `Photo ${i + 1}`
        }));
        
        setPhotos(prepared);
      } catch (e) {
        console.error(e);
        toast.error("Galerie non trouvée");
      } finally {
        setLoading(false);
      }
    };
    
    fetchGallery();
  }, [galleryId]);

  useEffect(() => {
    if (showIntro || viewMode !== 'carousel') return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'q') {
        setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setCurrentIndex(prev => (prev + 1) % photos.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (photos[currentIndex]) {
          setSelectedPhoto(photos[currentIndex]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIntro, photos, currentIndex, viewMode]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % photos.length);
  }, [photos.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <X className="mx-auto mb-4 text-red-500" size={64} />
          <h1 className="text-2xl mb-4">Galerie introuvable</h1>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-black rounded">
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 overflow-hidden">
      {/* Intro */}
      {showIntro && (
        <div className="absolute inset-0 z-20 bg-black/95 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-md text-center">
            <h1 className="text-3xl text-white font-bold mb-2">{gallery.name}</h1>
            <p className="text-primary mb-8">Galerie Interactive</p>
            
            <div className="space-y-3 mb-8 text-left text-sm">
              <div className="flex items-center gap-3 bg-zinc-800 p-3 rounded">
                <ChevronLeft className="text-primary" size={20} />
                <ChevronRight className="text-primary" size={20} />
                <span className="text-white">Flèches / AD pour naviguer</span>
              </div>
              <div className="flex items-center gap-3 bg-zinc-800 p-3 rounded">
                <ZoomIn className="text-primary" size={20} />
                <span className="text-white">Cliquer pour agrandir</span>
              </div>
              <div className="flex items-center gap-3 bg-zinc-800 p-3 rounded">
                <RotateCcw className="text-primary" size={20} />
                <span className="text-white">Mode grille disponible</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowIntro(false)}
              data-testid="enter-gallery-btn"
              className="w-full px-6 py-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-all"
            >
              Découvrir ({photos.length} photos)
            </button>
          </div>
        </div>
      )}

      {/* Main Gallery View */}
      {!showIntro && (
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-sm">
            <div>
              <h2 className="text-white font-medium">{gallery.name}</h2>
              <p className="text-zinc-400 text-sm">{currentIndex + 1} / {photos.length}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'carousel' ? 'grid' : 'carousel')}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
              >
                {viewMode === 'carousel' ? 'Vue Grille' : 'Vue Carrousel'}
              </button>
              <button
                onClick={() => setShowIntro(true)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                <Info size={20} />
              </button>
            </div>
          </div>

          {/* Carousel View */}
          {viewMode === 'carousel' && (
            <div className="flex-1 relative overflow-hidden" ref={containerRef}>
              {/* 3D Perspective Container */}
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ perspective: '1500px' }}
              >
                {/* Navigation Buttons */}
                <button
                  onClick={goToPrev}
                  className="absolute left-4 z-10 p-4 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all hover:scale-110"
                >
                  <ChevronLeft size={32} />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 z-10 p-4 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all hover:scale-110"
                >
                  <ChevronRight size={32} />
                </button>

                {/* Photos Carousel */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {photos.map((photo, index) => {
                    const offset = index - currentIndex;
                    const absOffset = Math.abs(offset);
                    const visible = absOffset <= 3;
                    
                    if (!visible) return null;
                    
                    const translateX = offset * 250;
                    const translateZ = -absOffset * 150;
                    const rotateY = offset * -15;
                    const scale = 1 - absOffset * 0.15;
                    const opacity = 1 - absOffset * 0.3;
                    
                    return (
                      <div
                        key={photo.id}
                        className="absolute transition-all duration-500 ease-out cursor-pointer"
                        style={{
                          transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                          opacity,
                          zIndex: 10 - absOffset,
                        }}
                        onClick={() => {
                          if (offset === 0) {
                            setSelectedPhoto(photo);
                          } else {
                            setCurrentIndex(index);
                          }
                        }}
                      >
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                          <img
                            src={photo.fullUrl}
                            alt={photo.title}
                            className="max-h-[60vh] max-w-[60vw] object-contain rounded-lg shadow-2xl border border-white/10"
                            loading="lazy"
                          />
                          {offset === 0 && (
                            <div className="absolute bottom-4 left-4 right-4 text-center">
                              <p className="text-white text-lg font-medium drop-shadow-lg">{photo.title}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dots Navigation */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
                {photos.slice(0, Math.min(10, photos.length)).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentIndex ? 'bg-primary w-6' : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
                {photos.length > 10 && (
                  <span className="text-white/50 text-sm ml-2">+{photos.length - 10}</span>
                )}
              </div>
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square overflow-hidden rounded-lg cursor-pointer bg-zinc-900"
                    onClick={() => {
                      setCurrentIndex(index);
                      setSelectedPhoto(photo);
                    }}
                  >
                    <img
                      src={photo.fullUrl}
                      alt={photo.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-sm truncate">{photo.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="p-4 bg-black/50 backdrop-blur-sm text-center">
            <p className="text-zinc-400 text-sm">
              <span className="text-primary">←/→</span> Naviguer • 
              <span className="text-primary ml-2">Entrée</span> Agrandir
            </p>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={selectedPhoto.fullUrl}
              alt={selectedPhoto.title}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
              <p className="text-white text-lg text-center">{selectedPhoto.title}</p>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-3 -right-3 bg-zinc-700 hover:bg-zinc-600 rounded-full p-2 transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
            
            {/* Navigation in Modal */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = (currentIndex - 1 + photos.length) % photos.length;
                setCurrentIndex(newIndex);
                setSelectedPhoto(photos[newIndex]);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newIndex = (currentIndex + 1) % photos.length;
                setCurrentIndex(newIndex);
                setSelectedPhoto(photos[newIndex]);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
