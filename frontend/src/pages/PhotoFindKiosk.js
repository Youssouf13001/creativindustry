import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Camera, Loader, Download, Printer, Mail, RefreshCw, X, Check, CreditCard, ArrowLeft, Maximize, Smartphone, QrCode, Image, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// Frame/Filter definitions
const PHOTO_FRAMES = [
  { id: "none", name: "Sans cadre", preview: null },
  { id: "wedding", name: "Mariage", color: "#D4AF37", border: "8px solid", decoration: "🌸 💍 🌸" },
  { id: "vintage", name: "Vintage", color: "#8B4513", border: "12px double", decoration: "✨" },
  { id: "polaroid", name: "Polaroid", color: "#FFFFFF", border: "15px solid", bottomPadding: 60 },
  { id: "party", name: "Fête", color: "#FF69B4", border: "6px dashed", decoration: "🎉 🎊 ⭐" },
  { id: "custom", name: "Personnalisé", color: "#1a1a2e", border: "10px solid", isCustom: true }
];

// Stripe Checkout Form Component
const StripeCheckoutForm = ({ onSuccess, onCancel, amount }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required"
    });

    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="bg-white rounded-xl p-6 mb-4">
        <PaymentElement />
      </div>
      
      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-white/10 hover:bg-white/20 px-6 py-4 rounded-xl"
          disabled={processing}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xl px-6 py-4 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing ? (
            <Loader className="animate-spin" size={24} />
          ) : (
            <>
              <CreditCard size={24} /> Payer {amount}€
            </>
          )}
        </button>
      </div>
    </form>
  );
};

const PhotoFindKiosk = () => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
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
  const [step, setStep] = useState("welcome"); // welcome, camera, results, frames, payment-choice, payment-paypal, payment-cash, email, printing, print-confirm, print-success, success
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Frame selection
  const [selectedFrame, setSelectedFrame] = useState("none");
  const [customFrames, setCustomFrames] = useState([]);
  
  // PayPal payment
  const [paypalOrderId, setPaypalOrderId] = useState(null);
  const [paypalQrCode, setPaypalQrCode] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const paymentCheckInterval = useRef(null);

  // Stripe payment
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [stripeOrderId, setStripeOrderId] = useState(null);

  // Pricing
  const [pricing, setPricing] = useState({
    single: 5,
    per_photo: 5,
    pack_5: 15,
    pack_10: 25,
    all: 35
  });

  // Check for PayPal return
  useEffect(() => {
    const paypalSuccess = searchParams.get("paypal_success");
    const orderId = searchParams.get("order_id");
    if (paypalSuccess === "true" && orderId) {
      handlePayPalSuccess(orderId);
    }
  }, [searchParams]);

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
        // Load custom frames if any
        if (res.data.custom_frames) {
          setCustomFrames(res.data.custom_frames);
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

  // Handle photo import from file
  const handlePhotoImport = async (file) => {
    setSearching(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file, "selfie.jpg");
      
      const res = await axios.post(
        `${API}/public/photofind/${eventId}/search`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      
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

  // Calculate print price (5€ per photo)
  const calculatePrintPrice = () => {
    return selectedPhotos.length * pricing.single;
  };

  // Go to frame selection after selecting photos
  const proceedToFrames = () => {
    if (selectedPhotos.length === 0) {
      toast.error("Sélectionnez au moins une photo");
      return;
    }
    setStep("frames");
  };

  // Go to payment choice after selecting frame
  const proceedToPayment = () => {
    setStep("payment-choice");
  };

  // Create PayPal order and get QR code
  const createPayPalOrder = async () => {
    setProcessing(true);
    try {
      const amount = calculatePrice();
      const res = await axios.post(`${API}/public/photofind/${eventId}/create-paypal-order`, {
        photo_ids: selectedPhotos,
        amount: amount,
        frame: selectedFrame,
        return_url: `${window.location.origin}/kiosk/${eventId}?paypal_success=true`
      });
      
      setPaypalOrderId(res.data.order_id);
      setPaypalQrCode(res.data.qr_code_url || res.data.approval_url);
      setStep("payment-paypal");
      
      // Start checking for payment confirmation
      startPaymentCheck(res.data.order_id);
    } catch (e) {
      toast.error("Erreur lors de la création du paiement");
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  // Start polling for PayPal payment confirmation
  const startPaymentCheck = (orderId) => {
    setCheckingPayment(true);
    paymentCheckInterval.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/public/photofind/${eventId}/check-payment/${orderId}`);
        if (res.data.status === "COMPLETED" || res.data.status === "APPROVED") {
          clearInterval(paymentCheckInterval.current);
          setCheckingPayment(false);
          handlePayPalSuccess(orderId);
        }
      } catch (e) {
        // Continue checking
      }
    }, 3000); // Check every 3 seconds
  };

  // Clean up payment check on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckInterval.current) {
        clearInterval(paymentCheckInterval.current);
      }
    };
  }, []);

  // Handle successful PayPal payment
  const handlePayPalSuccess = async (orderId) => {
    setProcessing(true);
    try {
      // Capture the payment
      const captureRes = await axios.post(`${API}/public/photofind/${eventId}/capture-paypal-order`, {
        order_id: orderId,
        photo_ids: selectedPhotos,
        frame: selectedFrame,
        email: email
      });
      
      if (captureRes.data.success) {
        toast.success("Paiement confirmé !");
        // Auto-print
        await autoPrintPhotos();
        setStep("print-success");
      } else {
        toast.error("Erreur de paiement");
        setStep("payment-choice");
      }
    } catch (e) {
      toast.error("Erreur lors de la confirmation du paiement");
      setStep("payment-choice");
    } finally {
      setProcessing(false);
    }
  };

  // Auto print after PayPal payment
  const autoPrintPhotos = async () => {
    try {
      const printWindow = window.open("", "_blank");
      const frame = PHOTO_FRAMES.find(f => f.id === selectedFrame) || PHOTO_FRAMES[0];
      
      let photosHtml = selectedPhotos.map(photoId => {
        const photo = matchedPhotos.find(p => p.id === photoId);
        if (!photo) return "";
        
        const frameStyle = frame.id !== "none" ? `
          border: ${frame.border} ${frame.color};
          padding: ${frame.id === "polaroid" ? "10px 10px 60px 10px" : "10px"};
          background: ${frame.id === "polaroid" ? "#fff" : "transparent"};
        ` : "";
        
        const decoration = frame.decoration ? `<div style="text-align: center; font-size: 24px; margin-top: 10px;">${frame.decoration}</div>` : "";
        
        return `
          <div style="page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: white;">
            <div style="${frameStyle}">
              <img src="${API}/public/photofind/${eventId}/photo/${photo.id}" 
                   style="max-width: 100%; max-height: 80vh; object-fit: contain;" 
                   crossorigin="anonymous" />
            </div>
            ${decoration}
            ${frame.id === "polaroid" ? `<div style="font-family: 'Comic Sans MS', cursive; font-size: 18px; margin-top: -50px; text-align: center;">${event?.name || ''}</div>` : ''}
          </div>
        `;
      }).join("");
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Photos - ${event?.name || "PhotoFind"}</title>
          <style>
            @page { size: 4x6in; margin: 0; }
            body { margin: 0; padding: 0; background: white; }
          </style>
        </head>
        <body>
          ${photosHtml}
          <script>
            let loadedImages = 0;
            const images = document.querySelectorAll('img');
            const totalImages = images.length;
            
            images.forEach(img => {
              if (img.complete) {
                loadedImages++;
              } else {
                img.onload = function() {
                  loadedImages++;
                  if (loadedImages === totalImages) {
                    setTimeout(() => window.print(), 500);
                  }
                };
              }
            });
            
            if (loadedImages === totalImages) {
              setTimeout(() => window.print(), 500);
            }
          </script>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Log print job
      await axios.post(`${API}/public/photofind/${eventId}/log-print`, {
        photo_ids: selectedPhotos,
        count: selectedPhotos.length
      }).catch(() => {});
      
    } catch (e) {
      console.error("Print error:", e);
    }
  };

  // Handle cash payment (manual confirmation)
  const handleCashPayment = () => {
    setStep("payment-cash");
  };

  // Create Stripe payment intent
  const createStripePayment = async () => {
    setProcessing(true);
    try {
      const amount = calculatePrice();
      const res = await axios.post(`${API}/public/photofind/${eventId}/create-stripe-payment`, {
        photo_ids: selectedPhotos,
        amount: amount,
        frame: selectedFrame,
        email: email
      });
      
      setStripeClientSecret(res.data.client_secret);
      setStripeOrderId(res.data.order_id);
      setStep("payment-stripe");
    } catch (e) {
      toast.error("Erreur lors de la création du paiement");
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  // Handle successful Stripe payment
  const handleStripeSuccess = async (paymentIntentId) => {
    setProcessing(true);
    try {
      const res = await axios.post(`${API}/public/photofind/${eventId}/confirm-stripe-payment`, {
        order_id: stripeOrderId,
        payment_intent_id: paymentIntentId
      });
      
      if (res.data.success) {
        toast.success("Paiement CB confirmé !");
        await autoPrintPhotos();
        setStep("print-success");
      } else {
        toast.error("Erreur de confirmation");
        setStep("payment-choice");
      }
    } catch (e) {
      toast.error("Erreur lors de la confirmation");
      setStep("payment-choice");
    } finally {
      setProcessing(false);
    }
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

  // Legacy handlePrint - redirects to payment choice now
  const handlePrint = async () => {
    if (selectedPhotos.length === 0) {
      toast.error("Sélectionnez au moins une photo");
      return;
    }
    proceedToFrames();
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
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={captureSelfie}
                disabled={!cameraReady || capturing || searching}
                className="bg-primary hover:bg-primary/90 text-black font-bold text-2xl px-12 py-6 rounded-xl disabled:opacity-50 transition-all"
              >
                📷 Prendre la photo
              </button>
              
              {/* Fallback: Import photo from device */}
              <div className="text-center">
                <p className="text-white/40 text-sm mb-2">Ou importez une photo</p>
                <label 
                  htmlFor="kiosk-photo-input"
                  className="inline-block bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg cursor-pointer transition-colors"
                >
                  <Download size={20} className="inline mr-2" /> Importer
                </label>
                <input
                  id="kiosk-photo-input"
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      e.target.value = '';
                      handlePhotoImport(file);
                    }
                  }}
                />
              </div>
            </div>
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
                    onClick={proceedToFrames}
                    disabled={selectedPhotos.length === 0}
                    className="bg-primary hover:bg-primary/90 text-black font-bold text-xl px-8 py-4 rounded-xl disabled:opacity-50 flex items-center gap-3"
                  >
                    <Sparkles size={24} /> Continuer ({selectedPhotos.length} photos)
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

        {/* Step: Frame Selection */}
        {step === "frames" && (
          <div className="w-full max-w-4xl">
            <div className="text-center mb-8">
              <Image className="mx-auto text-primary mb-4" size={60} />
              <h2 className="text-3xl font-bold mb-2">Choisissez un style</h2>
              <p className="text-white/60">Sélectionnez un cadre pour vos photos (optionnel)</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[...PHOTO_FRAMES.filter(f => f.id !== "custom"), ...customFrames].map((frame) => (
                <div
                  key={frame.id}
                  onClick={() => setSelectedFrame(frame.id)}
                  className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                    selectedFrame === frame.id 
                      ? 'border-primary bg-primary/20' 
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  {/* Frame Preview */}
                  <div 
                    className="aspect-[3/4] mb-3 rounded-lg flex items-center justify-center overflow-hidden"
                    style={{
                      background: frame.id === "none" ? "#333" : "#fff",
                      border: frame.id !== "none" ? `${frame.border} ${frame.color}` : "2px solid #555"
                    }}
                  >
                    {frame.id === "none" ? (
                      <span className="text-white/50 text-sm">Sans cadre</span>
                    ) : (
                      <div className="text-center">
                        <div className="text-4xl mb-2">{frame.decoration || "📷"}</div>
                        <div className="text-xs text-gray-600">{frame.name}</div>
                      </div>
                    )}
                  </div>
                  <p className="text-center font-bold">{frame.name}</p>
                  {selectedFrame === frame.id && (
                    <div className="mt-2 flex justify-center">
                      <Check className="text-primary" size={24} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setStep("results")}
                className="bg-white/10 hover:bg-white/20 px-6 py-4 rounded-xl flex items-center gap-2"
              >
                <ArrowLeft size={20} /> Retour
              </button>
              
              <button
                onClick={proceedToPayment}
                className="bg-primary hover:bg-primary/90 text-black font-bold text-xl px-8 py-4 rounded-xl flex items-center gap-3"
              >
                Continuer <CreditCard size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Payment Choice */}
        {step === "payment-choice" && (
          <div className="w-full max-w-xl text-center">
            <CreditCard className="mx-auto text-primary mb-6" size={80} />
            <h2 className="text-3xl font-bold mb-2">Comment souhaitez-vous payer ?</h2>
            <p className="text-white/60 mb-4">{selectedPhotos.length} photo(s) sélectionnée(s)</p>
            
            <div className="bg-white/10 rounded-xl p-6 mb-8">
              <p className="text-white/60">Total à payer</p>
              <p className="text-5xl font-bold text-primary">{calculatePrice()}€</p>
              {selectedFrame !== "none" && (
                <p className="text-sm text-white/50 mt-2">Cadre : {PHOTO_FRAMES.find(f => f.id === selectedFrame)?.name}</p>
              )}
            </div>
            
            <div className="grid gap-4">
              {/* PayPal Option */}
              <button
                onClick={createPayPalOrder}
                disabled={processing}
                className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white font-bold text-xl px-8 py-5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {processing ? (
                  <Loader className="animate-spin" size={24} />
                ) : (
                  <>
                    <Smartphone size={24} />
                    Payer avec PayPal (sur mon téléphone)
                  </>
                )}
              </button>
              
              {/* Cash Option */}
              <button
                onClick={handleCashPayment}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xl px-8 py-5 rounded-xl flex items-center justify-center gap-3"
              >
                💶 Payer en liquide / CB au photographe
              </button>
              
              {/* Email Option */}
              <button
                onClick={() => setStep("email")}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-xl px-8 py-5 rounded-xl flex items-center justify-center gap-3"
              >
                <Mail size={24} />
                Recevoir par email (payer plus tard)
              </button>
            </div>
            
            <button
              onClick={() => setStep("frames")}
              className="mt-6 text-white/50 hover:text-white flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft size={16} /> Retour
            </button>
          </div>
        )}

        {/* Step: PayPal QR Code */}
        {step === "payment-paypal" && (
          <div className="w-full max-w-xl text-center">
            <div className="bg-white rounded-2xl p-8 mb-6">
              <h3 className="text-black text-xl font-bold mb-4">Scannez avec votre téléphone</h3>
              
              {paypalQrCode ? (
                <div className="mb-4">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paypalQrCode)}`}
                    alt="QR Code PayPal"
                    className="mx-auto"
                  />
                </div>
              ) : (
                <Loader className="animate-spin mx-auto text-[#0070ba] mb-4" size={60} />
              )}
              
              <p className="text-gray-600 text-sm">Ou cliquez sur le lien ci-dessous :</p>
              <a 
                href={paypalQrCode} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#0070ba] underline text-sm break-all"
              >
                Ouvrir PayPal
              </a>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <p className="text-white/60">Montant</p>
              <p className="text-4xl font-bold text-primary">{calculatePrice()}€</p>
            </div>
            
            {checkingPayment && (
              <div className="flex items-center justify-center gap-3 text-white/70 mb-4">
                <Loader className="animate-spin" size={20} />
                <span>En attente du paiement...</span>
              </div>
            )}
            
            <button
              onClick={() => {
                if (paymentCheckInterval.current) {
                  clearInterval(paymentCheckInterval.current);
                }
                setCheckingPayment(false);
                setStep("payment-choice");
              }}
              className="text-white/50 hover:text-white flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft size={16} /> Annuler
            </button>
          </div>
        )}

        {/* Step: Cash Payment (Manual) */}
        {step === "payment-cash" && (
          <div className="w-full max-w-xl text-center">
            <div className="text-6xl mb-6">💶</div>
            <h2 className="text-3xl font-bold mb-4">Paiement au photographe</h2>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
              <p className="text-yellow-400 text-xl mb-2">
                Montant à régler : <strong className="text-3xl">{calculatePrice()}€</strong>
              </p>
              <p className="text-white/70">
                Réglez en liquide ou par carte auprès du photographe
              </p>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <p className="text-sm text-white/60 mb-2">Résumé</p>
              <p>{selectedPhotos.length} photo(s)</p>
              {selectedFrame !== "none" && (
                <p className="text-sm text-white/50">Cadre : {PHOTO_FRAMES.find(f => f.id === selectedFrame)?.name}</p>
              )}
            </div>
            
            <p className="text-white/50 mb-6">
              Une fois le paiement effectué, cliquez sur le bouton ci-dessous :
            </p>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setStep("payment-choice")}
                className="bg-white/10 hover:bg-white/20 px-6 py-4 rounded-xl flex items-center gap-2"
              >
                <ArrowLeft size={20} /> Retour
              </button>
              
              <button
                onClick={async () => {
                  setProcessing(true);
                  // Log the purchase
                  try {
                    await axios.post(`${API}/public/photofind/${eventId}/kiosk-purchase`, {
                      photo_ids: selectedPhotos,
                      email: email || "kiosk@local",
                      amount: calculatePrice(),
                      payment_method: "cash",
                      frame: selectedFrame
                    });
                  } catch (e) {
                    console.error(e);
                  }
                  // Print
                  await autoPrintPhotos();
                  setProcessing(false);
                  setStep("print-success");
                }}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-xl px-8 py-4 rounded-xl disabled:opacity-50 flex items-center gap-3"
              >
                {processing ? (
                  <Loader className="animate-spin" size={24} />
                ) : (
                  <>
                    <Check size={24} /> Paiement reçu - Imprimer
                  </>
                )}
              </button>
            </div>
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
                onClick={() => setStep("payment-choice")}
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

        {/* Step: Print Confirmation */}
        {step === "print-confirm" && (
          <div className="text-center max-w-xl">
            <Printer className="mx-auto text-primary mb-6" size={80} />
            <h2 className="text-3xl font-bold mb-4">Confirmer l'impression</h2>
            
            <div className="bg-white/10 rounded-xl p-6 mb-8">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-white/60 text-sm">Photos</p>
                  <p className="text-2xl font-bold">{selectedPhotos.length}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Prix unitaire</p>
                  <p className="text-2xl font-bold">5€</p>
                </div>
              </div>
              <div className="border-t border-white/20 pt-4">
                <p className="text-white/60">Total à payer</p>
                <p className="text-5xl font-bold text-primary">{calculatePrintPrice()}€</p>
              </div>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8">
              <p className="text-yellow-400 text-lg">
                💳 Réglez auprès du photographe avant de confirmer
              </p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setStep("results")}
                className="bg-white/10 hover:bg-white/20 px-8 py-4 rounded-xl flex items-center gap-2"
              >
                <ArrowLeft size={20} /> Retour
              </button>
              
              <button
                onClick={confirmPrint}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-xl px-8 py-4 rounded-xl flex items-center gap-3"
              >
                <Printer size={24} /> Confirmer & Imprimer
              </button>
            </div>
          </div>
        )}

        {/* Step: Print Success */}
        {step === "print-success" && (
          <div className="text-center max-w-xl">
            <div className="bg-green-500/20 rounded-full p-8 inline-block mb-8">
              <Check className="text-green-500" size={100} />
            </div>
            <h2 className="text-4xl font-bold mb-4">Impression lancée !</h2>
            <p className="text-xl text-white/70 mb-8">
              Vos {selectedPhotos.length} photo(s) sont en cours d'impression.<br />
              <span className="text-primary font-bold">Récupérez-les auprès du photographe.</span>
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
