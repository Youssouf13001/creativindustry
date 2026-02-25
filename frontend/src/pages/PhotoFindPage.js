import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Camera, Search, ShoppingCart, Check, X, Loader, Image, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";

const PhotoFindPage = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ name: "", email: "" });
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("user");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    fetchEvent();
    // Cleanup camera on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const res = await axios.get(`${API}/public/photofind/${eventId}`);
      setEvent(res.data);
    } catch (e) {
      toast.error("Événement non trouvé ou inactif");
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Votre navigateur ne supporte pas l'accès à la caméra. Utilisez 'Importer une photo' à la place.");
      toast.error("Caméra non supportée sur ce navigateur");
      return;
    }

    // Check if we're on HTTPS (required for camera access on mobile)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setCameraError("La caméra nécessite une connexion sécurisée (HTTPS).");
      toast.error("HTTPS requis pour la caméra");
      return;
    }

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Important for iOS
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setCameraActive(true);
          }).catch(err => {
            console.error("Error playing video:", err);
            setCameraError("Erreur lors du démarrage de la vidéo");
          });
        };
      }
    } catch (e) {
      console.error("Camera error:", e);
      let errorMessage = "Impossible d'accéder à la caméra.";
      
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        errorMessage = "Accès à la caméra refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.";
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        errorMessage = "Aucune caméra trouvée sur cet appareil.";
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        errorMessage = "La caméra est utilisée par une autre application.";
      } else if (e.name === 'OverconstrainedError') {
        errorMessage = "Configuration caméra non supportée.";
      }
      
      setCameraError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const switchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraError(null);
  };

  const captureAndSearch = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Set canvas size to video size
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Draw the video frame to canvas
    const ctx = canvas.getContext("2d");
    
    // Mirror the image if using front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        stopCamera();
        await searchWithImage(blob);
      } else {
        toast.error("Erreur lors de la capture");
      }
    }, "image/jpeg", 0.9);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await searchWithImage(file);
    }
  };

  const searchWithImage = async (imageBlob) => {
    setSearching(true);
    setResults(null);
    
    const formData = new FormData();
    formData.append("file", imageBlob, "selfie.jpg");
    
    try {
      const res = await axios.post(`${API}/public/photofind/${eventId}/search`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResults(res.data);
      if (res.data.matches_found === 0) {
        toast.info("Aucune photo correspondante trouvée. Essayez avec un autre angle.");
      } else {
        toast.success(`${res.data.matches_found} photo(s) trouvée(s) !`);
      }
    } catch (e) {
      const msg = e.response?.data?.detail || "Erreur lors de la recherche";
      toast.error(msg);
    } finally {
      setSearching(false);
    }
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const selectAllPhotos = () => {
    if (results?.photos) {
      setSelectedPhotos(results.photos.map(p => p.id));
    }
  };

  const calculatePrice = () => {
    const count = selectedPhotos.length;
    if (!results?.prices) return 0;
    if (count >= 10) return results.prices.pack_10;
    if (count >= 5) return results.prices.pack_5;
    return count * results.prices.per_photo;
  };

  const handlePurchase = async () => {
    if (!purchaseForm.name || !purchaseForm.email) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    
    const formData = new FormData();
    selectedPhotos.forEach(id => formData.append("photo_ids", id));
    formData.append("name", purchaseForm.name);
    formData.append("email", purchaseForm.email);
    
    try {
      const res = await axios.post(`${API}/public/photofind/${eventId}/purchase`, formData);
      toast.success(res.data.message);
      window.open(res.data.paypal_link, "_blank");
      setShowPurchase(false);
    } catch (e) {
      toast.error("Erreur lors de la commande");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <X className="mx-auto text-red-500 mb-4" size={64} />
          <h1 className="text-2xl font-primary text-white">Événement non trouvé</h1>
          <p className="text-white/60 mt-2">Cet événement n'existe pas ou n'est plus actif.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-transparent py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-primary text-3xl md:text-4xl text-white mb-2">
            {event.name}
          </h1>
          <p className="text-white/60">{event.description}</p>
          <p className="text-primary mt-2">{event.event_date}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Section */}
        {!results && (
          <div className="bg-card border border-white/10 rounded-xl p-8 text-center">
            <Camera className="mx-auto text-primary mb-4" size={64} />
            <h2 className="font-primary text-2xl text-white mb-4">
              Retrouvez vos photos !
            </h2>
            <p className="text-white/60 mb-8">
              Prenez un selfie ou importez une photo pour retrouver toutes les photos où vous apparaissez.
            </p>

            {/* Camera View */}
            {cameraActive && (
              <div className="mb-6">
                <div className="relative inline-block">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline
                    muted
                    className="mx-auto rounded-lg max-w-full max-h-[400px]"
                    style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                  />
                  {/* Switch camera button */}
                  <button
                    onClick={switchCamera}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                    title="Changer de caméra"
                  >
                    <RefreshCw size={20} />
                  </button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="mt-4 flex gap-4 justify-center flex-wrap">
                  <button
                    onClick={captureAndSearch}
                    className="px-6 py-3 bg-primary text-black font-bold rounded-lg flex items-center gap-2"
                  >
                    <Camera size={20} /> Capturer et rechercher
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-6 py-3 bg-white/10 text-white rounded-lg"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Camera Error Message */}
            {cameraError && !cameraActive && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-center">
                <p className="text-red-400 mb-2">{cameraError}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary text-black font-bold rounded-lg text-sm"
                >
                  Importer une photo à la place
                </button>
              </div>
            )}

            {/* Action Buttons */}
            {!cameraActive && !searching && (
              <div className="flex flex-col gap-4">
                {/* Selfie button - uses native camera on mobile */}
                <label 
                  htmlFor="selfie-input"
                  className="px-8 py-4 bg-primary text-black font-bold rounded-lg flex items-center justify-center gap-2 text-lg cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <Camera size={24} /> Prendre un selfie
                </label>
                <input
                  id="selfie-input"
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                
                {/* Import from gallery */}
                <label 
                  htmlFor="gallery-input"
                  className="px-8 py-4 bg-white/10 text-white rounded-lg flex items-center justify-center gap-2 text-lg cursor-pointer hover:bg-white/20 transition-colors"
                >
                  <Image size={24} /> Importer depuis la galerie
                </label>
                <input
                  id="gallery-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {/* Searching */}
            {searching && (
              <div className="flex flex-col items-center gap-4">
                <Loader className="animate-spin text-primary" size={48} />
                <p className="text-white/60">Recherche en cours...</p>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-primary text-2xl text-white">
                  {results.matches_found} photo(s) trouvée(s)
                </h2>
                <p className="text-white/60">Sélectionnez les photos que vous souhaitez acheter</p>
              </div>
              <button
                onClick={() => { setResults(null); setSelectedPhotos([]); }}
                className="px-4 py-2 bg-white/10 text-white rounded-lg"
              >
                Nouvelle recherche
              </button>
            </div>

            {/* Photo Grid */}
            {results.photos.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                  {results.photos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => togglePhotoSelection(photo.id)}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedPhotos.includes(photo.id)
                          ? "border-primary shadow-lg shadow-primary/20"
                          : "border-transparent hover:border-white/20"
                      }`}
                    >
                      <img
                        src={`${BACKEND_URL}${photo.url}`}
                        alt="Photo"
                        className="w-full aspect-square object-cover"
                      />
                      {selectedPhotos.includes(photo.id) && (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Check size={20} className="text-black" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white/80">
                          Correspondance: {Math.round(photo.similarity)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selection Actions */}
                <div className="flex items-center justify-between bg-card border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={selectAllPhotos}
                      className="text-primary hover:underline"
                    >
                      Tout sélectionner
                    </button>
                    <span className="text-white/60">
                      {selectedPhotos.length} photo(s) sélectionnée(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-primary text-2xl text-primary">
                      {calculatePrice()}€
                    </span>
                    <button
                      onClick={() => setShowPurchase(true)}
                      disabled={selectedPhotos.length === 0}
                      className="px-6 py-3 bg-primary text-black font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart size={20} /> Commander
                    </button>
                  </div>
                </div>

                {/* Pricing Info */}
                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-card/50 p-4 rounded-lg">
                    <p className="text-white/60 text-sm">À l'unité</p>
                    <p className="font-primary text-xl text-white">{results.prices.per_photo}€</p>
                  </div>
                  <div className="bg-card/50 p-4 rounded-lg">
                    <p className="text-white/60 text-sm">Pack 5 photos</p>
                    <p className="font-primary text-xl text-primary">{results.prices.pack_5}€</p>
                  </div>
                  <div className="bg-card/50 p-4 rounded-lg">
                    <p className="text-white/60 text-sm">Pack 10 photos</p>
                    <p className="font-primary text-xl text-green-500">{results.prices.pack_10}€</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <X className="mx-auto text-white/40 mb-4" size={64} />
                <p className="text-white/60">Aucune photo correspondante trouvée.</p>
                <p className="text-white/40 text-sm mt-2">Essayez avec un selfie plus net ou un autre angle.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {showPurchase && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h3 className="font-primary text-xl text-white mb-4">Finaliser la commande</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/60 text-sm mb-1">Votre nom</label>
                <input
                  type="text"
                  value={purchaseForm.name}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-white/20 rounded-lg text-white"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">Votre email</label>
                <input
                  type="email"
                  value={purchaseForm.email}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-white/20 rounded-lg text-white"
                  placeholder="jean@example.com"
                />
              </div>
            </div>
            
            <div className="bg-background/50 p-4 rounded-lg mb-6">
              <div className="flex justify-between text-white/60">
                <span>{selectedPhotos.length} photo(s)</span>
                <span className="font-primary text-xl text-primary">{calculatePrice()}€</span>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => setShowPurchase(false)}
                className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handlePurchase}
                className="flex-1 px-4 py-3 bg-primary text-black font-bold rounded-lg"
              >
                Payer avec PayPal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoFindPage;
