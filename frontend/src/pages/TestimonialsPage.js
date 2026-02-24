import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Quote, Send, CheckCircle, Camera, Mic, Tv, LogIn, User, X } from "lucide-react";
import axios from "axios";
import { API, BACKEND_URL } from "../config/api";

const TestimonialsPage = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    client_role: "",
    message: "",
    rating: 5,
    service_type: ""
  });
  
  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Check if client is authenticated
  const [clientToken, setClientToken] = useState(localStorage.getItem("client_token"));
  const [isAuthenticated, setIsAuthenticated] = useState(!!clientToken);
  const headers = clientToken ? { Authorization: `Bearer ${clientToken}` } : {};
  
  // Get client info from localStorage
  const [clientInfo, setClientInfo] = useState(
    localStorage.getItem("client_info") 
      ? JSON.parse(localStorage.getItem("client_info")) 
      : null
  );

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const res = await axios.get(`${API}/testimonials`);
      setTestimonials(res.data);
    } catch (e) {
      console.error("Error fetching testimonials:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert("Vous devez être connecté pour laisser un témoignage");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/testimonials`, formData, { headers });
      setSubmitted(true);
      setFormData({
        client_role: "",
        message: "",
        rating: 5,
        service_type: ""
      });
    } catch (e) {
      console.error("Error submitting testimonial:", e);
      alert(e.response?.data?.detail || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const serviceIcons = {
    wedding: <Camera size={16} className="text-primary" />,
    podcast: <Mic size={16} className="text-primary" />,
    tv_set: <Tv size={16} className="text-primary" />
  };

  const serviceLabels = {
    wedding: "Mariage",
    podcast: "Podcast",
    tv_set: "Plateau TV"
  };

  return (
    <div className="min-h-screen bg-background" data-testid="testimonials-page">
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 spotlight opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="font-primary font-black text-5xl md:text-7xl tracking-tighter uppercase mb-6">
              <span className="text-gold-gradient">Témoignages</span>
            </h1>
            <p className="font-secondary text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              Découvrez ce que nos clients disent de leur expérience avec CREATIVINDUSTRY
            </p>
            
            {isAuthenticated ? (
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn-primary px-8 py-4 text-sm inline-flex items-center gap-2"
                data-testid="toggle-form-btn"
              >
                <Quote size={18} />
                Laisser un témoignage
              </button>
            ) : (
              <Link
                to="/espace-client"
                className="btn-primary px-8 py-4 text-sm inline-flex items-center gap-2"
                data-testid="login-btn"
              >
                <LogIn size={18} />
                Connectez-vous pour laisser un témoignage
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Testimonial Form - Only for authenticated clients */}
      {showForm && isAuthenticated && (
        <section className="py-12 bg-card border-y border-white/10" data-testid="testimonial-form-section">
          <div className="max-w-2xl mx-auto px-4">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
                <h3 className="font-primary font-bold text-2xl mb-4">Merci pour votre témoignage !</h3>
                <p className="text-white/60 mb-6">
                  Votre témoignage a été soumis avec succès. Il sera publié après validation par notre équipe.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setShowForm(false);
                  }}
                  className="btn-outline px-6 py-3 text-sm"
                >
                  Fermer
                </button>
              </motion.div>
            ) : (
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <h3 className="font-primary font-bold text-2xl text-center mb-8">
                  Partagez votre expérience
                </h3>

                {/* Client Info Display */}
                {clientInfo && (
                  <div className="flex items-center gap-4 p-4 bg-background/50 border border-white/10 mb-6">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
                      {clientInfo.profile_photo ? (
                        <img 
                          src={`${BACKEND_URL}${clientInfo.profile_photo}`} 
                          alt={clientInfo.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={24} className="text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white">{clientInfo.name}</p>
                      <p className="text-sm text-white/50">{clientInfo.email}</p>
                    </div>
                    <span className="ml-auto text-xs text-green-500 bg-green-500/20 px-3 py-1">
                      Connecté
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Votre rôle / Occasion
                    </label>
                    <input
                      type="text"
                      value={formData.client_role}
                      onChange={(e) => setFormData({...formData, client_role: e.target.value})}
                      className="w-full bg-background border border-white/20 px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                      placeholder="Mariés 2024, Podcasteur..."
                      data-testid="input-role"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Service utilisé
                    </label>
                    <select
                      value={formData.service_type}
                      onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                      className="w-full bg-background border border-white/20 px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                      data-testid="select-service"
                    >
                      <option value="">Sélectionnez un service</option>
                      <option value="wedding">Mariage</option>
                      <option value="podcast">Studio Podcast</option>
                      <option value="tv_set">Plateau TV</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Note *
                  </label>
                  <div className="flex gap-2" data-testid="rating-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({...formData, rating: star})}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          size={32}
                          className={star <= formData.rating ? "text-primary fill-primary" : "text-white/30"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Votre message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors resize-none"
                    placeholder="Partagez votre expérience avec CREATIVINDUSTRY..."
                    data-testid="input-message"
                  />
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-outline px-6 py-3 text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary px-8 py-3 text-sm inline-flex items-center gap-2 disabled:opacity-50"
                    data-testid="submit-testimonial-btn"
                  >
                    {submitting ? (
                      <>Envoi en cours...</>
                    ) : (
                      <>
                        <Send size={18} />
                        Envoyer mon témoignage
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        </section>
      )}

      {/* Testimonials Grid */}
      <section className="py-24" data-testid="testimonials-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-12 h-12 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-white/60 mt-4">Chargement des témoignages...</p>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="text-center py-20">
              <Quote size={64} className="text-white/20 mx-auto mb-6" />
              <h3 className="font-primary font-bold text-xl mb-2">Aucun témoignage pour le moment</h3>
              <p className="text-white/60">Soyez le premier à partager votre expérience !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border border-white/10 p-8 card-hover group relative"
                  data-testid={`testimonial-card-${index}`}
                >
                  {/* Quote decoration */}
                  <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Quote size={48} className="text-primary" />
                  </div>

                  {/* Client Avatar & Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
                      {testimonial.client_avatar ? (
                        <img 
                          src={`${BACKEND_URL}${testimonial.client_avatar}`} 
                          alt={testimonial.client_name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-primary" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-primary font-bold text-white">
                        {testimonial.client_name}
                      </h4>
                      {testimonial.client_role && (
                        <p className="text-white/50 text-xs">
                          {testimonial.client_role}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < testimonial.rating ? "text-primary fill-primary" : "text-white/20"}
                      />
                    ))}
                  </div>

                  {/* Message */}
                  <p className="font-secondary text-white/80 text-sm leading-relaxed mb-6 line-clamp-4">
                    "{testimonial.message}"
                  </p>

                  {/* Service badge */}
                  <div className="border-t border-white/10 pt-4 mt-auto">
                    <div className="flex items-center justify-between">
                      {testimonial.service_type && (
                        <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 border border-white/10">
                          {serviceIcons[testimonial.service_type]}
                          <span className="text-xs text-white/60">
                            {serviceLabels[testimonial.service_type]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Featured badge */}
                  {testimonial.featured && (
                    <div className="absolute -top-2 -left-2 bg-primary text-black text-xs font-bold px-3 py-1">
                      RECOMMANDÉ
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-card border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-primary font-bold text-3xl md:text-4xl mb-6">
              Prêt à vivre la même expérience ?
            </h2>
            <p className="font-secondary text-white/60 text-lg mb-10">
              Rejoignez nos clients satisfaits et créons ensemble vos moments d'exception.
            </p>
            <a href="/devis-mariage" className="btn-primary px-10 py-4 text-sm inline-block">
              Demander un devis
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default TestimonialsPage;
