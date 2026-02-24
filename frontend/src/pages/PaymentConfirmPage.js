import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Clock, AlertTriangle, Home, ArrowRight } from "lucide-react";
import axios from "axios";
import { API } from "../config/api";

const PaymentConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const paymentId = searchParams.get("paymentId");
    const payerId = searchParams.get("PayerID");
    const bookingId = searchParams.get("booking_id");
    
    if (paymentId && payerId) {
      executePayment(paymentId, payerId);
    } else if (!bookingId) {
      setStatus("error");
      setError("Paramètres de paiement manquants");
    }
  }, [searchParams]);

  const executePayment = async (paymentId, payerId) => {
    try {
      const res = await axios.post(
        `${API}/paypal/execute-service-payment?payment_id=${paymentId}&payer_id=${payerId}`
      );
      
      setPaymentData(res.data);
      setStatus("success");
    } catch (e) {
      setError(e.response?.data?.detail || "Erreur lors de la confirmation du paiement");
      setStatus("error");
    }
  };

  // Processing
  if (status === "processing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 pt-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Clock size={80} className="text-primary mx-auto mb-6 animate-spin" />
          <h2 className="text-2xl font-bold mb-4">Confirmation en cours...</h2>
          <p className="text-white/60">Veuillez patienter pendant que nous confirmons votre paiement</p>
        </motion.div>
      </div>
    );
  }

  // Error
  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 pt-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-card border border-red-500/30 p-8 text-center"
        >
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-red-500" />
          </div>
          
          <h2 className="font-bold text-2xl mb-4 text-red-500">Erreur de paiement</h2>
          <p className="text-white/70 mb-6">{error}</p>

          <div className="space-y-3">
            <Link to="/mariages" className="btn-primary w-full py-4 inline-block text-center">
              Réessayer
            </Link>
            <Link to="/" className="btn-outline w-full py-3 inline-block text-center">
              Retour à l'accueil
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 pt-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card border border-green-500/30 p-8 text-center"
      >
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={48} className="text-green-500" />
        </div>
        
        <h2 className="font-primary font-bold text-3xl mb-4 text-green-500">
          Paiement confirmé !
        </h2>
        
        <p className="text-white/70 mb-6">
          {paymentData?.message || "Votre acompte a été reçu avec succès."}
        </p>

        {paymentData?.service_name && (
          <div className="bg-background/50 border border-primary/30 p-6 mb-6">
            <p className="text-white/50 text-sm mb-2">Formule réservée</p>
            <p className="text-xl font-bold text-primary mb-4">{paymentData.service_name}</p>
            {paymentData?.invoice_number && (
              <p className="text-white/60 text-sm">
                Référence : <span className="text-white font-mono">{paymentData.invoice_number}</span>
              </p>
            )}
          </div>
        )}

        <div className="bg-green-500/10 border border-green-500/30 p-4 mb-6 text-left">
          <h4 className="font-bold text-green-400 mb-2">✅ Prochaines étapes</h4>
          <ul className="text-white/70 text-sm space-y-1">
            <li>• Un email de confirmation vous a été envoyé</li>
            <li>• Nous vous contacterons sous 24-48h</li>
            <li>• Préparez vos questions et idées !</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/" className="btn-outline flex-1 py-3 inline-flex items-center justify-center gap-2">
            <Home size={18} />
            Accueil
          </Link>
          <Link to="/portfolio" className="btn-primary flex-1 py-3 inline-flex items-center justify-center gap-2">
            Voir nos réalisations
            <ArrowRight size={18} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentConfirmPage;
