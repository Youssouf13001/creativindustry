import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Camera, Play, Share2, Download, Loader, Box } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";
import GallerySlideshowModal from "../components/GallerySlideshowModal";

const SharedGalleryPage = () => {
  const { galleryId } = useParams();
  const [gallery, setGallery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await axios.get(`${API}/public/galleries/${galleryId}`);
        setGallery(res.data);
      } catch (err) {
        setError("Cette galerie n'existe pas ou n'est plus disponible.");
      }
      setLoading(false);
    };

    if (galleryId) {
      fetchGallery();
    }
  }, [galleryId]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: gallery?.name || "Galerie CREATIVINDUSTRY",
        text: `Découvrez cette galerie photo : ${gallery?.name}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié !");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-primary mx-auto mb-4" size={48} />
          <p className="text-white/60">Chargement de la galerie...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Camera className="text-white/30 mx-auto mb-4" size={64} />
          <h1 className="font-primary font-bold text-2xl text-white mb-2">Galerie introuvable</h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  const photos = gallery?.photos || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-primary text-sm font-medium mb-1">CREATIVINDUSTRY</p>
              <h1 className="font-primary font-bold text-2xl sm:text-3xl text-white">
                {gallery?.name}
              </h1>
              {gallery?.description && (
                <p className="text-white/60 mt-1">{gallery.description}</p>
              )}
              <p className="text-white/40 text-sm mt-2">{photos.length} photos</p>
            </div>
            <div className="flex gap-2">
              {photos.length > 0 && (
                <button
                  onClick={() => setShowSlideshow(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-black font-bold px-6 py-3 rounded transition-colors"
                  data-testid="start-slideshow-btn"
                >
                  <Play size={20} /> Diaporama
                </button>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded transition-colors"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id || index}
                className="aspect-square bg-black/50 overflow-hidden cursor-pointer group relative"
                onClick={() => {
                  setSelectedPhoto(index);
                  setShowSlideshow(true);
                }}
              >
                <img
                  src={`${BACKEND_URL}${photo.url}`}
                  alt={photo.filename || `Photo ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Play className="text-white" size={32} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Camera className="text-white/30 mx-auto mb-4" size={64} />
            <p className="text-white/60">Cette galerie est vide</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-card border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">
            Galerie partagée via CREATIVINDUSTRY
          </p>
        </div>
      </div>

      {/* Slideshow Modal */}
      <GallerySlideshowModal
        isOpen={showSlideshow}
        onClose={() => {
          setShowSlideshow(false);
          setSelectedPhoto(null);
        }}
        photos={photos.map(photo => ({
          ...photo,
          url: `${BACKEND_URL}${photo.url}`
        }))}
        galleryName={gallery?.name || "Galerie"}
        shareUrl={window.location.href}
        musicUrl={gallery?.music_url ? `${BACKEND_URL}${gallery.music_url}` : null}
      />
    </div>
  );
};

export default SharedGalleryPage;
