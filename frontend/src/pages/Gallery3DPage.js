import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader, Move, Mouse, Maximize, Info, X } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

// Lazy load the 3D canvas to isolate it
const Gallery3DCanvas = lazy(() => import("../components/Gallery3DCanvas"));

export default function Gallery3DPage() {
  const { galleryId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await axios.get(`${API}/public/galleries/${galleryId}`);
        setGallery(res.data);
        
        const prepared = (res.data.photos || []).slice(0, 20).map((p, i) => ({
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

  const handlePhotoClick = useCallback((photo) => {
    setSelectedPhoto(photo);
  }, []);

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
    <div className="h-screen w-screen bg-black overflow-hidden">
      {/* Intro */}
      {showIntro && (
        <div className="absolute inset-0 z-20 bg-black/95 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-md text-center">
            <h1 className="text-3xl text-white font-bold mb-2">{gallery.name}</h1>
            <p className="text-primary mb-8">Galerie 3D Interactive</p>
            
            <div className="space-y-3 mb-8 text-left text-sm">
              <div className="flex items-center gap-3 bg-zinc-800 p-3 rounded">
                <Mouse className="text-primary" size={20} />
                <span className="text-white">Cliquer-glisser pour regarder</span>
              </div>
              <div className="flex items-center gap-3 bg-zinc-800 p-3 rounded">
                <Move className="text-primary" size={20} />
                <span className="text-white">ZQSD / Flèches pour se déplacer</span>
              </div>
              <div className="flex items-center gap-3 bg-zinc-800 p-3 rounded">
                <Maximize className="text-primary" size={20} />
                <span className="text-white">Cliquer sur une photo pour l'agrandir</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowIntro(false)}
              data-testid="enter-gallery-btn"
              className="w-full px-6 py-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90"
            >
              Entrer ({photos.length} photos)
            </button>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      {!showIntro && (
        <>
          <div className="absolute top-4 left-4 z-10 bg-black/60 rounded-lg p-3">
            <h2 className="text-white font-medium">{gallery.name}</h2>
            <p className="text-zinc-400 text-sm">{photos.length} photos</p>
          </div>
          
          <button
            onClick={() => setShowIntro(true)}
            className="absolute top-4 right-4 z-10 bg-black/60 rounded-lg p-3 text-white hover:bg-black/80"
          >
            <Info size={20} />
          </button>
          
          <div className="absolute bottom-4 left-4 z-10 bg-black/60 rounded-lg p-3 text-zinc-300 text-sm">
            <span className="text-primary">ZQSD</span> Déplacer • <span className="text-primary">Souris</span> Regarder
          </div>
        </>
      )}

      {/* 3D Canvas - loaded lazily */}
      <Suspense fallback={
        <div className="h-full w-full flex items-center justify-center bg-black">
          <Loader className="animate-spin text-primary" size={48} />
        </div>
      }>
        <Gallery3DCanvas 
          photos={photos} 
          onPhotoClick={handlePhotoClick}
          enabled={!showIntro && !selectedPhoto}
        />
      </Suspense>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="absolute inset-0 z-30 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img
              src={selectedPhoto.fullUrl}
              alt={selectedPhoto.title}
              className="max-w-full max-h-[85vh] rounded-lg"
            />
            <p className="text-white text-center mt-4">{selectedPhoto.title}</p>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-2 -right-2 bg-zinc-700 hover:bg-zinc-600 rounded-full p-2"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
