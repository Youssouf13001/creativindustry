import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Check, Clock, AlertTriangle, CreditCard, ArrowLeft, Loader } from "lucide-react";
import axios from "axios";
import { API, BACKEND_URL } from "../config/api";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Stripe Checkout Form Component
const StripeRenewalForm = ({ onSuccess, onCancel, amount, planName }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(
      window.stripeClientSecret,
      {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      }
    );

    if (paymentError) {
      setError(paymentError.message);
      setProcessing(false);
    } else if (paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white/10 p-4 rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#fff",
                "::placeholder": { color: "#aab7c4" }
              },
              invalid: { color: "#fa755a" }
            }
          }}
        />
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 p-3 rounded text-red-400 text-sm">
          {error}
        </div>
      )}
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-lg"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-[#635bff] hover:bg-[#5851db] text-white font-bold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing ? (
            <><Loader className="animate-spin" size={20} /> Paiement...</>
          ) : (
            <>Payer {amount}€</>
          )}
        </button>
      </div>
    </form>
  );
};

const RenewalPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState("options"); // options, processing, success, error, stripe-form
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // "paypal" or "stripe"
  const [stripePromise, setStripePromise] = useState(null);
  const [stripePaymentId, setStripePaymentId] = useState(null);

  const plans = [
    {
      id: "weekly",
      label: "1 semaine",
      price: 24,
      price_ht: 20,
      tva: 4,
      description: "Accès pendant 7 jours",
      popular: false
    },
    {
      id: "6months",
      label: "6 mois",
      price: 108,
      price_ht: 90,
      tva: 18,
      description: "Accès pendant 180 jours",
      popular: true,
      savings: "Économisez 36€ !"
    }
  ];

  // Handle PayPal return
  useEffect(() => {
    const paymentId = searchParams.get("paymentId");
    const payerId = searchParams.get("PayerID");
    
    if (paymentId && payerId) {
      executePayment(paymentId, payerId);
    }
  }, [searchParams]);

  // Load Stripe public key
  useEffect(() => {
    const loadStripeKey = async () => {
      try {
        const res = await axios.get(`${API}/public/stripe-config`);
        if (res.data.publishable_key) {
          setStripePromise(loadStripe(res.data.publishable_key));
        }
      } catch (e) {
        console.error("Failed to load Stripe config");
      }
    };
    loadStripeKey();
  }, []);

  const executePayment = async (paymentId, payerId) => {
    setStep("processing");
    setLoading(true);
    setError("");
    
    try {
      const res = await axios.post(`${API}/paypal/execute-payment?payment_id=${paymentId}&payer_id=${payerId}`);
      setSuccessData(res.data);
      setStep("success");
    } catch (e) {
      setError(e.response?.data?.detail || "Erreur lors de la confirmation du paiement");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithPayPal = async () => {
    if (!email || !selectedPlan) {
      setError("Veuillez sélectionner un plan et entrer votre email");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API}/paypal/create-order`, {
        client_email: email,
        plan: selectedPlan.id
      });
      
      if (res.data.approval_url) {
        // Redirect to PayPal
        window.location.href = res.data.approval_url;
      } else {
        setError("Erreur: URL de paiement non reçue");
      }
    } catch (e) {
      setError(e.response?.data?.detail || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithStripe = async () => {
    if (!email || !selectedPlan) {
      setError("Veuillez sélectionner un plan et entrer votre email");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API}/stripe/create-renewal-payment`, {
        plan_type: selectedPlan.id,
        email: email
      });
      
      if (res.data.client_secret) {
        window.stripeClientSecret = res.data.client_secret;
        setStripePaymentId(res.data.payment_id);
        setStep("stripe-form");
      } else {
        setError("Erreur: Configuration Stripe non reçue");
      }
    } catch (e) {
      setError(e.response?.data?.detail || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleStripeSuccess = async (paymentIntentId) => {
    setStep("processing");
    try {
      const res = await axios.post(`${API}/stripe/confirm-renewal-payment`, {
        payment_id: stripePaymentId,
        payment_intent_id: paymentIntentId
      });
      
      if (res.data.success) {
        setSuccessData(res.data);
        setStep("success");
      } else {
        setError(res.data.message || "Erreur lors de la confirmation");
        setStep("error");
      }
    } catch (e) {
      setError(e.response?.data?.detail || "Erreur lors de la confirmation");
      setStep("error");
    }
  };

  // Processing state (waiting for PayPal confirmation)
  if (step === "processing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6">
            <Clock size={80} className="text-primary animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Confirmation en cours...</h2>
          <p className="text-white/60">Veuillez patienter pendant que nous confirmons votre paiement</p>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-card border border-white/10 p-8 text-center"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-green-500" />
          </div>
          
          <h2 className="font-bold text-2xl mb-4 text-green-500">
            Paiement confirmé !
          </h2>
          
          <p className="text-white/70 mb-6">
            {successData?.message || "Votre compte a été réactivé avec succès !"}
          </p>

          <div className="bg-background/50 border border-green-500/30 p-6 mb-6">
            <p className="text-white/50 text-sm mb-2">Votre accès est valide jusqu'au</p>
            <p className="text-2xl font-bold text-primary">
              {successData?.new_expires_at 
                ? new Date(successData.new_expires_at).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })
                : "Date mise à jour"
              }
            </p>
          </div>

          <button
            onClick={() => navigate("/espace-client")}
            className="btn-primary px-8 py-4 text-lg"
            data-testid="login-after-renewal"
          >
            Se connecter maintenant
          </button>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (step === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-lg bg-card border border-red-500/30 p-8 text-center"
        >
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-red-500" />
          </div>
          
          <h2 className="font-bold text-2xl mb-4 text-red-500">
            Erreur de paiement
          </h2>
          
          <p className="text-white/70 mb-6">{error}</p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setStep("options");
                setError("");
              }}
              className="btn-primary w-full py-4"
            >
              Réessayer
            </button>
            <button
              onClick={() => navigate("/")}
              className="btn-outline w-full py-3"
            >
              Retour à l'accueil
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Options state (main form)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="renewal-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={40} className="text-amber-500" />
          </div>
          <h1 className="font-primary font-bold text-3xl mb-2">
            <span className="text-gold-gradient">Accès expiré</span>
          </h1>
          <p className="text-white/60">
            Renouvelez votre abonnement pour accéder à vos photos et vidéos
          </p>
        </div>

        {/* Email Input */}
        <div className="bg-card border border-white/10 p-6 mb-6">
          <label className="text-sm text-white/60 block mb-2">
            Votre adresse email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
            data-testid="renewal-email-input"
          />
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`relative bg-card border-2 p-6 cursor-pointer transition-all ${
                selectedPlan?.id === plan.id
                  ? "border-primary bg-primary/5"
                  : "border-white/10 hover:border-white/30"
              }`}
              data-testid={`plan-${plan.id}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-black text-xs font-bold px-3 py-1">
                  RECOMMANDÉ
                </div>
              )}
              
              <div className="text-center">
                <p className="text-white/60 text-sm mb-2">{plan.label}</p>
                <p className="text-4xl font-bold text-primary mb-1">
                  {plan.price}€
                </p>
                <p className="text-white/40 text-xs mb-2">
                  {plan.price_ht}€ HT + {plan.tva}€ TVA
                </p>
                <p className="text-white/50 text-sm">{plan.description}</p>
                {plan.savings && (
                  <p className="text-green-500 text-sm mt-2 font-bold">
                    {plan.savings}
                  </p>
                )}
              </div>

              {selectedPlan?.id === plan.id && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check size={14} className="text-black" />
                </div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 p-4 mb-6 flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-500" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Payment Buttons */}
        <div className="space-y-3">
          {/* Stripe CB Button */}
          {stripePromise && (
            <button
              onClick={handlePayWithStripe}
              disabled={!selectedPlan || !email || loading}
              className="w-full bg-[#635bff] hover:bg-[#5851db] disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 text-lg flex items-center justify-center gap-3 font-bold transition-colors rounded-lg"
              data-testid="stripe-pay-button"
            >
              {loading ? (
                <>
                  <Loader size={24} className="animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <CreditCard size={24} />
                  Payer {selectedPlan ? `${selectedPlan.price}€` : ""} par Carte Bancaire
                </>
              )}
            </button>
          )}

          {/* PayPal Button */}
          <button
            onClick={handlePayWithPayPal}
            disabled={!selectedPlan || !email || loading}
            className="w-full bg-[#0070ba] hover:bg-[#005ea6] disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 text-lg flex items-center justify-center gap-3 font-bold transition-colors rounded-lg"
            data-testid="paypal-pay-button"
          >
            {loading ? (
              <>
                <Clock size={24} className="animate-spin" />
                Redirection vers PayPal...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082h-2.19c-1.052 0-1.937.762-2.103 1.8l-1.12 7.106-.318 2.015a.641.641 0 0 0 .633.74h3.472c.524 0 .968-.382 1.05-.9l.434-2.75.278-1.76c.082-.518.526-.9 1.05-.9h.66c4.298 0 7.664-1.747 8.647-6.797a5.64 5.64 0 0 0 .287-1.948c-.148-.089-.303-.169-.574-.401z"/>
                </svg>
                Payer {selectedPlan ? `${selectedPlan.price}€` : ""} avec PayPal
              </>
            )}
          </button>
        </div>

        <p className="text-center text-white/40 text-sm mt-4">
          Paiement sécurisé. TVA 20% incluse. Votre compte sera activé automatiquement.
        </p>

        {/* Back link */}
        <button
          onClick={() => navigate("/")}
          className="w-full text-center text-white/50 text-sm mt-6 hover:text-primary flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} />
          Retour à l'accueil
        </button>
      </motion.div>
    </div>
  );
};

export default RenewalPage;
