import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Camera, Loader, Download, Printer, Mail, RefreshCw, X, Check, CreditCard, ArrowLeft, Maximize } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

const PhotoFindKiosk = () => {
  const { eventId } = useParams();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [matchedPhotos, setMatchedPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [step, setStep] = useState("welcome"); // welcome, camera, results, payment, email, printing, success
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pricing
  const [pricing, setPricing] = useState({
    single: 5,
    per_photo: 5,
    pack_5: 15,
    pack_10: 25,
    all: 35
  });

  // Fetch event info
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axios.get(`${API}/public/photofind/${eventId}`);
        setEvent(res.data);
        if (res.data.pricing) {
          // Normalize pricing fields (handle both single and per_photo)
          const p = res.data.pricing;
          setPricing({
            single: p.single || p.per_photo || 5,
            per_photo: p.per_photo || p.single || 5,
            pack_5: p.pack_5 || 15,
            pack_10: p.pack_10 || 25,
            all: p.all || 35
          });
        }
      } catch (e) {
        toast.error("Événement non trouvé");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  // Initialize camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraReady(true);
      }
    } catch (e) {
      console.error("Camera error:", e);
      toast.error("Impossible d'accéder à la caméra");
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setCameraReady(false);
    }
  }, []);

  // Capture selfie
  const captureSelfie = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Mirror the image (selfie mode)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error("Erreur lors de la capture");
        setCapturing(false);
        return;
      }
      
      setSearching(true);
      setCapturing(false);
      
      // Search for matching photos
      try {
        const formData = new FormData();
        formData.append("file", blob, "selfie.jpg");
        
        const res = await axios.post(
          `${API}/public/photofind/${eventId}/search`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        
        // Handle response format from backend
        const photos = res.data.photos || res.data.matches || [];
        setMatchedPhotos(photos);
        setSelectedPhotos(photos.map(p => p.id) || []);
        stopCamera();
        setStep("results");
      } catch (e) {
        toast.error(e.response?.data?.detail || "Aucune correspondance trouvée");
      } finally {
        setSearching(false);
      }
    }, "image/jpeg", 0.9);
  };

  // Toggle photo selection
  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  // Calculate price
  const calculatePrice = () => {
    const count = selectedPhotos.length;
    if (count === 0) return 0;
    if (count >= matchedPhotos.length && matchedPhotos.length >= 5) return pricing.all;
    if (count >= 10) return pricing.pack_10;
    if (count >= 5) return pricing.pack_5;
    return count * pricing.single;
  };

  // Handle payment (simplified - manual confirmation for now)
  const handlePayment = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }
    
    setProcessing(true);
    
    try {
      // Create purchase record
      const res = await axios.post(`${API}/public/photofind/${eventId}/kiosk-purchase`, {
        photo_ids: selectedPhotos,
        email: email,
        amount: calculatePrice(),
        payment_method: "kiosk"
      });
      
      toast.success("Paiement enregistré !");
      setStep("success");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors du paiement");
    } finally {
      setProcessing(false);
    }
  };

  // Print photos
  const handlePrint = async () => {
    if (selectedPhotos.length === 0) {
      toast.error("Sélectionnez au moins une photo");
      return;
    }
    
    setStep("printing");
    setProcessing(true);
    
    try {
      // Open print window with selected photos
      const printWindow = window.open("", "_blank");
      
      let photosHtml = selectedPhotos.map(photoId => {
        const photo = matchedPhotos.find(p => p.id === photoId);
        if (!photo) return "";
        return `
          <div style="page-break-after: always; display: flex; align-items: center; justify-content: center; height: 100vh;">
            <img src="${API}/public/photofind/${eventId}/photo/${photo.id}" 
                 style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
        `;
      }).join("");
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Impression Photos - ${event?.name || "PhotoFind"}</title>
          <style>
            @page { size: 8x10in; margin: 0; }
            body { margin: 0; padding: 0; }
            img { display: block; }
          </style>
        </head>
        <body>
          ${photosHtml}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      toast.success("Impression lancée !");
      
      // Log print job
      await axios.post(`${API}/public/photofind/${eventId}/log-print`, {
        photo_ids: selectedPhotos,
        count: selectedPhotos.length
      }).catch(() => {});
      
    } catch (e) {
      toast.error("Erreur lors de l'impression");
    } finally {
      setProcessing(false);
      setStep("results");
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Reset to start
  const reset = () => {
    setMatchedPhotos([]);
    setSelectedPhotos([]);
    setEmail("");
    setStep("welcome");
    stopCamera();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="animate-spin text-primary" size={64} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <X className="mx-auto mb-4 text-red-500" size={64} />
          <h1 className="text-2xl mb-4">Événement non trouvé</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white overflow-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-2xl text-primary">{event.name}</h1>
          <p className="text-white/60 text-sm">Trouvez vos photos en un selfie !</p>
        </div>
        <div className="flex items-center gap-4">
          {step !== "welcome" && (
            <button
              onClick={reset}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded flex items-center gap-2"
            >
              <RefreshCw size={20} /> Recommencer
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="bg-white/10 hover:bg-white/20 p-2 rounded"
          >
            <Maximize size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 pb-8 px-8 min-h-screen flex items-center justify-center">
        
        {/* Step: Welcome */}
        {step === "welcome" && (
          <div className="text-center max-w-2xl mx-auto">
            <div className="mb-8">
              <Camera className="mx-auto text-primary mb-6" size={120} />
              <h2 className="text-5xl font-bold mb-4">Trouvez vos photos !</h2>
              <p className="text-xl text-white/70">
                Prenez un selfie et retrouvez instantanément toutes les photos où vous apparaissez.
              </p>
            </div>
            
            <button
              onClick={() => {
                setStep("camera");
                startCamera();
              }}
              className="bg-primary hover:bg-primary/90 text-black font-bold text-2xl px-12 py-6 rounded-xl transition-all transform hover:scale-105"
            >
              📸 Commencer
            </button>
            
            <div className="mt-12 grid grid-cols-3 gap-6 text-center">
              <div className="bg-white/5 p-6 rounded-xl">
                <p className="text-3xl font-bold text-primary">{pricing.single}€</p>
                <p className="text-white/60">par photo</p>
              </div>
              <div className="bg-white/5 p-6 rounded-xl border border-primary/50">
                <p className="text-3xl font-bold text-primary">{pricing.pack_5}€</p>
                <p className="text-white/60">pack 5 photos</p>
              </div>
              <div className="bg-primary/20 p-6 rounded-xl border-2 border-primary">
                <p className="text-3xl font-bold text-primary">{pricing.all}€</p>
                <p className="text-white/60">toutes vos photos</p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Camera */}
        {step === "camera" && (
          <div className="text-center w-full max-w-4xl">
            <h2 className="text-3xl font-bold mb-6">Placez votre visage dans le cadre</h2>
            
            <div className="relative bg-black rounded-2xl overflow-hidden mb-6 mx-auto" style={{ maxWidth: "800px" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full transform scale-x-[-1]"
                style={{ minHeight: "450px" }}
              />
              
              {/* Face guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-80 border-4 border-dashed border-primary/50 rounded-full" />
              </div>
              
              {(capturing || searching) && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="text-center">
                    <Loader className="animate-spin text-primary mx-auto mb-4" size={64} />
                    <p className="text-xl">
                      {capturing ? "Capture en cours..." : "Recherche de vos photos..."}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            
            <button
              onClick={captureSelfie}
              disabled={!cameraReady || capturing || searching}
              className="bg-primary hover:bg-primary/90 text-black font-bold text-2xl px-12 py-6 rounded-xl disabled:opacity-50 transition-all"
            >
              📷 Prendre la photo
            </button>
          </div>
        )}

        {/* Step: Results */}
        {step === "results" && (
          <div className="w-full max-w-6xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">
                {matchedPhotos.length > 0 
                  ? `🎉 ${matchedPhotos.length} photos trouvées !`
                  : "😕 Aucune photo trouvée"
                }
              </h2>
              <p className="text-white/60">
                {matchedPhotos.length > 0 
                  ? "Sélectionnez les photos que vous souhaitez obtenir"
                  : "Essayez avec une autre photo ou contactez le photographe"
                }
              </p>
            </div>
            
            {matchedPhotos.length > 0 && (
              <>
                {/* Photo Grid */}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8 max-h-[50vh] overflow-y-auto p-2">
                  {matchedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => togglePhotoSelection(photo.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                        selectedPhotos.includes(photo.id) 
                          ? 'ring-4 ring-primary scale-95' 
                          : 'hover:scale-105'
                      }`}
                    >
                      <img
                        src={`${API}/public/photofind/${eventId}/photo/${photo.id}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {selectedPhotos.includes(photo.id) && (
                        <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                          <Check size={20} className="text-black" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Selection Summary */}
                <div className="bg-white/10 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-white/60">Photos sélectionnées</p>
                    <p className="text-3xl font-bold">{selectedPhotos.length} / {matchedPhotos.length}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPhotos(matchedPhotos.map(p => p.id))}
                      className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      onClick={() => setSelectedPhotos([])}
                      className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded"
                    >
                      Désélectionner
                    </button>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-white/60">Total</p>
                    <p className="text-4xl font-bold text-primary">{calculatePrice()}€</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-4 mt-8">
                  <button
                    onClick={() => setStep("email")}
                    disabled={selectedPhotos.length === 0}
                    className="bg-primary hover:bg-primary/90 text-black font-bold text-xl px-8 py-4 rounded-xl disabled:opacity-50 flex items-center gap-3"
                  >
                    <Mail size={24} /> Recevoir par email
                  </button>
                  
                  <button
                    onClick={handlePrint}
                    disabled={selectedPhotos.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xl px-8 py-4 rounded-xl disabled:opacity-50 flex items-center gap-3"
                  >
                    <Printer size={24} /> Imprimer ({selectedPhotos.length * 5}€)
                  </button>
                </div>
              </>
            )}
            
            {matchedPhotos.length === 0 && (
              <div className="text-center">
                <button
                  onClick={() => {
                    setStep("camera");
                    startCamera();
                  }}
                  className="bg-primary hover:bg-primary/90 text-black font-bold text-xl px-8 py-4 rounded-xl"
                >
                  📸 Réessayer
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Email */}
        {step === "email" && (
          <div className="w-full max-w-xl text-center">
            <Mail className="mx-auto text-primary mb-6" size={80} />
            <h2 className="text-3xl font-bold mb-2">Entrez votre email</h2>
            <p className="text-white/60 mb-8">
              Vous recevrez un lien pour télécharger vos {selectedPhotos.length} photos
            </p>
            
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white text-2xl text-center px-6 py-4 rounded-xl mb-6 focus:border-primary focus:outline-none"
              autoFocus
            />
            
            <div className="bg-white/5 rounded-xl p-6 mb-8">
              <p className="text-white/60">Montant à payer</p>
              <p className="text-5xl font-bold text-primary">{calculatePrice()}€</p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setStep("results")}
                className="bg-white/10 hover:bg-white/20 px-6 py-4 rounded-xl flex items-center gap-2"
              >
                <ArrowLeft size={20} /> Retour
              </button>
              
              <button
                onClick={handlePayment}
                disabled={processing || !email}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-xl px-8 py-4 rounded-xl disabled:opacity-50 flex items-center gap-3"
              >
                {processing ? (
                  <Loader className="animate-spin" size={24} />
                ) : (
                  <CreditCard size={24} />
                )}
                Payer et recevoir
              </button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="text-center max-w-xl">
            <div className="bg-green-500/20 rounded-full p-8 inline-block mb-8">
              <Check className="text-green-500" size={100} />
            </div>
            <h2 className="text-4xl font-bold mb-4">Merci !</h2>
            <p className="text-xl text-white/70 mb-8">
              Vos photos ont été envoyées à<br />
              <span className="text-primary font-bold">{email}</span>
            </p>
            <p className="text-white/50 mb-8">
              Vérifiez votre boîte mail (et les spams) dans quelques minutes.
            </p>
            
            <button
              onClick={reset}
              className="bg-primary hover:bg-primary/90 text-black font-bold text-xl px-8 py-4 rounded-xl"
            >
              Nouvelle recherche
            </button>
          </div>
        )}

        {/* Step: Printing */}
        {step === "printing" && (
          <div className="text-center">
            <Loader className="animate-spin text-primary mx-auto mb-6" size={80} />
            <h2 className="text-3xl font-bold mb-4">Impression en cours...</h2>
            <p className="text-white/60">Vos photos arrivent sur l'imprimante</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoFindKiosk;
