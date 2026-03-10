/**
 * PhotoFind Mobile - Interface mobile pour commander depuis son téléphone
 * Le client scanne le QR code du kiosque et peut sélectionner/payer/faire imprimer à distance
 */

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast, Toaster } from "sonner";
import { 
  Camera, Check, ArrowLeft, Loader, CreditCard, 
  MapPin, User, MessageSquare, Printer, Mail,
  ChevronRight, X, Search
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function PhotoFindMobile() {
  const { eventId } = useParams();
  
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
  
  // Steps: welcome, selfie, photos, delivery, payment, confirm, success
  const [step, setStep] = useState("welcome");
  
  // Delivery options
  const [deliveryMethod, setDeliveryMethod] = useState("print"); // print or email
  const [deliveryLocation, setDeliveryLocation] = useState("table"); // table, location, pickup
  const [tableNumber, setTableNumber] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [email, setEmail] = useState("");
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Cash code
  const [cashCodeRequestId, setCashCodeRequestId] = useState(null);
  const [cashCode, setCashCode] = useState("");
  const [cashCodeError, setCashCodeError] = useState("");
  
  // Video ref for selfie
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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

  // Start camera for selfie
  const startCamera = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Votre navigateur ne supporte pas l'accès à la caméra");
        return;
      }
      
      // Simple constraints that work better on mobile
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(resolve).catch(resolve);
          };
        });
      }
      setSelfieMode(true);
    } catch (e) {
      console.error("Camera error:", e);
      if (e.name === 'NotAllowedError') {
        toast.error("Accès à la caméra refusé. Autorisez l'accès dans les paramètres.");
      } else if (e.name === 'NotFoundError') {
        toast.error("Aucune caméra trouvée sur cet appareil");
      } else {
        toast.error("Impossible d'accéder à la caméra: " + e.message);
      }
    }
  };

  // Capture selfie
  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setSelfieImage(imageData);
    
    // Stop camera
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setSelfieMode(false);
    
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

  // Handle cash payment
  const handleCashPayment = async () => {
    setProcessing(true);
    try {
      const res = await axios.post(`${API}/public/photofind/${eventId}/request-cash-code`, {
        photo_ids: selectedPhotos,
        amount: calculatePrice(),
        delivery_method: deliveryMethod,
        delivery_info: getDeliveryInfo()
      });
      setCashCodeRequestId(res.data.request_id);
      setCashCode("");
      setCashCodeError("");
      setStep("cash-code");
    } catch (e) {
      toast.error("Erreur lors de la demande de code");
    } finally {
      setProcessing(false);
    }
  };

  // Validate cash code
  const validateCashCode = async () => {
    if (cashCode.length !== 4) {
      setCashCodeError("Veuillez entrer un code à 4 chiffres");
      return;
    }
    
    setProcessing(true);
    try {
      const res = await axios.post(`${API}/public/photofind/${eventId}/validate-cash-code-mobile`, {
        code: cashCode,
        request_id: cashCodeRequestId,
        delivery_info: getDeliveryInfo(),
        email: email || null
      });
      
      if (res.data.valid) {
        toast.success("Commande envoyée !");
        setStep("success");
      } else {
        setCashCodeError("Code incorrect");
      }
    } catch (e) {
      setCashCodeError(e.response?.data?.detail || "Erreur");
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
                startCamera();
                setStep("selfie");
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
              <div className="relative">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  style={{ width: '100%', maxWidth: '320px', height: 'auto', minHeight: '240px', backgroundColor: '#333' }}
                  className="mx-auto rounded-xl border-2 border-primary"
                />
                <canvas ref={canvasRef} className="hidden" />
                <button
                  onClick={captureSelfie}
                  className="mt-4 bg-primary text-black font-bold px-8 py-4 rounded-full"
                >
                  📷 Capturer
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
              <button
                onClick={handleCashPayment}
                disabled={processing}
                className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-xl font-bold flex items-center justify-center gap-3"
              >
                {processing ? <Loader className="animate-spin" size={20} /> : "💶"}
                Payer en espèces / CB au photographe
              </button>
              
              {/* TODO: Add Stripe and PayPal buttons */}
            </div>
          </div>
        )}

        {/* Step: Cash Code */}
        {step === "cash-code" && (
          <div className="text-center py-8">
            <div className="text-6xl mb-6">🔐</div>
            <h2 className="text-2xl font-bold mb-4">Code de confirmation</h2>
            <p className="text-white/70 mb-6">
              Demandez le code au photographe après avoir payé
            </p>
            
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="- - - -"
              value={cashCode}
              onChange={(e) => {
                setCashCode(e.target.value.replace(/\D/g, '').slice(0, 4));
                setCashCodeError("");
              }}
              className="w-32 mx-auto bg-white/10 border-2 border-white/30 text-white text-3xl text-center tracking-[0.5em] px-4 py-3 rounded-xl"
            />
            
            {cashCodeError && (
              <p className="text-red-400 mt-4">{cashCodeError}</p>
            )}
            
            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => setStep("payment")}
                className="px-6 py-3 bg-white/10 rounded-xl"
              >
                Retour
              </button>
              <button
                onClick={validateCashCode}
                disabled={processing || cashCode.length !== 4}
                className="px-6 py-3 bg-green-600 rounded-xl font-bold disabled:opacity-50"
              >
                {processing ? <Loader className="animate-spin" size={20} /> : "Valider"}
              </button>
            </div>
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
