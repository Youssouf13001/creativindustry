import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

const AppointmentPage = () => {
  const [step, setStep] = useState(1);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [durations, setDurations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    appointment_type: "",
    duration: "60",
    proposed_date: "",
    proposed_time: "",
    message: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await axios.get(`${API}/appointment-types`);
        setAppointmentTypes(res.data.types);
        setDurations(res.data.durations);
      } catch (e) {
        console.error("Error fetching appointment types");
      }
    };
    fetchTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/appointments`, formData);
      toast.success("Demande de rendez-vous envoyée ! Vérifiez votre email.");
      setStep(3);
    } catch (e) {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // Available time slots based on day
  const getAvailableTimeSlots = (date) => {
    if (!date) return [];
    const day = new Date(date).getDay();
    
    if (day === 0) { // Dimanche
      return ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
    } else if (day >= 1 && day <= 5) { // Lundi-Vendredi
      return ["18:00", "19:00", "20:00", "21:00"];
    }
    return []; // Samedi non disponible
  };

  const availableSlots = getAvailableTimeSlots(formData.proposed_date);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-primary font-bold text-3xl md:text-4xl tracking-tight mb-4">
            Prendre <span className="text-primary">rendez-vous</span>
          </h1>
          <p className="text-white/60">
            Rencontrez notre équipe dans nos locaux
          </p>
        </div>

        {/* Progress */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-4 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? "bg-primary text-background" : "bg-white/10 text-white/40"}`}>
                  {s}
                </div>
                {s < 2 && <div className={`w-12 h-0.5 ${step > s ? "bg-primary" : "bg-white/10"}`}></div>}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Select Type & Date */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="appointment-step-1">
            <h2 className="font-primary font-bold text-xl mb-6">Choisissez votre créneau</h2>
            
            <div className="space-y-6">
              {/* Appointment Type */}
              <div>
                <label className="block font-primary text-sm mb-3">Motif du rendez-vous *</label>
                <div className="grid grid-cols-1 gap-3">
                  {appointmentTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, appointment_type: type.id })}
                      className={`p-4 text-left border transition-all ${formData.appointment_type === type.id ? "bg-primary/20 border-primary" : "bg-card border-white/10 hover:border-white/30"}`}
                    >
                      <span className="font-primary">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block font-primary text-sm mb-3">Durée estimée *</label>
                <div className="flex gap-3">
                  {durations.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, duration: d.id })}
                      className={`flex-1 p-3 text-center border transition-all ${formData.duration === d.id ? "bg-primary/20 border-primary" : "bg-card border-white/10 hover:border-white/30"}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block font-primary text-sm mb-3">Date souhaitée *</label>
                <input
                  type="date"
                  value={formData.proposed_date}
                  onChange={(e) => setFormData({ ...formData, proposed_date: e.target.value, proposed_time: "" })}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  data-testid="appointment-date"
                />
                <p className="text-xs text-white/50 mt-2">
                  📅 Disponibilités : Lundi-Vendredi à partir de 18h, Dimanche toute la journée jusqu'à 17h
                </p>
              </div>

              {/* Time */}
              {formData.proposed_date && (
                <div>
                  <label className="block font-primary text-sm mb-3">Heure *</label>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setFormData({ ...formData, proposed_time: time })}
                          className={`p-3 text-center border transition-all ${formData.proposed_time === time ? "bg-primary text-background border-primary" : "bg-card border-white/10 hover:border-white/30"}`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-red-400 text-sm p-4 bg-red-500/10 border border-red-500/30">
                      ❌ Ce jour n'est pas disponible. Veuillez choisir un autre jour (Lundi-Vendredi ou Dimanche).
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!formData.appointment_type || !formData.proposed_date || !formData.proposed_time}
                className="btn-primary w-full py-4 disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Contact Info */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="appointment-step-2">
            {/* Summary */}
            <div className="bg-card border border-white/10 p-6 mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/60 text-sm">Rendez-vous</p>
                  <h3 className="font-primary font-bold text-lg">
                    {appointmentTypes.find(t => t.id === formData.appointment_type)?.label}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-sm">Date & Heure</p>
                  <p className="font-primary font-bold text-primary">{formData.proposed_date} à {formData.proposed_time}</p>
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
                />
              </div>
              <div>
                <label className="block font-primary text-sm mb-2">Message (optionnel)</label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none resize-none"
                  placeholder="Précisez le sujet de votre rendez-vous..."
                />
              </div>

              <div className="bg-primary/10 border border-primary/30 p-4">
                <p className="text-sm text-white/70">
                  📍 <strong>Lieu :</strong> Nos locaux CREATIVINDUSTRY<br/>
                  ⏱️ <strong>Durée :</strong> {durations.find(d => d.id === formData.duration)?.label}
                </p>
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setStep(1)} className="btn-outline px-8 py-3 text-sm">
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-8 py-3 text-sm flex-1 disabled:opacity-50"
                >
                  {loading ? "Envoi..." : "Envoyer la demande"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center" data-testid="appointment-step-3">
            <div className="bg-card border border-primary p-8">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar size={40} className="text-primary" />
              </div>
              <h2 className="font-primary font-bold text-2xl mb-4">Demande envoyée !</h2>
              <p className="text-white/70 mb-6">
                Votre demande de rendez-vous a été envoyée avec succès.<br/>
                Un email de confirmation a été envoyé à <span className="text-primary">{formData.client_email}</span>
              </p>
              
              <div className="bg-background p-6 text-left mb-6">
                <h3 className="font-primary font-bold text-lg mb-4">Récapitulatif</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Motif</span>
                    <span>{appointmentTypes.find(t => t.id === formData.appointment_type)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Date souhaitée</span>
                    <span>{formData.proposed_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Heure</span>
                    <span>{formData.proposed_time}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-white/50 text-sm mb-6">
                Notre équipe va examiner votre demande et vous enverra une confirmation par email.
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

export default AppointmentPage;
