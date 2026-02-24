import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Camera, Mic, Tv, Check, ArrowRight, X, Image, Video, CreditCard, Building2, Loader } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

const ServicePage = ({ category }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("paypal"); // "paypal" or "bank"
  const [buyFormData, setBuyFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    event_date: "",
    event_location: "",
    message: ""
  });
  const [buyLoading, setBuyLoading] = useState(false);
  const [buySuccess, setBuySuccess] = useState(false);
  const [paypalRedirecting, setPaypalRedirecting] = useState(false);

  const categoryInfo = {
    wedding: {
      title: "Mariages",
      subtitle: "Immortalisez votre amour",
      description: "Nos forfaits mariage combinent photographie et vidéographie pour créer des souvenirs intemporels de votre journée spéciale.",
      icon: Camera,
      image: "https://images.unsplash.com/photo-1673195577797-d86fd842ade8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwxfHxjaW5lbWF0aWMlMjB3ZWRkaW5nJTIwY291cGxlJTIwZGFyayUyMG1vb2R5fGVufDB8fHx8MTc2OTg0OTg2OHww&ixlib=rb-4.1.0&q=85",
      showQuoteButton: true
    },
    podcast: {
      title: "Studio Podcast",
      subtitle: "Votre voix, notre expertise",
      description: "Un studio d'enregistrement professionnel avec équipement haut de gamme pour des podcasts de qualité broadcast.",
      icon: Mic,
      image: "https://images.unsplash.com/photo-1659083725992-9d88c12e719c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBwb2RjYXN0JTIwc3R1ZGlvJTIwbWljcm9waG9uZSUyMG5lb258ZW58MHx8fHwxNzY5ODQ5ODczfDA&ixlib=rb-4.1.0&q=85"
    },
    tv_set: {
      title: "Plateau TV",
      subtitle: "Production professionnelle",
      description: "Des plateaux de tournage entièrement équipés pour vos productions télévisées, émissions et contenus corporate.",
      icon: Tv,
      image: "https://images.unsplash.com/photo-1643651342963-d4478284de5d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwxfHx0diUyMHByb2R1Y3Rpb24lMjBzZXQlMjBjYW1lcmElMjBjcmV3fGVufDB8fHx8MTc2OTg0OTg3OHww&ixlib=rb-4.1.0&q=85"
    }
  };

  const info = categoryInfo[category];
  const Icon = info.icon;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, bankRes] = await Promise.all([
          axios.get(`${API}/services?category=${category}`),
          axios.get(`${API}/bank-details`)
        ]);
        setServices(servicesRes.data);
        setBankDetails(bankRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [category]);

  const openBuyModal = (service) => {
    setSelectedPackage(service);
    setBuyFormData({ client_name: "", client_email: "", client_phone: "", event_date: "", event_location: "", message: "" });
    setBuySuccess(false);
    setShowBuyModal(true);
  };

  const handleBuySubmit = async (e) => {
    e.preventDefault();
    if (!selectedPackage) return;
    
    setBuyLoading(true);
    try {
      // First create the booking
      const bookingRes = await axios.post(`${API}/bookings`, {
        ...buyFormData,
        service_id: selectedPackage.id,
        payment_method: paymentMethod
      });
      
      if (paymentMethod === "paypal") {
        // Create PayPal payment for the deposit
        setPaypalRedirecting(true);
        try {
          const paypalRes = await axios.post(`${API}/paypal/create-service-payment`, {
            booking_id: bookingRes.data.id,
            client_email: buyFormData.client_email,
            client_name: buyFormData.client_name,
            service_name: selectedPackage.name,
            amount: depositAmount,
            total_price: selectedPackage.price
          });
          
          if (paypalRes.data.approval_url) {
            window.location.href = paypalRes.data.approval_url;
          } else {
            toast.error("Erreur PayPal: URL non reçue");
            setPaypalRedirecting(false);
          }
        } catch (paypalError) {
          toast.error(paypalError.response?.data?.detail || "Erreur lors du paiement PayPal");
          setPaypalRedirecting(false);
          // Still show success for bank transfer fallback
          setBuySuccess(true);
        }
      } else {
        // Bank transfer - show success with RIB
        setBuySuccess(true);
        toast.success("Réservation confirmée ! Vérifiez votre email.");
      }
    } catch (e) {
      toast.error("Erreur lors de la réservation");
    } finally {
      setBuyLoading(false);
    }
  };

  const depositAmount = selectedPackage ? (selectedPackage.price * (bankDetails?.deposit_percentage || 30) / 100) : 0;

  return (
    <div className="pt-20" data-testid={`service-page-${category}`}>
      {/* Buy Modal */}
      {showBuyModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-primary w-full max-w-2xl my-8">
            {/* Modal Header */}
            <div className="bg-primary/10 p-6 border-b border-primary/30">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-primary font-bold text-2xl">{selectedPackage.name}</h2>
                  <p className="text-white/60 text-sm mt-1">{selectedPackage.description}</p>
                </div>
                <button onClick={() => setShowBuyModal(false)} className="text-white/60 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-primary font-black text-3xl text-primary">{selectedPackage.price}€</span>
                <span className="text-white/50">Acompte: {depositAmount.toFixed(0)}€ ({bankDetails?.deposit_percentage || 30}%)</span>
              </div>
            </div>

            {!buySuccess ? (
              <form onSubmit={handleBuySubmit} className="p-6">
                <h3 className="font-primary font-semibold text-lg mb-4">Vos informations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Nom complet *</label>
                    <input
                      type="text"
                      required
                      value={buyFormData.client_name}
                      onChange={(e) => setBuyFormData({ ...buyFormData, client_name: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={buyFormData.client_email}
                      onChange={(e) => setBuyFormData({ ...buyFormData, client_email: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Téléphone *</label>
                    <input
                      type="tel"
                      required
                      value={buyFormData.client_phone}
                      onChange={(e) => setBuyFormData({ ...buyFormData, client_phone: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Date de l'événement *</label>
                    <input
                      type="date"
                      required
                      value={buyFormData.event_date}
                      onChange={(e) => setBuyFormData({ ...buyFormData, event_date: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-white/60 mb-2">Lieu de l'événement</label>
                    <input
                      type="text"
                      value={buyFormData.event_location}
                      onChange={(e) => setBuyFormData({ ...buyFormData, event_location: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                      placeholder="Ville, salle de réception..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-white/60 mb-2">Message (optionnel)</label>
                    <textarea
                      value={buyFormData.message}
                      onChange={(e) => setBuyFormData({ ...buyFormData, message: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                      rows={2}
                      placeholder="Informations complémentaires..."
                    />
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-primary/10 border border-primary/30 p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/70">Prix de la formule</span>
                    <span className="font-bold">{selectedPackage.price}€</span>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-white/70">Acompte à régler ({bankDetails?.deposit_percentage || 30}%)</span>
                    <span className="font-primary font-bold text-2xl text-primary">{depositAmount.toFixed(0)}€</span>
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    Vous recevrez un email avec les coordonnées bancaires pour effectuer le virement.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowBuyModal(false)} className="btn-outline flex-1 py-3">
                    Annuler
                  </button>
                  <button type="submit" disabled={buyLoading} className="btn-primary flex-1 py-3 disabled:opacity-50">
                    {buyLoading ? "Envoi..." : "Valider et recevoir le RIB"}
                  </button>
                </div>
              </form>
            ) : (
              /* Success State */
              <div className="p-6 text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={40} className="text-green-500" />
                </div>
                <h3 className="font-primary font-bold text-2xl mb-4 text-green-500">Réservation confirmée !</h3>
                <p className="text-white/70 mb-6">
                  Un email a été envoyé à <span className="text-primary">{buyFormData.client_email}</span> avec les coordonnées bancaires pour effectuer le virement de l'acompte.
                </p>

                {bankDetails && (
                  <div className="bg-background p-6 text-left mb-6">
                    <h4 className="font-primary font-semibold mb-4">💳 Coordonnées bancaires</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Titulaire</span>
                        <span className="font-mono">{bankDetails.account_holder}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">IBAN</span>
                        <span className="font-mono text-xs">{bankDetails.iban}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">BIC</span>
                        <span className="font-mono">{bankDetails.bic}</span>
                      </div>
                      <div className="flex justify-between text-primary font-bold mt-4 pt-4 border-t border-white/10">
                        <span>Montant à virer</span>
                        <span>{depositAmount.toFixed(0)}€</span>
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={() => setShowBuyModal(false)} className="btn-primary px-8 py-3">
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img src={info.image} alt={info.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/80"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <Icon className="text-primary" size={32} />
              <span className="font-primary text-sm uppercase tracking-wider text-primary">{info.subtitle}</span>
            </div>
            <h1 className="font-primary font-black text-4xl md:text-6xl tracking-tighter uppercase mb-6">{info.title}</h1>
            <p className="font-secondary text-white/70 text-lg mb-8">{info.description}</p>
            {info.showQuoteButton && (
              <Link to="/devis-mariage" className="btn-primary px-8 py-4 text-sm inline-flex items-center gap-2">
                Créer mon devis personnalisé <ArrowRight size={18} />
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-primary font-bold text-3xl md:text-4xl tracking-tight mb-12 text-center">Nos Formules</h2>
          
          {loading ? (
            <div className="text-center text-white/60">Chargement...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-card border p-8 card-hover ${
                    index === 1 ? "border-primary" : "border-white/10"
                  }`}
                  data-testid={`pricing-card-${service.id}`}
                >
                  {index === 1 && (
                    <div className="bg-primary text-black font-primary font-bold text-xs uppercase tracking-wider px-4 py-1 inline-block mb-4">
                      Populaire
                    </div>
                  )}
                  <h3 className="font-primary font-bold text-xl mb-2">{service.name}</h3>
                  <p className="font-secondary text-white/60 text-sm mb-6">{service.description}</p>
                  
                  <div className="mb-6">
                    <span className="font-primary font-black text-4xl text-gold-gradient">{service.price}€</span>
                    {service.duration && (
                      <span className="text-white/40 text-sm ml-2">/ {service.duration}</span>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <Check size={16} className="text-primary mt-0.5 shrink-0" />
                        <span className="text-white/70">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-3">
                    <button
                      onClick={() => openBuyModal(service)}
                      className={`w-full py-3 text-sm font-semibold ${
                        index === 1 ? "btn-primary" : "btn-outline"
                      }`}
                      data-testid={`buy-service-${service.id}`}
                    >
                      Acheter cette formule
                    </button>
                    {category === "wedding" && (
                      <Link
                        to="/devis-mariage"
                        className="w-full inline-block text-center py-2 text-xs text-white/50 hover:text-primary"
                      >
                        ou créer un devis personnalisé →
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Portfolio Preview for Wedding */}
      {category === "wedding" && (
        <section className="py-24 md:py-32 bg-card border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-primary font-bold text-3xl md:text-4xl tracking-tight mb-4">Nos Réalisations</h2>
              <p className="font-secondary text-white/60">Découvrez nos plus beaux mariages</p>
            </div>
            <div className="flex justify-center gap-4">
              <Link to="/portfolio?type=photo&category=wedding" className="btn-outline px-8 py-3 text-sm inline-flex items-center gap-2">
                <Image size={18} /> Photos
              </Link>
              <Link to="/portfolio?type=video&category=wedding" className="btn-outline px-8 py-3 text-sm inline-flex items-center gap-2">
                <Video size={18} /> Vidéos
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ServicePage;
