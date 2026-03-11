/**
 * PhotoFind Mobile - Interface mobile pour commander depuis son téléphone
 * Le client scanne le QR code du kiosque et peut sélectionner/payer/faire imprimer à distance
 */

import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast, Toaster } from "sonner";
import { 
  Camera, Check, ArrowLeft, Loader, CreditCard, 
  MapPin, User, Printer, Mail,
  ChevronRight, X, Smartphone
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Initialize Stripe
let stripePromise = null;
const getStripe = () => {
  const key = process.env.REACT_APP_STRIPE_PUBLIC_KEY;
  if (key && !stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

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
      <div className="bg-white rounded-xl p-4 mb-4">
        <PaymentElement />
      </div>
      
      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl"
          disabled={processing}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing ? (
            <Loader className="animate-spin" size={20} />
          ) : (
            <>
              <CreditCard size={20} /> Payer {amount}€
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default function PhotoFindMobile() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  
  // Event data
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Photo selection
  const [photos, setPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selfieMode, setSelfieMode] = useState(false);
  const [selfieImage, setSelfieImage] = useState(null);
  const [searchingFace, setSearchingFace] = useState(false);
  
  // Steps: welcome, selfie, photos, delivery, payment, payment-stripe, processing, success
  const [step, setStep] = useState("welcome");
  
  // Delivery options
  const [deliveryMethod, setDeliveryMethod] = useState("print"); // print or email
  const [deliveryLocation, setDeliveryLocation] = useState("table"); // table, location, pickup
  const [tableNumber, setTableNumber] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [email, setEmail] = useState("");
  
  // Payment - separate loading states for each method
  const [processingStripe, setProcessingStripe] = useState(false);
  const [processingPaypal, setProcessingPaypal] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Stripe payment
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [stripeOrderId, setStripeOrderId] = useState(null);
  
  // PayPal payment
  const [paypalOrderId, setPaypalOrderId] = useState(null);
  
  // Video ref for selfie
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Check for PayPal return
  useEffect(() => {
    const paypalSuccess = searchParams.get("paypal_success");
    
    if (paypalSuccess === "true") {
      // Get stored data from localStorage
      const orderId = localStorage.getItem('pending_paypal_order');
      const storedPhotos = localStorage.getItem('pending_paypal_photos');
      const storedDelivery = localStorage.getItem('pending_paypal_delivery');
      
      if (orderId) {
        // Parse stored data
        let photos = [];
        let deliveryData = {};
        
        if (storedPhotos) {
          try {
            photos = JSON.parse(storedPhotos);
          } catch (e) {}
        }
        if (storedDelivery) {
          try {
            deliveryData = JSON.parse(storedDelivery);
          } catch (e) {}
        }
        
        // Clean up localStorage first
        localStorage.removeItem('pending_paypal_order');
        localStorage.removeItem('pending_paypal_photos');
        localStorage.removeItem('pending_paypal_delivery');
        
        // Process PayPal payment with stored data
        processPayPalReturn(orderId, photos, deliveryData);
      }
    }
  }, [searchParams]);
  
  // Process PayPal return with stored data
  const processPayPalReturn = async (orderId, photos, deliveryData) => {
    setProcessing(true);
    setStep("processing");
    
    try {
      // Calculate amount based on stored photos
      const amount = photos.length * (event?.price_per_photo || 3);
      
      // Capture the payment
      const captureRes = await axios.post(`${API}/public/photofind/${eventId}/capture-paypal-order`, {
        order_id: orderId,
        photo_ids: photos,
        email: deliveryData.email || "",
        amount: amount,
        format: "digital"
      });
      
      if (captureRes.data.success) {
        // Create the remote order
        const orderData = {
          photo_ids: photos,
          amount: amount,
          delivery_method: deliveryData.method || "print",
          delivery_info: deliveryData.info || { type: "pickup" },
          payment_method: "paypal",
          payment_id: orderId,
          email: deliveryData.email || null
        };
        
        await axios.post(`${API}/public/photofind/${eventId}/remote-print-order`, orderData);
        
        toast.success("Paiement PayPal confirmé !");
        setStep("success");
        setDeliveryMethod(deliveryData.method || "print");
      } else {
        toast.error("Erreur de paiement PayPal");
        setStep("welcome");
      }
    } catch (e) {
      console.error("PayPal capture error:", e);
      toast.error("Erreur lors de la confirmation PayPal");
      setStep("welcome");
    } finally {
      setProcessing(false);
    }
  };

  // Load event data
  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const res = await axios.get(`${API}/public/photofind/${eventId}`);
      setEvent(res.data);
      setLoading(false);
    } catch (e) {
      setError("Événement non trouvé");
      setLoading(false);
    }
  };

  // Load all photos (skip selfie)
  const loadAllPhotos = async () => {
    setSearchingFace(true);
    try {
      const res = await axios.get(`${API}/public/photofind/${eventId}/photos`);
      setPhotos(res.data.photos || []);
      setStep("photos");
    } catch (e) {
      toast.error("Erreur lors du chargement des photos");
    } finally {
      setSearchingFace(false);
    }
  };

  // Start camera for selfie - iOS Safari compatible
  const startCamera = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Votre navigateur ne supporte pas l'accès à la caméra");
        return;
      }
      
      // First, set selfieMode to true so the video element is rendered
      setSelfieMode(true);
      
      // Wait a tick for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Minimal constraints for maximum iOS compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false
      });
      
      streamRef.current = stream;
      
      // Get the video element after React has rendered it
      const video = videoRef.current;
      if (video) {
        // iOS Safari requires these to be set as properties
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        // Also set as attributes for older iOS versions
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        
        // Attach the stream
        video.srcObject = stream;
        
        // Force play with multiple attempts for iOS
        const tryPlay = async () => {
          try {
            await video.play();
            console.log("Video playing successfully");
          } catch (err) {
            console.error("Play attempt failed:", err);
          }
        };
        
        // Try to play immediately
        tryPlay();
        
        // Also try when metadata is loaded
        video.onloadedmetadata = () => {
          tryPlay();
        };
        
        // And try again after a short delay (iOS sometimes needs this)
        setTimeout(tryPlay, 300);
        setTimeout(tryPlay, 1000);
      }
    } catch (e) {
      console.error("Camera error:", e);
      setSelfieMode(false);
      if (e.name === 'NotAllowedError') {
        toast.error("Accès à la caméra refusé. Autorisez l'accès dans les paramètres.");
      } else if (e.name === 'NotFoundError') {
        toast.error("Aucune caméra trouvée sur cet appareil");
      } else {
        toast.error("Impossible d'accéder à la caméra: " + e.message);
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setSelfieMode(false);
  };

  // Capture selfie
  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error("Caméra non prête");
      return;
    }
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Set canvas size to video size
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setSelfieImage(imageData);
    
    // Stop camera
    stopCamera();
    
    // Search for matching photos
    searchByFace(imageData);
  };

  // Search photos by face
  const searchByFace = async (imageData) => {
    if (!imageData) {
      toast.error("Aucune image capturée");
      setStep("welcome");
      return;
    }
    
    setSearchingFace(true);
    try {
      // Convert base64 to blob
      const base64Data = imageData.split(',')[1];
      if (!base64Data) {
        throw new Error("Image invalide");
      }
      
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      // Create FormData and send as file
      const formData = new FormData();
      formData.append('file', blob, 'selfie.jpg');
      
      const res = await axios.post(`${API}/public/photofind/${eventId}/search`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });
      
      setPhotos(res.data.photos || []);
      if (res.data.photos && res.data.photos.length > 0) {
        setStep("photos");
        toast.success(`${res.data.photos.length} photo(s) trouvée(s) !`);
      } else {
        toast.info("Aucune photo trouvée avec votre visage");
        setStep("welcome");
      }
    } catch (e) {
      console.error("Search error:", e);
      if (e.response?.status === 500) {
        toast.error("Service de reconnaissance faciale indisponible");
      } else {
        toast.error("Erreur lors de la recherche");
      }
      setStep("welcome");
    } finally {
      setSearchingFace(false);
    }
  };

  // Toggle photo selection
  const togglePhoto = (photoId) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  // Calculate price
  const calculatePrice = () => {
    if (!event) return 0;
    const count = selectedPhotos.length;
    if (count >= 10 && event.price_pack_10) {
      return event.price_pack_10;
    }
    return count * (event.price_per_photo || 3);
  };

  // Get delivery info for order
  const getDeliveryInfo = () => {
    if (deliveryMethod === "email") {
      return { type: "email", email };
    }
    
    switch (deliveryLocation) {
      case "table":
        return { type: "table", table_number: tableNumber };
      case "location":
        return { type: "location", description: locationDescription };
      case "pickup":
        return { type: "pickup", description: "Récupération auprès du photographe" };
      default:
        return { type: "unknown" };
    }
  };

  // Create remote print order
  const createRemotePrintOrder = async (paymentInfo) => {
    const orderData = {
      photo_ids: selectedPhotos,
      amount: calculatePrice(),
      delivery_method: deliveryMethod,
      delivery_info: getDeliveryInfo(),
      payment_method: paymentInfo.method,
      payment_id: paymentInfo.payment_id || null,
      email: email || null
    };
    
    const res = await axios.post(`${API}/public/photofind/${eventId}/remote-print-order`, orderData);
    return res.data;
  };

  // Create Stripe payment intent
  const createStripePayment = async () => {
    setProcessingStripe(true);
    try {
      const amount = calculatePrice();
      const res = await axios.post(`${API}/public/photofind/${eventId}/create-stripe-payment`, {
        photo_ids: selectedPhotos,
        amount: amount,
        format: "digital",
        email: email || ""
      });
      
      setStripeClientSecret(res.data.client_secret);
      setStripeOrderId(res.data.payment_intent_id);
      setStep("payment-stripe");
    } catch (e) {
      toast.error("Erreur lors de la création du paiement");
      console.error(e);
    } finally {
      setProcessingStripe(false);
    }
  };

  // Handle successful Stripe payment
  const handleStripeSuccess = async (paymentIntentId) => {
    setProcessing(true);
    try {
      // Create the remote order with Stripe payment info
      await createRemotePrintOrder({
        method: "stripe",
        payment_id: paymentIntentId
      });
      
      toast.success("Paiement confirmé !");
      setStep("success");
    } catch (e) {
      toast.error("Erreur lors de la confirmation");
    } finally {
      setProcessing(false);
    }
  };

  // Create PayPal order and redirect directly
  const createPayPalOrder = async () => {
    setProcessingPaypal(true);
    try {
      const amount = calculatePrice();
      const res = await axios.post(`${API}/public/photofind/${eventId}/create-paypal-order`, {
        photo_ids: selectedPhotos,
        amount: amount,
        email: email || "",
        format: "digital",
        return_url: `${window.location.origin}/kiosk-mobile/${eventId}?paypal_success=true`
      });
      
      const orderId = res.data.order_id;
      // Try to get approval_url from response, or construct it from order_id
      let approvalUrl = res.data.approval_url;
      
      // Fallback: construct PayPal URL if not provided by backend
      if (!approvalUrl && orderId) {
        approvalUrl = `https://www.paypal.com/checkoutnow?token=${orderId}`;
      }
      
      setPaypalOrderId(orderId);
      
      if (approvalUrl) {
        // Store order ID in localStorage for when user returns
        localStorage.setItem('pending_paypal_order', orderId);
        localStorage.setItem('pending_paypal_photos', JSON.stringify(selectedPhotos));
        localStorage.setItem('pending_paypal_delivery', JSON.stringify({
          method: deliveryMethod,
          info: getDeliveryInfo(),
          email: email
        }));
        
        // Redirect directly to PayPal
        window.location.href = approvalUrl;
      } else {
        toast.error("Impossible d'ouvrir PayPal - ID manquant");
        setProcessingPaypal(false);
      }
    } catch (e) {
      toast.error("Erreur lors de la création du paiement PayPal");
      console.error(e);
      setProcessingPaypal(false);
    }
  };

  // Handle successful PayPal payment
  const handlePayPalSuccess = async (orderId) => {
    setProcessing(true);
    setStep("processing"); // Show processing state
    try {
      // Capture the payment
      const captureRes = await axios.post(`${API}/public/photofind/${eventId}/capture-paypal-order`, {
        order_id: orderId,
        photo_ids: selectedPhotos,
        email: email || "",
        amount: calculatePrice(),
        format: "digital"
      });
      
      if (captureRes.data.success) {
        // Create the remote order
        await createRemotePrintOrder({
          method: "paypal",
          payment_id: orderId
        });
        
        toast.success("Paiement PayPal confirmé !");
        setStep("success");
      } else {
        toast.error("Erreur de paiement PayPal");
        setStep("welcome");
      }
    } catch (e) {
      console.error("PayPal capture error:", e);
      toast.error("Erreur lors de la confirmation PayPal");
      setStep("welcome");
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center text-white">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">{error}</h1>
          <p className="text-white/60">Vérifiez le QR code et réessayez</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-sm sticky top-0 z-50 p-4 border-b border-white/10">
        <h1 className="text-primary font-bold text-lg">{event?.name}</h1>
        <p className="text-white/60 text-sm">Commandez vos photos</p>
      </div>

      <div className="p-4 pb-24">
        
        {/* Step: Welcome */}
        {step === "welcome" && (
          <div className="text-center py-8">
            <div className="text-6xl mb-6">📸</div>
            <h2 className="text-2xl font-bold mb-4">Bienvenue !</h2>
            <p className="text-white/70 mb-8">
              Prenez un selfie pour retrouver vos photos
            </p>
            <button
              onClick={() => {
                setStep("selfie");
                startCamera();
              }}
              className="bg-primary text-black font-bold px-8 py-4 rounded-xl text-lg"
            >
              <Camera className="inline mr-2" size={24} />
              Prendre un selfie
            </button>
          </div>
        )}

        {/* Step: Selfie */}
        {step === "selfie" && (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Prenez un selfie</h2>
            
            {selfieMode ? (
              <div className="relative flex flex-col items-center">
                <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ width: '300px', height: '400px' }}>
                  <video 
                    ref={videoRef} 
                    autoPlay
                    playsInline
                    muted
                    webkit-playsinline="true"
                    x-webkit-airplay="allow"
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      transform: 'scaleX(-1)',
                      background: '#1a1a1a',
                      display: 'block'
                    }}
                  />
                  {/* Face guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-40 border-2 border-dashed border-primary/50 rounded-full" />
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <button
                  onClick={captureSelfie}
                  className="mt-4 bg-primary text-black font-bold px-8 py-4 rounded-full"
                >
                  📷 Capturer
                </button>
                <button
                  onClick={() => {
                    stopCamera();
                    setStep("welcome");
                  }}
                  className="mt-2 text-white/50 text-sm"
                >
                  Annuler
                </button>
              </div>
            ) : searchingFace ? (
              <div className="py-12">
                <Loader className="animate-spin mx-auto mb-4" size={48} />
                <p className="text-white/70">Recherche de vos photos...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-white/60 mb-4">Autorisez l'accès à la caméra pour prendre un selfie</p>
                <button
                  onClick={startCamera}
                  className="bg-primary text-black font-bold px-8 py-4 rounded-xl"
                >
                  <Camera className="inline mr-2" size={20} />
                  Activer la caméra
                </button>
              </div>
            )}
            
            <button
              onClick={() => setStep("welcome")}
              className="mt-6 text-white/50"
            >
              <ArrowLeft className="inline mr-2" size={16} />
              Retour
            </button>
          </div>
        )}

        {/* Step: Photos */}
        {step === "photos" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Vos photos ({photos.length})</h2>
              <span className="text-primary font-bold">
                {selectedPhotos.length} sélectionnée(s)
              </span>
            </div>
            
            {photos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60 mb-4">Aucune photo trouvée</p>
                <button
                  onClick={() => setStep("selfie")}
                  className="text-primary"
                >
                  Réessayer avec un autre selfie
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {photos.map(photo => (
                    <div
                      key={photo.id}
                      onClick={() => togglePhoto(photo.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer ${
                        selectedPhotos.includes(photo.id) ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <img 
                        src={photo.thumbnail_url || photo.url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                      {selectedPhotos.includes(photo.id) && (
                        <div className="absolute top-2 right-2 bg-primary text-black rounded-full p-1">
                          <Check size={16} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {selectedPhotos.length > 0 && (
                  <button
                    onClick={() => setStep("delivery")}
                    className="w-full bg-primary text-black font-bold py-4 rounded-xl"
                  >
                    Continuer ({calculatePrice()}€)
                    <ChevronRight className="inline ml-2" size={20} />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Step: Delivery */}
        {step === "delivery" && (
          <div>
            <button onClick={() => setStep("photos")} className="text-white/60 mb-4 flex items-center">
              <ArrowLeft size={20} className="mr-2" /> Retour
            </button>
            
            <h2 className="text-xl font-bold mb-6">Comment recevoir vos photos ?</h2>
            
            {/* Delivery method */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setDeliveryMethod("print")}
                className={`w-full p-4 rounded-xl border-2 text-left ${
                  deliveryMethod === "print" 
                    ? "border-primary bg-primary/10" 
                    : "border-white/20"
                }`}
              >
                <Printer className="inline mr-3 text-primary" size={24} />
                <span className="font-bold">Impression</span>
                <p className="text-white/60 text-sm mt-1 ml-9">On vous apporte vos photos</p>
              </button>
              
              <button
                onClick={() => setDeliveryMethod("email")}
                className={`w-full p-4 rounded-xl border-2 text-left ${
                  deliveryMethod === "email" 
                    ? "border-primary bg-primary/10" 
                    : "border-white/20"
                }`}
              >
                <Mail className="inline mr-3 text-primary" size={24} />
                <span className="font-bold">Par email</span>
                <p className="text-white/60 text-sm mt-1 ml-9">Recevez vos photos par email</p>
              </button>
            </div>
            
            {/* Location options (for print) */}
            {deliveryMethod === "print" && (
              <div className="space-y-4 mb-6">
                <h3 className="font-bold text-white/80">Où êtes-vous ?</h3>
                
                <button
                  onClick={() => setDeliveryLocation("table")}
                  className={`w-full p-4 rounded-xl border-2 text-left ${
                    deliveryLocation === "table" 
                      ? "border-green-500 bg-green-500/10" 
                      : "border-white/20"
                  }`}
                >
                  <span className="text-2xl mr-3">🪑</span>
                  <span className="font-bold">J'ai un numéro de table</span>
                </button>
                
                {deliveryLocation === "table" && (
                  <input
                    type="text"
                    placeholder="Numéro de table"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full p-4 bg-white/10 rounded-xl border border-white/20 text-white"
                  />
                )}
                
                <button
                  onClick={() => setDeliveryLocation("location")}
                  className={`w-full p-4 rounded-xl border-2 text-left ${
                    deliveryLocation === "location" 
                      ? "border-green-500 bg-green-500/10" 
                      : "border-white/20"
                  }`}
                >
                  <MapPin className="inline mr-3 text-green-500" size={24} />
                  <span className="font-bold">Je décris mon emplacement</span>
                </button>
                
                {deliveryLocation === "location" && (
                  <textarea
                    placeholder="Ex: Près du bar, table du fond à gauche..."
                    value={locationDescription}
                    onChange={(e) => setLocationDescription(e.target.value)}
                    className="w-full p-4 bg-white/10 rounded-xl border border-white/20 text-white h-24 resize-none"
                  />
                )}
                
                <button
                  onClick={() => setDeliveryLocation("pickup")}
                  className={`w-full p-4 rounded-xl border-2 text-left ${
                    deliveryLocation === "pickup" 
                      ? "border-green-500 bg-green-500/10" 
                      : "border-white/20"
                  }`}
                >
                  <User className="inline mr-3 text-green-500" size={24} />
                  <span className="font-bold">Je récupère auprès du photographe</span>
                </button>
              </div>
            )}
            
            {/* Email input */}
            {deliveryMethod === "email" && (
              <div className="mb-6">
                <input
                  type="email"
                  placeholder="Votre adresse email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 bg-white/10 rounded-xl border border-white/20 text-white"
                />
              </div>
            )}
            
            <button
              onClick={() => setStep("payment")}
              disabled={
                (deliveryMethod === "print" && deliveryLocation === "table" && !tableNumber) ||
                (deliveryMethod === "print" && deliveryLocation === "location" && !locationDescription) ||
                (deliveryMethod === "email" && !email)
              }
              className="w-full bg-primary text-black font-bold py-4 rounded-xl disabled:opacity-50"
            >
              Continuer vers le paiement
              <ChevronRight className="inline ml-2" size={20} />
            </button>
          </div>
        )}

        {/* Step: Payment */}
        {step === "payment" && (
          <div>
            <button onClick={() => setStep("delivery")} className="text-white/60 mb-4 flex items-center">
              <ArrowLeft size={20} className="mr-2" /> Retour
            </button>
            
            <h2 className="text-xl font-bold mb-2">Paiement</h2>
            <p className="text-white/60 mb-6">
              {selectedPhotos.length} photo(s) • {deliveryMethod === "print" ? "Impression" : "Email"}
            </p>
            
            <div className="bg-white/10 rounded-xl p-4 mb-6 text-center">
              <p className="text-white/60 text-sm">Total à payer</p>
              <p className="text-4xl font-bold text-primary">{calculatePrice()}€</p>
            </div>
            
            <div className="space-y-3">
              {/* Stripe - Carte bancaire */}
              <button
                onClick={createStripePayment}
                disabled={processingStripe || processingPaypal}
                className="w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {processingStripe ? <Loader className="animate-spin" size={20} /> : <CreditCard size={24} />}
                Payer par Carte Bancaire
              </button>
              
              {/* PayPal */}
              <button
                onClick={createPayPalOrder}
                disabled={processingStripe || processingPaypal}
                className="w-full p-4 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {processingPaypal ? <Loader className="animate-spin" size={20} /> : (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082h-2.19c-1.717 0-3.146 1.27-3.403 2.958l-1.12 7.106H2.47c-.99 0-1.776.871-1.633 1.862l.326 2.26c.143.991 1.01 1.732 2.003 1.732h4.606c1.717 0 3.146-1.27 3.403-2.958l.812-5.148h2.398c5.553 0 9.55-2.857 10.635-8.437.386-1.985.066-3.594-.798-4.67z"/>
                  </svg>
                )}
                Payer avec PayPal
              </button>
            </div>
          </div>
        )}

        {/* Step: Stripe Payment */}
        {step === "payment-stripe" && stripeClientSecret && (
          <div>
            <button onClick={() => {
              setStripeClientSecret(null);
              setStep("payment");
            }} className="text-white/60 mb-4 flex items-center">
              <ArrowLeft size={20} className="mr-2" /> Retour
            </button>
            
            <h2 className="text-xl font-bold mb-4">Paiement par carte</h2>
            
            <Elements stripe={getStripe()} options={{ clientSecret: stripeClientSecret }}>
              <StripeCheckoutForm 
                amount={calculatePrice()}
                onSuccess={handleStripeSuccess}
                onCancel={() => {
                  setStripeClientSecret(null);
                  setStep("payment");
                }}
              />
            </Elements>
          </div>
        )}

        {/* Step: Processing Payment (shown when returning from PayPal) */}
        {step === "processing" && (
          <div className="text-center py-12">
            <Loader className="animate-spin mx-auto mb-6 text-primary" size={64} />
            <h2 className="text-xl font-bold mb-4">Traitement du paiement...</h2>
            <p className="text-white/60">Veuillez patienter</p>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-2xl font-bold mb-4 text-green-400">Commande envoyée !</h2>
            
            {deliveryMethod === "print" ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                <Printer className="mx-auto mb-4 text-green-400" size={48} />
                <p className="text-white/80 mb-2">
                  Vos photos sont en cours d'impression
                </p>
                <p className="text-white/60 text-sm">
                  {deliveryLocation === "table" && `Le photographe vous les apportera à la table ${tableNumber}`}
                  {deliveryLocation === "location" && `Le photographe vous les apportera : ${locationDescription}`}
                  {deliveryLocation === "pickup" && "Récupérez vos photos auprès du photographe"}
                </p>
              </div>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                <Mail className="mx-auto mb-4 text-blue-400" size={48} />
                <p className="text-white/80">
                  Vos photos seront envoyées à
                </p>
                <p className="text-primary font-bold">{email}</p>
              </div>
            )}
            
            <button
              onClick={() => {
                setSelectedPhotos([]);
                setStep("welcome");
              }}
              className="mt-8 text-primary underline"
            >
              Commander d'autres photos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
