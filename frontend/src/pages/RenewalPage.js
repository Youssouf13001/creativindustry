import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Check, Clock, AlertTriangle, CreditCard, ArrowLeft } from "lucide-react";
import axios from "axios";
import { API } from "../config/api";

const RenewalPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState("options"); // options, processing, success, error
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

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

        {/* PayPal Payment Button */}
        <button
          onClick={handlePayWithPayPal}
          disabled={!selectedPlan || !email || loading}
          className="w-full bg-[#0070ba] hover:bg-[#005ea6] disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 text-lg flex items-center justify-center gap-3 font-bold transition-colors"
          data-testid="paypal-pay-button"
        >
          {loading ? (
            <>
              <Clock size={24} className="animate-spin" />
              Redirection vers PayPal...
            </>
          ) : (
            <>
              <CreditCard size={24} />
              Payer {selectedPlan ? `${selectedPlan.price}€ TTC` : ""} avec PayPal
            </>
          )}
        </button>

        <p className="text-center text-white/40 text-sm mt-4">
          Paiement sécurisé via PayPal. TVA 20% incluse. Votre compte sera activé automatiquement.
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
