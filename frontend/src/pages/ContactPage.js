import { useState } from "react";
import axios from "axios";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/contact`, formData);
      toast.success("Message envoyé ! Nous vous répondrons rapidement.");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (e) {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen" data-testid="contact-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-primary font-black text-4xl md:text-5xl tracking-tighter uppercase mb-4 text-center">
          <span className="text-gold-gradient">Contact</span>
        </h1>
        <p className="font-secondary text-white/60 text-center mb-12">Une question ? Un projet ? Parlons-en !</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-primary font-bold text-xl mb-6">Nos coordonnées</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Phone className="text-primary mt-1" size={20} />
                <div>
                  <p className="font-primary font-semibold">Téléphone</p>
                  <p className="text-white/60">+33 1 23 45 67 89</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="text-primary mt-1" size={20} />
                <div>
                  <p className="font-primary font-semibold">Email</p>
                  <p className="text-white/60">contact@creativindustry.fr</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="text-primary mt-1" size={20} />
                <div>
                  <p className="font-primary font-semibold">Adresse</p>
                  <p className="text-white/60">123 Rue de la Création<br />75001 Paris, France</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Clock className="text-primary mt-1" size={20} />
                <div>
                  <p className="font-primary font-semibold">Horaires</p>
                  <p className="text-white/60">Lun - Ven: 9h - 19h<br />Sam: Sur rendez-vous</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="contact-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-primary text-sm mb-2">Nom *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  data-testid="contact-name-input"
                />
              </div>
              <div>
                <label className="block font-primary text-sm mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  data-testid="contact-email-input"
                />
              </div>
            </div>
            <div>
              <label className="block font-primary text-sm mb-2">Téléphone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                data-testid="contact-phone-input"
              />
            </div>
            <div>
              <label className="block font-primary text-sm mb-2">Sujet *</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                data-testid="contact-subject-input"
              />
            </div>
            <div>
              <label className="block font-primary text-sm mb-2">Message *</label>
              <textarea
                rows={5}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none resize-none"
                data-testid="contact-message-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-sm disabled:opacity-50"
              data-testid="contact-submit-btn"
            >
              {loading ? "Envoi..." : "Envoyer le message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
