import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, CreditCard, Check, Clock, AlertTriangle } from "lucide-react";
import axios from "axios";
import { API } from "../config/api";

const RenewalPage = () => {
  const [step, setStep] = useState("options"); // options, payment, success
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plans = [
    {
      id: "weekly",
      label: "1 semaine",
      price: 2,
      description: "Accès pendant 7 jours",
      popular: false
    },
    {
      id: "6months",
      label: "6 mois",
      price: 90,
      description: "Accès pendant 180 jours",
      popular: true,
      savings: "Économisez 50€ !"
    }
  ];

  const handlePaymentComplete = async () => {
    if (!email || !selectedPlan) {
      setError("Veuillez sélectionner un plan et entrer votre email");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await axios.post(`${API}/renewal/request`, {
        client_email: email,
        plan: selectedPlan.id
      });
      setStep("success");
    } catch (e) {
      setError(e.response?.data?.detail || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const openPayPal = () => {
    if (!selectedPlan) return;
    window.open(
      `https://paypal.me/creativindustryfranc/${selectedPlan.price}`,
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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

        {step === "options" && (
          <>
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
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-black text-xs font-bold px-3 py-1">
                      RECOMMANDÉ
                    </div>
                  )}
                  
                  <div className="text-center">
                    <p className="text-white/60 text-sm mb-2">{plan.label}</p>
                    <p className="text-4xl font-bold text-primary mb-2">
                      {plan.price}€
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

            {/* Payment Button */}
            <button
              onClick={() => selectedPlan && email && setStep("payment")}
              disabled={!selectedPlan || !email}
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard size={20} />
              Continuer vers le paiement
            </button>
          </>
        )}

        {step === "payment" && (
          <div className="bg-card border border-white/10 p-8">
            <h2 className="font-bold text-xl mb-6 text-center">Paiement PayPal</h2>
            
            <div className="bg-background/50 border border-white/10 p-6 mb-6 text-center">
              <p className="text-white/60 mb-2">Montant à payer</p>
              <p className="text-4xl font-bold text-primary">{selectedPlan?.price}€</p>
              <p className="text-white/50 text-sm mt-2">{selectedPlan?.label}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-white/70">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">1</div>
                <p>Cliquez sur "Payer avec PayPal" ci-dessous</p>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">2</div>
                <p>Effectuez le paiement de <strong className="text-primary">{selectedPlan?.price}€</strong></p>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">3</div>
                <p>Revenez ici et cliquez sur "J'ai payé"</p>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href={`https://paypal.me/creativindustryfranc/${selectedPlan?.price}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white py-4 flex items-center justify-center gap-2 font-bold transition-colors"
              >
                <CreditCard size={20} />
                Payer avec PayPal
              </a>
              
              <button
                onClick={handlePaymentComplete}
                disabled={loading}
                className="w-full btn-primary py-4 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Clock size={20} className="animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    J'ai payé - Valider ma demande
                  </>
                )}
              </button>

              <button
                onClick={() => setStep("options")}
                className="w-full btn-outline py-3 text-sm"
              >
                Retour
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 p-4 mt-4 flex items-center gap-3">
                <AlertTriangle size={20} className="text-red-500" />
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}

        {step === "success" && (
          <div className="bg-card border border-white/10 p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-500" />
            </div>
            
            <h2 className="font-bold text-2xl mb-4 text-green-500">
              Demande enregistrée !
            </h2>
            
            <p className="text-white/70 mb-6">
              Votre demande de renouvellement a été envoyée. 
              <br />
              <strong className="text-primary">Votre compte sera débloqué dès validation du paiement</strong>
              <br />
              (généralement sous quelques heures)
            </p>

            <div className="bg-background/50 border border-white/10 p-4 mb-6">
              <p className="text-white/50 text-sm">
                Un email de confirmation vous sera envoyé une fois votre compte réactivé.
              </p>
            </div>

            <a
              href="/"
              className="btn-outline px-8 py-3 inline-block"
            >
              Retour à l'accueil
            </a>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default RenewalPage;
