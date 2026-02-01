import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Mic, Tv, Check } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

const BookingPage = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    event_date: "",
    event_time: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get(`${API}/services`);
        // Filter out wedding services (they use quote builder)
        const nonWeddingServices = res.data.filter(s => s.category !== "wedding");
        setServices(nonWeddingServices);
        
        const params = new URLSearchParams(window.location.search);
        const serviceId = params.get("service");
        if (serviceId) {
          const found = res.data.find(s => s.id === serviceId);
          if (found && found.category !== "wedding") {
            setSelectedService(found);
            setStep(2);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchServices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService) return;
    
    setLoading(true);
    try {
      await axios.post(`${API}/bookings`, {
        ...formData,
        service_id: selectedService.id
      });
      // Show success with deposit info
      const depositAmount = selectedService.price * 0.3;
      toast.success(`Réservation confirmée ! Vérifiez votre email pour les instructions de paiement de l'acompte (${depositAmount.toFixed(0)}€).`);
      setStep(4); // Show confirmation step
    } catch (e) {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const groupedServices = {
    podcast: services.filter(s => s.category === "podcast"),
    tv_set: services.filter(s => s.category === "tv_set")
  };

  const categoryLabels = {
    podcast: { label: "Podcast", icon: Mic },
    tv_set: { label: "Plateau TV", icon: Tv }
  };

  return (
    <div className="pt-20 min-h-screen" data-testid="booking-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-primary font-black text-4xl md:text-5xl tracking-tighter uppercase mb-4 text-center">
          <span className="text-gold-gradient">Réservation</span>
        </h1>
        <p className="font-secondary text-white/60 text-center mb-12">Réservez votre créneau en quelques clics</p>

        {/* Note for Wedding */}
        <div className="bg-card border border-primary/30 p-4 mb-8 text-center">
          <p className="text-sm text-white/70">
            Pour un <span className="text-primary font-semibold">mariage</span>, utilisez notre{" "}
            <Link to="/devis-mariage" className="text-primary underline hover:no-underline">
              configurateur de devis personnalisé
            </Link>
          </p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 flex items-center justify-center font-primary font-bold ${
                step >= s ? "bg-primary text-black" : "bg-card border border-white/20 text-white/40"
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-px ${step > s ? "bg-primary" : "bg-white/20"}`}></div>}
            </div>
          ))}
        </div>

        {/* Step 1: Service Selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="booking-step-1"
          >
            <h2 className="font-primary font-bold text-xl mb-6">Choisissez votre service</h2>
            
            {Object.entries(groupedServices).map(([cat, svcs]) => {
              if (svcs.length === 0) return null;
              const { label, icon: Icon } = categoryLabels[cat];
              return (
                <div key={cat} className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon size={20} className="text-primary" />
                    <h3 className="font-primary font-semibold text-lg">{label}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {svcs.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => { setSelectedService(service); setStep(2); }}
                        className={`bg-card border p-4 text-left transition-all hover:border-primary ${
                          selectedService?.id === service.id ? "border-primary" : "border-white/10"
                        }`}
                        data-testid={`select-service-${service.id}`}
                      >
                        <h4 className="font-primary font-semibold mb-1">{service.name}</h4>
                        <p className="text-primary font-bold">{service.price}€</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Step 2: Date Selection */}
        {step === 2 && selectedService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="booking-step-2"
          >
            <div className="bg-card border border-white/10 p-6 mb-8">
              <p className="text-white/60 text-sm">Service sélectionné</p>
              <h3 className="font-primary font-bold text-xl">{selectedService.name}</h3>
              <p className="text-primary font-bold">{selectedService.price}€</p>
            </div>

            <h2 className="font-primary font-bold text-xl mb-6">Choisissez une date</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block font-primary text-sm mb-2">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  data-testid="booking-date-input"
                />
              </div>
              <div>
                <label className="block font-primary text-sm mb-2">Heure souhaitée</label>
                <input
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  data-testid="booking-time-input"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="btn-outline px-8 py-3 text-sm">
                Retour
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.event_date}
                className="btn-primary px-8 py-3 text-sm flex-1 disabled:opacity-50"
                data-testid="booking-next-step-btn"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Contact Details */}
        {step === 3 && selectedService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="booking-step-3"
          >
            <div className="bg-card border border-white/10 p-6 mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/60 text-sm">Service sélectionné</p>
                  <h3 className="font-primary font-bold text-xl">{selectedService.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-sm">Date</p>
                  <p className="font-primary font-bold">{formData.event_date}</p>
                </div>
              </div>
            </div>

            <h2 className="font-primary font-bold text-xl mb-6">Vos coordonnées</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-primary text-sm mb-2">Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                    data-testid="booking-name-input"
                  />
                </div>
                <div>
                  <label className="block font-primary text-sm mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                    data-testid="booking-email-input"
                  />
                </div>
              </div>
              <div>
                <label className="block font-primary text-sm mb-2">Téléphone *</label>
                <input
                  type="tel"
                  required
                  value={formData.client_phone}
                  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  data-testid="booking-phone-input"
                />
              </div>
              <div>
                <label className="block font-primary text-sm mb-2">Message (optionnel)</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none resize-none"
                  placeholder="Décrivez votre projet ou vos besoins spécifiques..."
                  data-testid="booking-message-input"
                />
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setStep(2)} className="btn-outline px-8 py-3 text-sm">
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-8 py-3 text-sm flex-1 disabled:opacity-50"
                  data-testid="booking-submit-btn"
                >
                  {loading ? "Envoi..." : "Valider et recevoir les instructions de paiement"}
                </button>
              </div>
              
              {/* Price Info */}
              <div className="bg-primary/10 border border-primary/30 p-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Prix total</span>
                  <span className="font-primary font-bold text-xl">{selectedService.price}€</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-white/70">Acompte à régler (30%)</span>
                  <span className="font-primary font-bold text-2xl text-primary">{(selectedService.price * 0.3).toFixed(0)}€</span>
                </div>
                <p className="text-xs text-white/50 mt-3">
                  Vous recevrez un email avec les coordonnées bancaires pour effectuer le virement de l'acompte.
                </p>
              </div>
            </form>
          </motion.div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && selectedService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
            data-testid="booking-step-4"
          >
            <div className="bg-card border border-primary p-8 mb-8">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} className="text-primary" />
              </div>
              <h2 className="font-primary font-bold text-2xl mb-4">Réservation confirmée !</h2>
              <p className="text-white/70 mb-6">
                Un email a été envoyé à <span className="text-primary">{formData.client_email}</span> avec les instructions de paiement.
              </p>
              
              <div className="bg-background p-6 text-left mb-6">
                <h3 className="font-primary font-bold text-lg mb-4">Récapitulatif</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Service</span>
                    <span>{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Date</span>
                    <span>{formData.event_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Prix total</span>
                    <span>{selectedService.price}€</span>
                  </div>
                  <div className="flex justify-between text-primary font-bold">
                    <span>Acompte à régler</span>
                    <span>{(selectedService.price * 0.3).toFixed(0)}€</span>
                  </div>
                </div>
              </div>
              
              <p className="text-white/50 text-sm mb-6">
                Dès réception de votre virement, nous vous contacterons pour finaliser les détails.
              </p>
              
              <Link to="/" className="btn-primary px-8 py-3 text-sm inline-block">
                Retour à l'accueil
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;
