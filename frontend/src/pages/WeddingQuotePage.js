import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

const WeddingQuotePage = () => {
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    event_date: "",
    event_location: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await axios.get(`${API}/wedding-options`);
        setOptions(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchOptions();
  }, []);

  const toggleOption = (optionId) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const getSelectedOptionsData = () => {
    return options.filter(o => selectedOptions.includes(o.id));
  };

  const getTotalPrice = () => {
    return getSelectedOptionsData().reduce((sum, o) => sum + o.price, 0);
  };

  // Filter options based on search query
  const filterOptions = (opts) => {
    if (!searchQuery.trim()) return opts;
    const query = searchQuery.toLowerCase();
    return opts.filter(o => 
      o.name.toLowerCase().includes(query) || 
      o.description.toLowerCase().includes(query)
    );
  };

  const groupedOptions = {
    coverage: filterOptions(options.filter(o => o.category === "coverage")),
    extras: filterOptions(options.filter(o => o.category === "extras")),
    editing: filterOptions(options.filter(o => o.category === "editing"))
  };

  const categoryLabels = {
    coverage: { label: "Couverture", description: "Sélectionnez les moments à capturer" },
    extras: { label: "Options", description: "Ajoutez des prestations supplémentaires" },
    editing: { label: "Livrables", description: "Choisissez vos formats de livraison" }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedOptions.length === 0) {
      toast.error("Veuillez sélectionner au moins une option");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/wedding-quotes`, {
        ...formData,
        selected_options: selectedOptions
      });
      toast.success("Demande de devis envoyée ! Nous vous contacterons sous 24h.");
      navigate("/");
    } catch (e) {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen" data-testid="wedding-quote-page">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-primary font-black text-4xl md:text-5xl tracking-tighter uppercase mb-4">
            <span className="text-gold-gradient">Devis Mariage</span>
          </h1>
          <p className="font-secondary text-white/60">Créez votre formule sur-mesure en 3 étapes</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[
            { num: 1, label: "Options" },
            { num: 2, label: "Date" },
            { num: 3, label: "Coordonnées" }
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div 
                className={`flex flex-col items-center cursor-pointer`}
                onClick={() => s.num < step && setStep(s.num)}
              >
                <div className={`w-12 h-12 flex items-center justify-center font-primary font-bold text-lg ${
                  step >= s.num ? "bg-primary text-black" : "bg-card border border-white/20 text-white/40"
                }`}>
                  {s.num}
                </div>
                <span className={`text-xs mt-2 ${step >= s.num ? "text-primary" : "text-white/40"}`}>{s.label}</span>
              </div>
              {i < 2 && <div className={`w-16 h-px mx-2 ${step > s.num ? "bg-primary" : "bg-white/20"}`}></div>}
            </div>
          ))}
        </div>

        {/* Floating Total */}
        {selectedOptions.length > 0 && (
          <div className="fixed bottom-6 right-6 bg-card border border-primary p-4 shadow-2xl z-40" data-testid="quote-total">
            <p className="text-white/60 text-sm">Total estimé</p>
            <p className="font-primary font-black text-3xl text-gold-gradient">{getTotalPrice()}€</p>
            <p className="text-white/40 text-xs">{selectedOptions.length} option(s)</p>
          </div>
        )}

        {/* Step 1: Select Options */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="quote-step-1"
          >
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher une option (ex: drone, cérémonie, album...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-card border border-white/20 px-5 py-4 pl-12 text-sm focus:border-primary focus:outline-none"
                  data-testid="search-options"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-white/50 text-sm mt-2">
                  {Object.values(groupedOptions).flat().length} résultat(s) pour "{searchQuery}"
                </p>
              )}
            </div>

            {Object.entries(groupedOptions).map(([cat, opts]) => (
              <div key={cat} className={`mb-12 ${opts.length === 0 ? 'hidden' : ''}`}>
                <div className="mb-6">
                  <h2 className="font-primary font-bold text-xl mb-1">{categoryLabels[cat].label}</h2>
                  <p className="text-white/60 text-sm">{categoryLabels[cat].description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {opts.map((option) => {
                    const isSelected = selectedOptions.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => toggleOption(option.id)}
                        className={`p-6 text-left transition-all border ${
                          isSelected 
                            ? "bg-primary/10 border-primary" 
                            : "bg-card border-white/10 hover:border-white/30"
                        }`}
                        data-testid={`option-${option.id}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-primary font-semibold">{option.name}</h3>
                          <div className={`w-6 h-6 flex items-center justify-center ${
                            isSelected ? "bg-primary text-black" : "border border-white/30"
                          }`}>
                            {isSelected && <Check size={14} />}
                          </div>
                        </div>
                        <p className="text-white/60 text-sm mb-3">{option.description}</p>
                        <p className="font-primary font-bold text-primary">{option.price}€</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* No results message */}
            {searchQuery && Object.values(groupedOptions).flat().length === 0 && (
              <div className="text-center py-12">
                <p className="text-white/60">Aucune option trouvée pour "{searchQuery}"</p>
                <button 
                  onClick={() => setSearchQuery("")}
                  className="text-primary hover:underline mt-2"
                >
                  Effacer la recherche
                </button>
              </div>
            )}

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setStep(2)}
                disabled={selectedOptions.length === 0}
                className="btn-primary px-10 py-4 text-sm disabled:opacity-50"
                data-testid="quote-next-1"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Date & Location */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="quote-step-2"
          >
            {/* Summary */}
            <div className="bg-card border border-white/10 p-6 mb-8">
              <h3 className="font-primary font-bold mb-4">Récapitulatif</h3>
              <div className="space-y-2 mb-4">
                {getSelectedOptionsData().map(opt => (
                  <div key={opt.id} className="flex justify-between text-sm">
                    <span className="text-white/70">{opt.name}</span>
                    <span className="text-primary">{opt.price}€</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between">
                <span className="font-primary font-bold">Total</span>
                <span className="font-primary font-bold text-gold-gradient text-xl">{getTotalPrice()}€</span>
              </div>
            </div>

            <h2 className="font-primary font-bold text-xl mb-6">Date et lieu de l'événement</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block font-primary text-sm mb-2">Date du mariage *</label>
                <input
                  type="date"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  data-testid="quote-date-input"
                />
              </div>
              <div>
                <label className="block font-primary text-sm mb-2">Lieu (ville)</label>
                <input
                  type="text"
                  value={formData.event_location}
                  onChange={(e) => setFormData({ ...formData, event_location: e.target.value })}
                  placeholder="Ex: Paris, Lyon, Marseille..."
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  data-testid="quote-location-input"
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
                data-testid="quote-next-2"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Contact Details */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="quote-step-3"
          >
            {/* Summary */}
            <div className="bg-card border border-primary p-6 mb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-primary font-bold">Votre devis</h3>
                  <p className="text-white/60 text-sm">{formData.event_date} {formData.event_location && `• ${formData.event_location}`}</p>
                </div>
                <p className="font-primary font-black text-2xl text-gold-gradient">{getTotalPrice()}€</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {getSelectedOptionsData().map(opt => (
                  <span key={opt.id} className="bg-white/10 px-3 py-1 text-xs">{opt.name}</span>
                ))}
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
                    data-testid="quote-name-input"
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
                    data-testid="quote-email-input"
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
                  data-testid="quote-phone-input"
                />
              </div>
              <div>
                <label className="block font-primary text-sm mb-2">Message (optionnel)</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none resize-none"
                  placeholder="Décrivez votre mariage, vos attentes particulières..."
                  data-testid="quote-message-input"
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
                  data-testid="quote-submit-btn"
                >
                  {loading ? "Envoi..." : `Envoyer ma demande (${getTotalPrice()}€)`}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default WeddingQuotePage;
