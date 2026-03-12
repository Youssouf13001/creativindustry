import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Download, Loader, X, CheckCircle, Clock, Image, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

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

const PhotoFindDownloadPage = () => {
  const { purchaseId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadInfo, setDownloadInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  
  // Payment states
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchDownloadInfo();
  }, [purchaseId, token]);

  const fetchDownloadInfo = async () => {
    if (!token) {
      setError("Lien invalide - token manquant");
      setLoading(false);
      return;
    }
    
    try {
      const res = await axios.get(`${API}/public/photofind/download/${purchaseId}?token=${token}`);
      setDownloadInfo(res.data);
    } catch (e) {
      const msg = e.response?.data?.detail || "Lien invalide ou expiré";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Check if purchase is paid
  const isPaid = downloadInfo?.status === "completed" || downloadInfo?.status === "paid";

  // Create Stripe payment intent
  const createStripePayment = async () => {
    setProcessingPayment(true);
    try {
      const res = await axios.post(`${API}/public/photofind/download/${purchaseId}/create-payment`, {
        token: token,
        payment_method: "stripe"
      });
      
      setStripeClientSecret(res.data.client_secret);
      setPaymentMethod("stripe");
      setShowPayment(true);
    } catch (e) {
      toast.error("Erreur lors de la création du paiement");
      console.error(e);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle successful Stripe payment
  const handleStripeSuccess = async (paymentIntentId) => {
    setProcessingPayment(true);
    try {
      const res = await axios.post(`${API}/public/photofind/download/${purchaseId}/confirm-payment`, {
        token: token,
        payment_id: paymentIntentId,
        payment_method: "stripe"
      });
      
      if (res.data.success) {
        toast.success("Paiement confirmé !");
        // Refresh download info
        await fetchDownloadInfo();
        setShowPayment(false);
        setPaymentMethod(null);
      }
    } catch (e) {
      toast.error("Erreur lors de la confirmation du paiement");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Create PayPal payment
  const createPayPalPayment = async () => {
    setProcessingPayment(true);
    try {
      const res = await axios.post(`${API}/public/photofind/download/${purchaseId}/create-payment`, {
        token: token,
        payment_method: "paypal",
        return_url: window.location.href
      });
      
      // Store purchase ID for return
      localStorage.setItem('pending_download_payment', purchaseId);
      localStorage.setItem('pending_download_token', token);
      
      // Redirect to PayPal
      if (res.data.approval_url) {
        window.location.href = res.data.approval_url;
      }
    } catch (e) {
      toast.error("Erreur lors de la création du paiement PayPal");
      console.error(e);
      setProcessingPayment(false);
    }
  };

  // Check for PayPal return
  useEffect(() => {
    const paypalOrderId = searchParams.get("paypal_order_id");
    const storedPurchaseId = localStorage.getItem('pending_download_payment');
    const storedToken = localStorage.getItem('pending_download_token');
    
    if (paypalOrderId && storedPurchaseId === purchaseId && storedToken === token) {
      // Confirm PayPal payment
      confirmPayPalPayment(paypalOrderId);
      
      // Clean up
      localStorage.removeItem('pending_download_payment');
      localStorage.removeItem('pending_download_token');
    }
  }, [searchParams]);

  const confirmPayPalPayment = async (paypalOrderId) => {
    setProcessingPayment(true);
    try {
      const res = await axios.post(`${API}/public/photofind/download/${purchaseId}/confirm-payment`, {
        token: token,
        payment_id: paypalOrderId,
        payment_method: "paypal"
      });
      
      if (res.data.success) {
        toast.success("Paiement PayPal confirmé !");
        await fetchDownloadInfo();
      }
    } catch (e) {
      toast.error("Erreur lors de la confirmation PayPal");
    } finally {
      setProcessingPayment(false);
    }
  };

  const downloadAllAsZip = async () => {
    if (!isPaid) {
      toast.error("Veuillez payer avant de télécharger");
      return;
    }
    
    setDownloading(true);
    try {
      const response = await axios.get(
        `${API}/public/photofind/download/${purchaseId}/zip?token=${token}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${downloadInfo.event_name?.replace(/\s+/g, '_') || 'photos'}_photos.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Téléchargement démarré !");
    } catch (e) {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloading(false);
    }
  };

  const downloadSinglePhoto = (photo) => {
    if (!isPaid) {
      toast.error("Veuillez payer avant de télécharger");
      return;
    }
    
    const link = document.createElement('a');
    link.href = `${BACKEND_URL}${photo.url}`;
    link.setAttribute('download', photo.filename);
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <X className="mx-auto text-red-500 mb-4" size={64} />
          <h1 className="text-2xl font-primary text-white mb-2">Oops !</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <p className="text-white/40 text-sm">
            Si vous pensez qu'il s'agit d'une erreur, contactez le photographe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={`py-12 px-4 ${isPaid ? 'bg-gradient-to-r from-green-500/20 to-transparent' : 'bg-gradient-to-r from-primary/20 to-transparent'}`}>
        <div className="max-w-4xl mx-auto text-center">
          {isPaid ? (
            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
          ) : (
            <Lock className="mx-auto text-primary mb-4" size={64} />
          )}
          <h1 className="font-primary text-3xl md:text-4xl text-white mb-2">
            {isPaid ? "Vos photos sont prêtes !" : "Finalisez votre achat"}
          </h1>
          <p className="text-white/60">
            {downloadInfo.photo_count} photo(s) de <span className="text-white">{downloadInfo.event_name}</span>
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Payment Required Section */}
        {!isPaid && (
          <div className="bg-card border border-primary/30 rounded-xl p-6 mb-8">
            <div className="text-center mb-6">
              <h2 className="font-primary text-2xl text-white mb-2">
                Paiement requis
              </h2>
              <p className="text-white/60">
                Payez pour débloquer le téléchargement de vos photos
              </p>
              <div className="mt-4 text-4xl font-bold text-primary">
                {downloadInfo.amount}€
              </div>
            </div>

            {/* Photo Preview with Watermark */}
            <div className="mb-6">
              <p className="text-white/50 text-sm text-center mb-3">Aperçu de vos photos</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {downloadInfo.photos?.slice(0, 6).map((photo, index) => (
                  <div 
                    key={photo.id}
                    className="relative rounded-lg overflow-hidden border border-white/10"
                  >
                    <img
                      src={`${BACKEND_URL}${photo.url}`}
                      alt={`Photo ${index + 1}`}
                      className="w-full aspect-square object-cover blur-sm opacity-70"
                    />
                    {/* Watermark overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 px-3 py-1 rounded text-white text-xs transform -rotate-12">
                        APERÇU
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Buttons */}
            {!showPayment ? (
              <div className="space-y-3">
                {/* Stripe - Carte bancaire */}
                <button
                  onClick={createStripePayment}
                  disabled={processingPayment}
                  className="w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {processingPayment ? <Loader className="animate-spin" size={20} /> : <CreditCard size={24} />}
                  Payer par Carte Bancaire
                </button>
                
                {/* PayPal */}
                <button
                  onClick={createPayPalPayment}
                  disabled={processingPayment}
                  className="w-full p-4 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {processingPayment ? <Loader className="animate-spin" size={20} /> : (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082h-2.19c-1.717 0-3.146 1.27-3.403 2.958l-1.12 7.106H2.47c-.99 0-1.776.871-1.633 1.862l.326 2.26c.143.991 1.01 1.732 2.003 1.732h4.606c1.717 0 3.146-1.27 3.403-2.958l.812-5.148h2.398c5.553 0 9.55-2.857 10.635-8.437.386-1.985.066-3.594-.798-4.67z"/>
                    </svg>
                  )}
                  Payer avec PayPal
                </button>
              </div>
            ) : paymentMethod === "stripe" && stripeClientSecret ? (
              <Elements stripe={getStripe()} options={{ clientSecret: stripeClientSecret }}>
                <StripeCheckoutForm 
                  amount={downloadInfo.amount}
                  onSuccess={handleStripeSuccess}
                  onCancel={() => {
                    setShowPayment(false);
                    setStripeClientSecret(null);
                  }}
                />
              </Elements>
            ) : null}
          </div>
        )}

        {/* Download Section (only visible when paid) */}
        {isPaid && (
          <>
            {/* Download All Button */}
            <div className="bg-card border border-white/10 rounded-xl p-6 mb-8 text-center">
              <h2 className="font-primary text-xl text-white mb-4">
                Télécharger toutes les photos
              </h2>
              <button
                onClick={downloadAllAsZip}
                disabled={downloading}
                className="px-8 py-4 bg-primary text-black font-bold rounded-lg text-lg flex items-center gap-3 mx-auto disabled:opacity-50"
              >
                {downloading ? (
                  <><Loader className="animate-spin" size={24} /> Préparation...</>
                ) : (
                  <><Download size={24} /> Télécharger en ZIP ({downloadInfo.photo_count} photos)</>
                )}
              </button>
              <p className="text-white/40 text-sm mt-3">
                Toutes vos photos en haute qualité dans un seul fichier
              </p>
            </div>

            {/* Individual Photos */}
            <div>
              <h3 className="font-primary text-lg text-white mb-4 flex items-center gap-2">
                <Image size={20} className="text-primary" />
                Ou téléchargez individuellement
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {downloadInfo.photos?.map((photo, index) => (
                  <div 
                    key={photo.id}
                    className="relative group rounded-lg overflow-hidden border border-white/10"
                  >
                    <img
                      src={`${BACKEND_URL}${photo.url}`}
                      alt={`Photo ${index + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => downloadSinglePhoto(photo)}
                        className="px-4 py-2 bg-primary text-black font-bold rounded-lg flex items-center gap-2"
                      >
                        <Download size={16} /> Télécharger
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                      Photo {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-white/40 text-sm">
            Merci pour votre confiance !
          </p>
          <p className="text-primary mt-2">
            <a href="https://creativindustry.com" className="hover:underline">
              CREATIVINDUSTRY France
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhotoFindDownloadPage;
