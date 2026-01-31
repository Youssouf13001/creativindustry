import { useState, useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Phone, Mail, MapPin, Check, Camera, Mic, Tv, Menu, X, ChevronRight, Play, ArrowRight, Clock, Users, FileText, Image, Video, Plus, Minus, MessageCircle, Send, Download, User, LogOut, FolderOpen, Upload, Loader } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ==================== HEADER ====================
const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Accueil", path: "/" },
    { name: "Mariages", path: "/services/wedding" },
    { name: "Podcast", path: "/services/podcast" },
    { name: "Plateau TV", path: "/services/tv_set" },
    { name: "Portfolio", path: "/portfolio" },
    { name: "Contact", path: "/contact" },
    { name: "Espace Client", path: "/client" },
  ];

  return (
    <header
      data-testid="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-black/90 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="font-primary font-black text-xl tracking-tighter" data-testid="logo-link">
            <span className="text-gold-gradient">CREATIVINDUSTRY</span>
            <span className="text-white/60 font-light ml-2">France</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                data-testid={`nav-${link.name.toLowerCase()}`}
                className={`font-primary text-sm tracking-wide transition-colors ${
                  location.pathname === link.path ? "text-primary" : "text-white/70 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            ))}
            <Link
              to="/devis-mariage"
              data-testid="nav-devis-btn"
              className="btn-primary px-6 py-3 text-sm"
            >
              Devis Mariage
            </Link>
          </nav>

          <button
            data-testid="mobile-menu-btn"
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10"
          >
            <nav className="flex flex-col p-6 gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className="font-primary text-lg text-white/80 hover:text-primary transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to="/devis-mariage"
                onClick={() => setIsMenuOpen(false)}
                className="btn-primary px-6 py-3 text-center mt-4"
              >
                Devis Mariage
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

// ==================== FOOTER ====================
const Footer = () => (
  <footer className="bg-black border-t border-white/10 py-16" data-testid="footer">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        <div>
          <h3 className="font-primary font-black text-xl mb-4">
            <span className="text-gold-gradient">CREATIVINDUSTRY</span>
          </h3>
          <p className="font-secondary text-white/60 text-sm leading-relaxed">
            Studio de production créative spécialisé dans la photographie et vidéographie de mariage, les podcasts et les productions télévisées.
          </p>
        </div>
        <div>
          <h4 className="font-primary font-bold text-sm uppercase tracking-wider mb-4">Services</h4>
          <ul className="space-y-2">
            <li><Link to="/services/wedding" className="text-white/60 hover:text-primary transition-colors text-sm">Mariages</Link></li>
            <li><Link to="/services/podcast" className="text-white/60 hover:text-primary transition-colors text-sm">Podcast</Link></li>
            <li><Link to="/services/tv_set" className="text-white/60 hover:text-primary transition-colors text-sm">Plateau TV</Link></li>
            <li><Link to="/portfolio" className="text-white/60 hover:text-primary transition-colors text-sm">Portfolio</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-primary font-bold text-sm uppercase tracking-wider mb-4">Contact</h4>
          <ul className="space-y-2 text-white/60 text-sm">
            <li className="flex items-center gap-2"><Phone size={14} /> +33 1 23 45 67 89</li>
            <li className="flex items-center gap-2"><Mail size={14} /> contact@creativindustry.fr</li>
            <li className="flex items-center gap-2"><MapPin size={14} /> Paris, France</li>
          </ul>
        </div>
        <div>
          <h4 className="font-primary font-bold text-sm uppercase tracking-wider mb-4">Légal</h4>
          <ul className="space-y-2">
            <li><Link to="/admin" className="text-white/60 hover:text-primary transition-colors text-sm">Admin</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 mt-12 pt-8 text-center text-white/40 text-sm">
        © 2024 CREATIVINDUSTRY France. Tous droits réservés.
      </div>
    </div>
  </footer>
);

// ==================== HOME PAGE ====================
const HomePage = () => {
  const [services, setServices] = useState([]);
  const [content, setContent] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, contentRes] = await Promise.all([
          axios.get(`${API}/services`),
          axios.get(`${API}/content`)
        ]);
        setServices(servicesRes.data);
        setContent(contentRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
    axios.post(`${API}/seed`).catch(() => {});
  }, []);

  // Default content while loading
  const c = content || {
    hero_title: "Créons vos moments d'exception",
    hero_subtitle: "Studio de production créative pour mariages, podcasts et productions télévisées.",
    hero_image: "https://images.unsplash.com/photo-1673195577797-d86fd842ade8?w=1920",
    wedding_title: "Mariages",
    wedding_description: "Photographie et vidéographie cinématique pour immortaliser votre jour le plus précieux.",
    wedding_image: "https://images.unsplash.com/photo-1644951565774-1b0904943820?w=800",
    podcast_title: "Podcast",
    podcast_description: "Studio d'enregistrement professionnel équipé pour vos podcasts et interviews.",
    podcast_image: "https://images.unsplash.com/photo-1659083725992-9d88c12e719c?w=800",
    tv_title: "Plateau TV",
    tv_description: "Plateaux de tournage équipés pour vos productions télévisées et corporate.",
    tv_image: "https://images.unsplash.com/photo-1643651342963-d4478284de5d?w=800",
    cta_title: "Prêt à créer quelque chose d'extraordinaire ?",
    cta_subtitle: "Contactez-nous pour discuter de votre projet et obtenir un devis personnalisé."
  };

  return (
    <div data-testid="home-page">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0">
          <img
            src={c.hero_image}
            alt="Hero background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70"></div>
          <div className="absolute inset-0 hero-gradient"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-primary font-black text-5xl md:text-7xl lg:text-8xl tracking-tighter uppercase mb-6">
              <span className="text-gold-gradient">{c.hero_title?.split(' ')[0]}</span> {c.hero_title?.split(' ').slice(1).join(' ')}
            </h1>
            <p className="font-secondary text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              {c.hero_subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/devis-mariage" className="btn-primary px-10 py-4 text-sm inline-flex items-center justify-center gap-2" data-testid="hero-devis-btn">
                Demander un devis <FileText size={18} />
              </Link>
              <Link to="/portfolio" className="btn-outline px-10 py-4 text-sm inline-flex items-center justify-center gap-2" data-testid="hero-portfolio-btn">
                Voir nos réalisations <Play size={18} />
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight size={32} className="text-white/50 rotate-90" />
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-24 md:py-32 relative" data-testid="services-overview">
        <div className="spotlight absolute inset-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-primary font-bold text-3xl md:text-5xl tracking-tight mb-4">Nos Services</h2>
            <p className="font-secondary text-white/60 text-lg max-w-xl mx-auto">
              Une expertise complète pour tous vos projets créatifs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Wedding Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-white/10 p-8 card-hover group"
              data-testid="service-card-wedding"
            >
              <div className="relative h-64 mb-6 overflow-hidden">
                <img
                  src={c.wedding_image}
                  alt="Wedding photography"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Camera className="text-primary" size={24} />
                <h3 className="font-primary font-bold text-xl">{c.wedding_title}</h3>
              </div>
              <p className="font-secondary text-white/60 text-sm mb-6">
                {c.wedding_description}
              </p>
              <div className="flex gap-2">
                <Link to="/services/wedding" className="btn-outline px-4 py-3 text-xs flex-1 text-center">
                  Formules
                </Link>
                <Link to="/devis-mariage" className="btn-primary px-4 py-3 text-xs flex-1 text-center">
                  Devis
                </Link>
              </div>
            </motion.div>

            {/* Podcast Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-white/10 p-8 card-hover group"
              data-testid="service-card-podcast"
            >
              <div className="relative h-64 mb-6 overflow-hidden">
                <img
                  src={c.podcast_image}
                  alt="Podcast studio"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Mic className="text-primary" size={24} />
                <h3 className="font-primary font-bold text-xl">{c.podcast_title}</h3>
              </div>
              <p className="font-secondary text-white/60 text-sm mb-6">
                {c.podcast_description}
              </p>
              <Link to="/services/podcast" className="btn-outline px-6 py-3 text-xs w-full inline-block text-center">
                Voir les formules
              </Link>
            </motion.div>

            {/* TV Set Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-white/10 p-8 card-hover group"
              data-testid="service-card-tv"
            >
              <div className="relative h-64 mb-6 overflow-hidden">
                <img
                  src={c.tv_image}
                  alt="TV production set"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Tv className="text-primary" size={24} />
                <h3 className="font-primary font-bold text-xl">{c.tv_title}</h3>
              </div>
              <p className="font-secondary text-white/60 text-sm mb-6">
                {c.tv_description}
              </p>
              <Link to="/services/tv_set" className="btn-outline px-6 py-3 text-xs w-full inline-block text-center">
                Voir les formules
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-card border-y border-white/10" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-primary font-bold text-3xl md:text-5xl tracking-tight mb-6">
              {c.cta_title}
            </h2>
            <p className="font-secondary text-white/60 text-lg mb-10">
              {c.cta_subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/devis-mariage" className="btn-primary px-10 py-4 text-sm" data-testid="cta-devis-btn">
                Devis Mariage Personnalisé
              </Link>
              <Link to="/contact" className="btn-outline px-10 py-4 text-sm" data-testid="cta-contact-btn">
                Nous contacter
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

// ==================== SERVICE PAGE ====================
const ServicePage = ({ category }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const fetchServices = async () => {
      try {
        const res = await axios.get(`${API}/services?category=${category}`);
        setServices(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [category]);

  return (
    <div className="pt-20" data-testid={`service-page-${category}`}>
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

                  <Link
                    to={category === "wedding" ? "/devis-mariage" : `/booking?service=${service.id}`}
                    className={`w-full inline-block text-center py-3 text-sm ${
                      index === 1 ? "btn-primary" : "btn-outline"
                    }`}
                    data-testid={`book-service-${service.id}`}
                  >
                    {category === "wedding" ? "Créer mon devis" : "Réserver"}
                  </Link>
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

// ==================== WEDDING QUOTE BUILDER ====================
const WeddingQuotePage = () => {
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [step, setStep] = useState(1);
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

  const groupedOptions = {
    coverage: options.filter(o => o.category === "coverage"),
    extras: options.filter(o => o.category === "extras"),
    editing: options.filter(o => o.category === "editing")
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
            {Object.entries(groupedOptions).map(([cat, opts]) => (
              <div key={cat} className="mb-12">
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

// ==================== PORTFOLIO PAGE ====================
const PortfolioPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "all", category: "all" });
  const [selectedItem, setSelectedItem] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    const category = params.get("category");
    if (type) setFilter(f => ({ ...f, type }));
    if (category) setFilter(f => ({ ...f, category }));
  }, [location]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        let url = `${API}/portfolio`;
        const params = [];
        if (filter.category !== "all") params.push(`category=${filter.category}`);
        if (filter.type !== "all") params.push(`media_type=${filter.type}`);
        if (params.length) url += `?${params.join("&")}`;
        
        const res = await axios.get(url);
        setItems(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [filter]);

  const photos = items.filter(i => i.media_type === "photo");
  const videos = items.filter(i => i.media_type === "video");

  return (
    <div className="pt-20 min-h-screen" data-testid="portfolio-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-primary font-black text-4xl md:text-5xl tracking-tighter uppercase mb-4">
            <span className="text-gold-gradient">Portfolio</span>
          </h1>
          <p className="font-secondary text-white/60">Découvrez nos réalisations</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <div className="flex gap-2">
            {[
              { value: "all", label: "Tout" },
              { value: "photo", label: "Photos" },
              { value: "video", label: "Vidéos" }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(f => ({ ...f, type: opt.value }))}
                className={`px-6 py-2 text-sm font-primary transition-colors ${
                  filter.type === opt.value 
                    ? "bg-primary text-black" 
                    : "bg-card border border-white/20 text-white/70 hover:border-primary"
                }`}
                data-testid={`filter-type-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[
              { value: "all", label: "Tous" },
              { value: "wedding", label: "Mariages" },
              { value: "podcast", label: "Podcast" },
              { value: "tv_set", label: "Plateau TV" }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(f => ({ ...f, category: opt.value }))}
                className={`px-6 py-2 text-sm font-primary transition-colors ${
                  filter.category === opt.value 
                    ? "bg-primary text-black" 
                    : "bg-card border border-white/20 text-white/70 hover:border-primary"
                }`}
                data-testid={`filter-cat-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-white/60">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-white/60 py-20">Aucun élément trouvé</div>
        ) : (
          <>
            {/* Photos Section */}
            {(filter.type === "all" || filter.type === "photo") && photos.length > 0 && (
              <section className="mb-16">
                {filter.type === "all" && (
                  <h2 className="font-primary font-bold text-2xl mb-8 flex items-center gap-3">
                    <Image className="text-primary" size={24} /> Photos
                  </h2>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative group cursor-pointer overflow-hidden aspect-square"
                      onClick={() => setSelectedItem(item)}
                      data-testid={`portfolio-photo-${item.id}`}
                    >
                      <img
                        src={item.media_url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <div>
                          <h3 className="font-primary font-semibold text-sm">{item.title}</h3>
                          {item.description && (
                            <p className="text-white/70 text-xs">{item.description}</p>
                          )}
                        </div>
                      </div>
                      {item.is_featured && (
                        <div className="absolute top-2 right-2 bg-primary text-black text-xs px-2 py-1 font-primary font-bold">
                          Featured
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Videos Section */}
            {(filter.type === "all" || filter.type === "video") && videos.length > 0 && (
              <section>
                {filter.type === "all" && (
                  <h2 className="font-primary font-bold text-2xl mb-8 flex items-center gap-3">
                    <Video className="text-primary" size={24} /> Vidéos
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-card border border-white/10 overflow-hidden card-hover"
                      data-testid={`portfolio-video-${item.id}`}
                    >
                      <div className="relative aspect-video">
                        {item.thumbnail_url ? (
                          <img
                            src={item.thumbnail_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-black/50 flex items-center justify-center">
                            <Play size={48} className="text-primary" />
                          </div>
                        )}
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <div className="w-16 h-16 bg-primary flex items-center justify-center">
                            <Play size={32} className="text-black ml-1" />
                          </div>
                        </button>
                      </div>
                      <div className="p-4">
                        <h3 className="font-primary font-semibold">{item.title}</h3>
                        {item.description && (
                          <p className="text-white/60 text-sm mt-1">{item.description}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
            data-testid="portfolio-lightbox"
          >
            <button
              className="absolute top-6 right-6 text-white/70 hover:text-white"
              onClick={() => setSelectedItem(null)}
            >
              <X size={32} />
            </button>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedItem.media_type === "photo" ? (
                <img
                  src={selectedItem.media_url}
                  alt={selectedItem.title}
                  className="w-full max-h-[80vh] object-contain"
                />
              ) : (
                <div className="aspect-video">
                  <iframe
                    src={selectedItem.media_url}
                    title={selectedItem.title}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              )}
              <div className="mt-4 text-center">
                <h3 className="font-primary font-bold text-xl">{selectedItem.title}</h3>
                {selectedItem.description && (
                  <p className="text-white/60 mt-2">{selectedItem.description}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==================== BOOKING PAGE ====================
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

// ==================== APPOINTMENT PAGE ====================
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

// ==================== APPOINTMENT CONFIRM PAGE ====================
const AppointmentConfirmPage = () => {
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const { appointmentId, token } = useParams();

  useEffect(() => {
    const confirmAppointment = async () => {
      try {
        const res = await axios.get(`${API}/appointments/confirm/${appointmentId}/${token}`);
        setData(res.data);
        setStatus("success");
      } catch (e) {
        setStatus("error");
      }
    };
    confirmAppointment();
  }, [appointmentId, token]);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        {status === "loading" && (
          <div>
            <Loader size={48} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-white/60">Confirmation en cours...</p>
          </div>
        )}
        
        {status === "success" && (
          <div className="bg-card border border-green-500 p-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-500" />
            </div>
            <h1 className="font-primary font-bold text-2xl mb-4 text-green-500">Rendez-vous confirmé !</h1>
            <p className="text-white/70 mb-6">
              Votre rendez-vous est confirmé pour le :
            </p>
            <div className="bg-green-500 text-background p-4 mb-6">
              <p className="text-2xl font-bold">{data?.date}</p>
              <p className="text-xl">{data?.time}</p>
            </div>
            <p className="text-white/50 text-sm mb-6">
              Un email de confirmation vous a été envoyé.
            </p>
            <Link to="/" className="btn-primary px-8 py-3 text-sm inline-block">
              Retour à l'accueil
            </Link>
          </div>
        )}
        
        {status === "error" && (
          <div className="bg-card border border-red-500 p-8">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <X size={40} className="text-red-500" />
            </div>
            <h1 className="font-primary font-bold text-2xl mb-4 text-red-500">Erreur</h1>
            <p className="text-white/70 mb-6">
              Ce lien n'est plus valide ou le rendez-vous a déjà été traité.
            </p>
            <Link to="/rendez-vous" className="btn-primary px-8 py-3 text-sm inline-block">
              Faire une nouvelle demande
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== CONTACT PAGE ====================
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

// ==================== ADMIN LOGIN ====================
const AdminLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister ? formData : { email: formData.email, password: formData.password };
      const res = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem("admin_token", res.data.token);
      localStorage.setItem("admin_user", JSON.stringify(res.data.admin));
      toast.success(isRegister ? "Compte créé !" : "Connexion réussie !");
      navigate("/admin/dashboard");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen flex items-center justify-center" data-testid="admin-login-page">
      <div className="w-full max-w-md p-8">
        <h1 className="font-primary font-black text-3xl tracking-tighter uppercase mb-2 text-center">
          <span className="text-gold-gradient">Admin</span>
        </h1>
        <p className="font-secondary text-white/60 text-center mb-8">
          {isRegister ? "Créer un compte administrateur" : "Connectez-vous pour gérer votre site"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <div>
              <label className="block font-primary text-sm mb-2">Nom</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                data-testid="admin-name-input"
              />
            </div>
          )}
          <div>
            <label className="block font-primary text-sm mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
              data-testid="admin-email-input"
            />
          </div>
          <div>
            <label className="block font-primary text-sm mb-2">Mot de passe</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
              data-testid="admin-password-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-sm disabled:opacity-50"
            data-testid="admin-submit-btn"
          >
            {loading ? "Chargement..." : isRegister ? "Créer le compte" : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-white/60 text-sm mt-6">
          {isRegister ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-primary hover:underline"
            data-testid="admin-toggle-auth"
          >
            {isRegister ? "Se connecter" : "Créer un compte"}
          </button>
        </p>
      </div>
    </div>
  );
};

// ==================== ADMIN DASHBOARD ====================
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [services, setServices] = useState([]);
  const [weddingOptions, setWeddingOptions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientFiles, setClientFiles] = useState([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddFile, setShowAddFile] = useState(false);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", password: "", phone: "" });
  const [newFile, setNewFile] = useState({ title: "", description: "", file_type: "video", file_url: "", thumbnail_url: "" });
  const [newPortfolioItem, setNewPortfolioItem] = useState({ title: "", description: "", media_type: "photo", media_url: "", thumbnail_url: "", category: "wedding", is_featured: false });
  const [siteContent, setSiteContent] = useState(null);
  const [editingContent, setEditingContent] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [editingService, setEditingService] = useState(null);
  const [editingOption, setEditingOption] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentResponse, setAppointmentResponse] = useState({ status: "", admin_response: "", new_proposed_date: "", new_proposed_time: "" });
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [uploadingClientFile, setUploadingClientFile] = useState(false);
  const portfolioFileRef = useRef(null);
  const clientFileRef = useRef(null);
  const [bankDetails, setBankDetails] = useState({ iban: "", bic: "", account_holder: "", bank_name: "", deposit_percentage: 30 });
  const navigate = useNavigate();

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }
    fetchData();
    fetchBankDetails();
  }, [token]);

  const fetchBankDetails = async () => {
    try {
      const res = await axios.get(`${API}/bank-details`);
      setBankDetails(res.data);
    } catch (e) {
      console.error("Error fetching bank details");
    }
  };

  const updateBankDetails = async () => {
    try {
      await axios.put(`${API}/bank-details`, bankDetails, { headers });
      toast.success("Coordonnées bancaires mises à jour !");
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, bookingsRes, quotesRes, servicesRes, optionsRes, messagesRes, portfolioRes, clientsRes, contentRes, appointmentsRes] = await Promise.all([
        axios.get(`${API}/stats`, { headers }),
        axios.get(`${API}/bookings`, { headers }),
        axios.get(`${API}/wedding-quotes`, { headers }),
        axios.get(`${API}/services?active_only=false`),
        axios.get(`${API}/wedding-options`),
        axios.get(`${API}/contact`, { headers }),
        axios.get(`${API}/admin/portfolio`, { headers }),
        axios.get(`${API}/admin/clients`, { headers }),
        axios.get(`${API}/content`),
        axios.get(`${API}/appointments`, { headers })
      ]);
      setStats(statsRes.data);
      setBookings(bookingsRes.data);
      setQuotes(quotesRes.data);
      setServices(servicesRes.data);
      setWeddingOptions(optionsRes.data);
      setMessages(messagesRes.data);
      setPortfolio(portfolioRes.data);
      setClients(clientsRes.data);
      setSiteContent(contentRes.data);
      setEditingContent(contentRes.data);
      setAppointments(appointmentsRes.data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem("admin_token");
        navigate("/admin");
      }
    }
  };

  const updateBookingStatus = async (id, status) => {
    try {
      await axios.put(`${API}/bookings/${id}`, { status }, { headers });
      toast.success("Statut mis à jour");
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const updateQuoteStatus = async (id, status) => {
    try {
      await axios.put(`${API}/wedding-quotes/${id}/status?status=${status}`, {}, { headers });
      toast.success("Statut mis à jour");
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const updateService = async (id, data) => {
    try {
      await axios.put(`${API}/services/${id}`, data, { headers });
      toast.success("Service mis à jour");
      setEditingService(null);
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const updateWeddingOption = async (id, data) => {
    try {
      await axios.put(`${API}/wedding-options/${id}`, data, { headers });
      toast.success("Option mise à jour");
      setEditingOption(null);
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const createClient = async () => {
    try {
      await axios.post(`${API}/admin/clients`, newClient, { headers });
      toast.success("Client créé");
      setShowAddClient(false);
      setNewClient({ name: "", email: "", password: "", phone: "" });
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  const selectClient = async (client) => {
    setSelectedClient(client);
    try {
      const res = await axios.get(`${API}/admin/clients/${client.id}/files`, { headers });
      setClientFiles(res.data);
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const addFileToClient = async () => {
    if (!selectedClient) return;
    try {
      await axios.post(`${API}/client/files`, { ...newFile, client_id: selectedClient.id }, { headers });
      toast.success("Fichier ajouté");
      setShowAddFile(false);
      setNewFile({ title: "", description: "", file_type: "video", file_url: "", thumbnail_url: "" });
      selectClient(selectedClient);
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const deleteFile = async (fileId) => {
    try {
      await axios.delete(`${API}/client/files/${fileId}`, { headers });
      toast.success("Fichier supprimé");
      selectClient(selectedClient);
    } catch (e) {
      toast.error("Erreur");
    }
  };

  // Site Content Functions
  const updateSiteContent = async () => {
    try {
      await axios.put(`${API}/content`, editingContent, { headers });
      toast.success("Contenu mis à jour !");
      fetchData();
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Portfolio Functions
  // Upload Portfolio File
  const handlePortfolioFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Type de fichier non supporté. Utilisez JPG, PNG, WEBP, GIF, MP4, WEBM ou MOV.");
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 100 Mo)");
      return;
    }
    
    setUploadingPortfolio(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API}/upload/portfolio`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrl = `${BACKEND_URL}${res.data.url}`;
      setNewPortfolioItem({ 
        ...newPortfolioItem, 
        media_url: uploadedUrl, 
        media_type: res.data.media_type,
        thumbnail_url: res.data.media_type === 'photo' ? uploadedUrl : ''
      });
      toast.success("Fichier uploadé !");
    } catch (e) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingPortfolio(false);
    }
  };

  // Upload Client File
  const handleClientFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!selectedClient) {
      toast.error("Sélectionnez d'abord un client");
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Type de fichier non supporté. Utilisez JPG, PNG, WEBP, GIF, MP4, WEBM ou MOV.");
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 100 Mo)");
      return;
    }
    
    const title = prompt("Titre du fichier:", file.name.split('.')[0]);
    if (!title) return;
    
    setUploadingClientFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', '');
    
    try {
      await axios.post(`${API}/upload/client/${selectedClient.id}`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Fichier uploadé et client notifié par email !");
      selectClient(selectedClient);
    } catch (e) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingClientFile(false);
    }
  };

  const createPortfolioItem = async () => {
    try {
      await axios.post(`${API}/admin/portfolio`, newPortfolioItem, { headers });
      toast.success("Élément ajouté au portfolio");
      setShowAddPortfolio(false);
      setNewPortfolioItem({ title: "", description: "", media_type: "photo", media_url: "", thumbnail_url: "", category: "wedding", is_featured: false });
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const updatePortfolioItem = async (id, data) => {
    try {
      await axios.put(`${API}/admin/portfolio/${id}`, data, { headers });
      toast.success("Portfolio mis à jour");
      setEditingPortfolio(null);
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const deletePortfolioItem = async (id) => {
    if (!window.confirm("Supprimer cet élément ?")) return;
    try {
      await axios.delete(`${API}/admin/portfolio/${id}`, { headers });
      toast.success("Élément supprimé");
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    navigate("/admin");
  };

  // Appointment functions
  const respondToAppointment = async (appointmentId, response) => {
    try {
      await axios.put(`${API}/appointments/${appointmentId}`, response, { headers });
      toast.success(
        response.status === "confirmed" ? "Rendez-vous confirmé ! Email envoyé au client." :
        response.status === "refused" ? "Rendez-vous refusé. Email envoyé au client." :
        "Nouvelle date proposée ! Email envoyé au client."
      );
      setSelectedAppointment(null);
      setAppointmentResponse({ status: "", admin_response: "", new_proposed_date: "", new_proposed_time: "" });
      fetchData();
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const appointmentStatusColors = {
    pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    confirmed: "bg-green-500/20 text-green-500 border-green-500/30",
    refused: "bg-red-500/20 text-red-500 border-red-500/30",
    rescheduled_pending: "bg-orange-500/20 text-orange-500 border-orange-500/30"
  };

  const appointmentStatusLabels = {
    pending: "En attente",
    confirmed: "Confirmé",
    refused: "Refusé",
    rescheduled_pending: "Nouvelle date proposée"
  };

  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-500",
    confirmed: "bg-green-500/20 text-green-500",
    cancelled: "bg-red-500/20 text-red-500"
  };

  const statusLabels = {
    pending: "En attente",
    confirmed: "Confirmé",
    cancelled: "Annulé"
  };

  return (
    <div className="pt-20 min-h-screen" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-primary font-black text-3xl tracking-tighter uppercase">
            <span className="text-gold-gradient">Dashboard</span>
          </h1>
          <button onClick={logout} className="btn-outline px-6 py-2 text-sm" data-testid="admin-logout-btn">
            Déconnexion
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">Réservations</p>
              <p className="font-primary font-black text-3xl text-gold-gradient">{stats.total_bookings}</p>
            </div>
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">Devis Mariage</p>
              <p className="font-primary font-black text-3xl text-pink-500">{stats.pending_quotes || 0}</p>
            </div>
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">En attente</p>
              <p className="font-primary font-black text-3xl text-yellow-500">{stats.pending_bookings}</p>
            </div>
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">Confirmées</p>
              <p className="font-primary font-black text-3xl text-green-500">{stats.confirmed_bookings}</p>
            </div>
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">Messages</p>
              <p className="font-primary font-black text-3xl text-blue-500">{stats.unread_messages}</p>
            </div>
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">Services</p>
              <p className="font-primary font-black text-3xl">{stats.total_services}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto">
          {[
            { id: "overview", label: "Aperçu" },
            { id: "content", label: "Contenu Site" },
            { id: "portfolio", label: "Portfolio" },
            { id: "quotes", label: "Devis Mariage" },
            { id: "bookings", label: "Réservations" },
            { id: "clients", label: "Clients" },
            { id: "services", label: "Services" },
            { id: "options", label: "Options Mariage" },
            { id: "messages", label: "Messages" },
            { id: "appointments", label: "Rendez-vous" },
            { id: "settings", label: "Paramètres" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-primary text-sm uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-white/60 hover:text-white"
              }`}
              data-testid={`admin-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Site Content Tab */}
        {activeTab === "content" && siteContent && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-primary font-bold text-xl">Modifier le contenu du site</h2>
              <button onClick={updateSiteContent} className="btn-primary px-6 py-2 text-sm">
                Enregistrer les modifications
              </button>
            </div>

            {/* Hero Section */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-primary">Section Hero (Accueil)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titre principal</label>
                  <input
                    type="text"
                    value={editingContent.hero_title || ""}
                    onChange={(e) => setEditingContent({...editingContent, hero_title: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Sous-titre</label>
                  <input
                    type="text"
                    value={editingContent.hero_subtitle || ""}
                    onChange={(e) => setEditingContent({...editingContent, hero_subtitle: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Image de fond (URL)</label>
                  <input
                    type="url"
                    value={editingContent.hero_image || ""}
                    onChange={(e) => setEditingContent({...editingContent, hero_image: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                    placeholder="https://..."
                  />
                  {editingContent.hero_image && (
                    <img src={editingContent.hero_image} alt="Preview" className="mt-2 h-32 object-cover" />
                  )}
                </div>
              </div>
            </div>

            {/* Wedding Section */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-pink-400">Service Mariage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titre</label>
                  <input
                    type="text"
                    value={editingContent.wedding_title || ""}
                    onChange={(e) => setEditingContent({...editingContent, wedding_title: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Sous-titre</label>
                  <input
                    type="text"
                    value={editingContent.wedding_subtitle || ""}
                    onChange={(e) => setEditingContent({...editingContent, wedding_subtitle: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Description</label>
                  <textarea
                    value={editingContent.wedding_description || ""}
                    onChange={(e) => setEditingContent({...editingContent, wedding_description: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Image (URL)</label>
                  <input
                    type="url"
                    value={editingContent.wedding_image || ""}
                    onChange={(e) => setEditingContent({...editingContent, wedding_image: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                  {editingContent.wedding_image && (
                    <img src={editingContent.wedding_image} alt="Preview" className="mt-2 h-32 object-cover" />
                  )}
                </div>
              </div>
            </div>

            {/* Podcast Section */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-blue-400">Service Podcast</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titre</label>
                  <input
                    type="text"
                    value={editingContent.podcast_title || ""}
                    onChange={(e) => setEditingContent({...editingContent, podcast_title: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Sous-titre</label>
                  <input
                    type="text"
                    value={editingContent.podcast_subtitle || ""}
                    onChange={(e) => setEditingContent({...editingContent, podcast_subtitle: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Description</label>
                  <textarea
                    value={editingContent.podcast_description || ""}
                    onChange={(e) => setEditingContent({...editingContent, podcast_description: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Image (URL)</label>
                  <input
                    type="url"
                    value={editingContent.podcast_image || ""}
                    onChange={(e) => setEditingContent({...editingContent, podcast_image: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                  {editingContent.podcast_image && (
                    <img src={editingContent.podcast_image} alt="Preview" className="mt-2 h-32 object-cover" />
                  )}
                </div>
              </div>
            </div>

            {/* TV Section */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-purple-400">Service Plateau TV</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titre</label>
                  <input
                    type="text"
                    value={editingContent.tv_title || ""}
                    onChange={(e) => setEditingContent({...editingContent, tv_title: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Sous-titre</label>
                  <input
                    type="text"
                    value={editingContent.tv_subtitle || ""}
                    onChange={(e) => setEditingContent({...editingContent, tv_subtitle: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Description</label>
                  <textarea
                    value={editingContent.tv_description || ""}
                    onChange={(e) => setEditingContent({...editingContent, tv_description: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Image (URL)</label>
                  <input
                    type="url"
                    value={editingContent.tv_image || ""}
                    onChange={(e) => setEditingContent({...editingContent, tv_image: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                  {editingContent.tv_image && (
                    <img src={editingContent.tv_image} alt="Preview" className="mt-2 h-32 object-cover" />
                  )}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-green-400">Informations de Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Téléphone</label>
                  <input
                    type="text"
                    value={editingContent.phone || ""}
                    onChange={(e) => setEditingContent({...editingContent, phone: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Email</label>
                  <input
                    type="email"
                    value={editingContent.email || ""}
                    onChange={(e) => setEditingContent({...editingContent, email: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Adresse</label>
                  <input
                    type="text"
                    value={editingContent.address || ""}
                    onChange={(e) => setEditingContent({...editingContent, address: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Horaires</label>
                  <input
                    type="text"
                    value={editingContent.hours || ""}
                    onChange={(e) => setEditingContent({...editingContent, hours: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-yellow-400">Section Appel à l'action</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titre CTA</label>
                  <input
                    type="text"
                    value={editingContent.cta_title || ""}
                    onChange={(e) => setEditingContent({...editingContent, cta_title: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Sous-titre CTA</label>
                  <input
                    type="text"
                    value={editingContent.cta_subtitle || ""}
                    onChange={(e) => setEditingContent({...editingContent, cta_subtitle: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
              </div>
            </div>

            <button onClick={updateSiteContent} className="btn-primary w-full py-4 text-sm">
              Enregistrer toutes les modifications
            </button>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === "portfolio" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-primary font-bold text-xl">Gérer le Portfolio</h2>
              <button
                onClick={() => setShowAddPortfolio(true)}
                className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
              >
                <Plus size={16} /> Ajouter
              </button>
            </div>

            {/* Add Portfolio Modal */}
            {showAddPortfolio && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-white/10 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <h3 className="font-primary font-bold text-xl mb-4">Ajouter au Portfolio</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Titre"
                      value={newPortfolioItem.title}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <textarea
                      placeholder="Description"
                      value={newPortfolioItem.description}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, description: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                      rows={2}
                    />
                    <select
                      value={newPortfolioItem.category}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, category: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    >
                      <option value="wedding">Mariage</option>
                      <option value="podcast">Podcast</option>
                      <option value="tv_set">Plateau TV</option>
                    </select>
                    
                    {/* Upload Section */}
                    <div className="border-2 border-dashed border-primary/50 p-4 text-center bg-primary/5">
                      <input
                        type="file"
                        ref={portfolioFileRef}
                        onChange={handlePortfolioFileUpload}
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => portfolioFileRef.current?.click()}
                        disabled={uploadingPortfolio}
                        className="btn-primary px-6 py-3 w-full flex items-center justify-center gap-2"
                      >
                        {uploadingPortfolio ? (
                          <>
                            <Loader size={16} className="animate-spin" /> Upload en cours...
                          </>
                        ) : (
                          <>
                            <Upload size={16} /> Uploader une photo/vidéo
                          </>
                        )}
                      </button>
                      <p className="text-xs text-white/50 mt-2">JPG, PNG, WEBP, GIF, MP4, WEBM, MOV (max 100 Mo)</p>
                    </div>
                    
                    {/* Preview uploaded file */}
                    {newPortfolioItem.media_url && (
                      <div className="relative">
                        <p className="text-sm text-white/60 mb-2">Aperçu :</p>
                        {newPortfolioItem.media_type === 'photo' ? (
                          <img src={newPortfolioItem.media_url} alt="Preview" className="w-full h-40 object-cover" />
                        ) : (
                          <video src={newPortfolioItem.media_url} className="w-full h-40 object-cover" controls />
                        )}
                      </div>
                    )}
                    
                    <div className="text-white/40 text-center text-sm">— ou —</div>
                    
                    <input
                      type="url"
                      placeholder="URL externe (YouTube, Vimeo, etc.)"
                      value={newPortfolioItem.media_url}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, media_url: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <input
                      type="url"
                      placeholder="URL miniature (optionnel, pour vidéos)"
                      value={newPortfolioItem.thumbnail_url}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, thumbnail_url: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <select
                      value={newPortfolioItem.media_type}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, media_type: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    >
                      <option value="photo">Photo</option>
                      <option value="video">Vidéo</option>
                    </select>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newPortfolioItem.is_featured}
                        onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, is_featured: e.target.checked })}
                        className="accent-primary"
                      />
                      <span className="text-sm">Mettre en avant</span>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddPortfolio(false)} className="btn-outline flex-1 py-3">
                        Annuler
                      </button>
                      <button onClick={createPortfolioItem} className="btn-primary flex-1 py-3">
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Portfolio Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio.map((item) => (
                <div key={item.id} className="bg-card border border-white/10 overflow-hidden" data-testid={`portfolio-admin-${item.id}`}>
                  <div className="relative aspect-video bg-black/50">
                    {item.media_type === "photo" ? (
                      <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <img src={item.thumbnail_url || item.media_url} alt={item.title} className="w-full h-full object-cover" />
                    )}
                    {item.is_featured && (
                      <span className="absolute top-2 right-2 bg-primary text-black text-xs px-2 py-1 font-bold">Featured</span>
                    )}
                    <span className={`absolute top-2 left-2 text-xs px-2 py-1 font-bold ${
                      item.category === "wedding" ? "bg-pink-500" : item.category === "podcast" ? "bg-blue-500" : "bg-purple-500"
                    }`}>
                      {item.category === "wedding" ? "Mariage" : item.category === "podcast" ? "Podcast" : "Plateau TV"}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {item.media_type === "photo" ? <Image size={16} className="text-primary" /> : <Video size={16} className="text-primary" />}
                      <h3 className="font-primary font-semibold text-sm truncate">{item.title}</h3>
                    </div>
                    {item.description && (
                      <p className="text-white/60 text-xs mb-3 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => updatePortfolioItem(item.id, { is_featured: !item.is_featured })}
                        className={`flex-1 py-2 text-xs ${item.is_featured ? "btn-primary" : "btn-outline"}`}
                      >
                        {item.is_featured ? "★ Featured" : "☆ Feature"}
                      </button>
                      <button
                        onClick={() => updatePortfolioItem(item.id, { is_active: !item.is_active })}
                        className={`flex-1 py-2 text-xs ${item.is_active !== false ? "bg-green-500/20 text-green-500 border border-green-500/50" : "bg-red-500/20 text-red-500 border border-red-500/50"}`}
                      >
                        {item.is_active !== false ? "Actif" : "Inactif"}
                      </button>
                      <button
                        onClick={() => deletePortfolioItem(item.id)}
                        className="px-3 py-2 text-xs bg-red-500/20 text-red-500 border border-red-500/50"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {portfolio.length === 0 && (
              <p className="text-center text-white/60 py-12">Aucun élément dans le portfolio</p>
            )}
          </div>
        )}

        {/* Wedding Quotes Tab */}
        {(activeTab === "overview" || activeTab === "quotes") && (
          <div className="mb-12">
            <h2 className="font-primary font-bold text-xl mb-4">Demandes de devis mariage</h2>
            <div className="bg-card border border-white/10 overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-black/50">
                  <tr>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Client</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Date</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Options</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Total</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Statut</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.slice(0, activeTab === "overview" ? 5 : 50).map((quote) => (
                    <tr key={quote.id} className="border-t border-white/10" data-testid={`quote-row-${quote.id}`}>
                      <td className="p-4">
                        <p className="font-semibold">{quote.client_name}</p>
                        <p className="text-white/60 text-sm">{quote.client_email}</p>
                        <p className="text-white/40 text-xs">{quote.client_phone}</p>
                      </td>
                      <td className="p-4">
                        <p>{quote.event_date}</p>
                        {quote.event_location && <p className="text-white/60 text-sm">{quote.event_location}</p>}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {quote.options_details?.slice(0, 3).map((opt, i) => (
                            <span key={i} className="bg-white/10 px-2 py-0.5 text-xs">{opt.name}</span>
                          ))}
                          {quote.options_details?.length > 3 && (
                            <span className="text-white/40 text-xs">+{quote.options_details.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-primary font-bold text-gold-gradient">{quote.total_price}€</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-semibold ${statusColors[quote.status]}`}>
                          {statusLabels[quote.status]}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={quote.status}
                          onChange={(e) => updateQuoteStatus(quote.id, e.target.value)}
                          className="bg-background border border-white/20 px-2 py-1 text-sm"
                          data-testid={`quote-status-select-${quote.id}`}
                        >
                          <option value="pending">En attente</option>
                          <option value="confirmed">Confirmé</option>
                          <option value="cancelled">Annulé</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quotes.length === 0 && (
                <p className="text-center text-white/60 py-8">Aucun devis</p>
              )}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {(activeTab === "overview" || activeTab === "bookings") && (
          <div className="mb-12">
            <h2 className="font-primary font-bold text-xl mb-4">Réservations (Podcast/TV)</h2>
            <div className="bg-card border border-white/10 overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-black/50">
                  <tr>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Client</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Service</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Date</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Statut</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, activeTab === "overview" ? 5 : 50).map((booking) => (
                    <tr key={booking.id} className="border-t border-white/10" data-testid={`booking-row-${booking.id}`}>
                      <td className="p-4">
                        <p className="font-semibold">{booking.client_name}</p>
                        <p className="text-white/60 text-sm">{booking.client_email}</p>
                      </td>
                      <td className="p-4">
                        <p>{booking.service_name}</p>
                        <p className="text-white/60 text-sm capitalize">{booking.service_category === "tv_set" ? "Plateau TV" : booking.service_category}</p>
                      </td>
                      <td className="p-4">{booking.event_date}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-semibold ${statusColors[booking.status]}`}>
                          {statusLabels[booking.status]}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={booking.status}
                          onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                          className="bg-background border border-white/20 px-2 py-1 text-sm"
                          data-testid={`booking-status-select-${booking.id}`}
                        >
                          <option value="pending">En attente</option>
                          <option value="confirmed">Confirmé</option>
                          <option value="cancelled">Annulé</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookings.length === 0 && (
                <p className="text-center text-white/60 py-8">Aucune réservation</p>
              )}
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          <div>
            <h2 className="font-primary font-bold text-xl mb-4">Gestion des services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <div key={service.id} className="bg-card border border-white/10 p-6" data-testid={`service-card-admin-${service.id}`}>
                  {editingService === service.id ? (
                    <EditServiceForm
                      service={service}
                      onSave={(data) => updateService(service.id, data)}
                      onCancel={() => setEditingService(null)}
                    />
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className={`text-xs uppercase tracking-wider ${
                            service.category === "wedding" ? "text-pink-400" :
                            service.category === "podcast" ? "text-blue-400" : "text-purple-400"
                          }`}>
                            {service.category === "wedding" ? "Mariage" :
                             service.category === "podcast" ? "Podcast" : "Plateau TV"}
                          </span>
                          <h3 className="font-primary font-bold text-lg">{service.name}</h3>
                        </div>
                        <span className={`text-xs px-2 py-1 ${service.is_active ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                          {service.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm mb-4">{service.description}</p>
                      <p className="font-primary font-black text-2xl text-gold-gradient mb-4">{service.price}€</p>
                      <button
                        onClick={() => setEditingService(service.id)}
                        className="btn-outline w-full py-2 text-xs"
                        data-testid={`edit-service-${service.id}`}
                      >
                        Modifier
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wedding Options Tab */}
        {activeTab === "options" && (
          <div>
            <h2 className="font-primary font-bold text-xl mb-4">Options du devis mariage</h2>
            {["coverage", "extras", "editing"].map(cat => {
              const catOptions = weddingOptions.filter(o => o.category === cat);
              const labels = { coverage: "Couverture", extras: "Options", editing: "Livrables" };
              return (
                <div key={cat} className="mb-8">
                  <h3 className="font-primary font-semibold text-lg mb-4">{labels[cat]}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catOptions.map(option => (
                      <div key={option.id} className="bg-card border border-white/10 p-4" data-testid={`option-admin-${option.id}`}>
                        {editingOption === option.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              defaultValue={option.name}
                              className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
                              id={`edit-name-${option.id}`}
                            />
                            <input
                              type="number"
                              defaultValue={option.price}
                              className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
                              id={`edit-price-${option.id}`}
                            />
                            <div className="flex gap-2">
                              <button onClick={() => setEditingOption(null)} className="btn-outline flex-1 py-2 text-xs">
                                Annuler
                              </button>
                              <button 
                                onClick={() => {
                                  const name = document.getElementById(`edit-name-${option.id}`).value;
                                  const price = parseFloat(document.getElementById(`edit-price-${option.id}`).value);
                                  updateWeddingOption(option.id, { name, price });
                                }}
                                className="btn-primary flex-1 py-2 text-xs"
                              >
                                Sauver
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start">
                              <h4 className="font-primary font-semibold">{option.name}</h4>
                              <span className="font-primary font-bold text-primary">{option.price}€</span>
                            </div>
                            <p className="text-white/60 text-sm mt-1 mb-3">{option.description}</p>
                            <button
                              onClick={() => setEditingOption(option.id)}
                              className="text-primary text-xs hover:underline"
                            >
                              Modifier
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === "clients" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-primary font-bold text-xl">Gestion des Clients</h2>
              <button
                onClick={() => setShowAddClient(true)}
                className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
              >
                <Plus size={16} /> Nouveau Client
              </button>
            </div>

            {/* Add Client Modal */}
            {showAddClient && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-white/10 p-6 w-full max-w-md">
                  <h3 className="font-primary font-bold text-xl mb-4">Nouveau Client</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Nom complet"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <input
                      type="password"
                      placeholder="Mot de passe"
                      value={newClient.password}
                      onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <input
                      type="tel"
                      placeholder="Téléphone"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddClient(false)} className="btn-outline flex-1 py-3">
                        Annuler
                      </button>
                      <button onClick={createClient} className="btn-primary flex-1 py-3">
                        Créer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client List */}
              <div>
                <h3 className="font-primary font-semibold mb-4">Liste des clients ({clients.length})</h3>
                <div className="space-y-2">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => selectClient(client)}
                      className={`w-full text-left bg-card border p-4 transition-colors ${
                        selectedClient?.id === client.id ? "border-primary" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <p className="font-primary font-semibold">{client.name}</p>
                      <p className="text-white/60 text-sm">{client.email}</p>
                    </button>
                  ))}
                  {clients.length === 0 && (
                    <p className="text-center text-white/60 py-8">Aucun client</p>
                  )}
                </div>
              </div>

              {/* Client Files */}
              {selectedClient && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-primary font-semibold">Fichiers de {selectedClient.name}</h3>
                    <button
                      onClick={() => setShowAddFile(true)}
                      className="btn-outline px-4 py-2 text-xs flex items-center gap-2"
                    >
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>

                  {/* Add File Modal */}
                  {showAddFile && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                      <div className="bg-card border border-white/10 p-6 w-full max-w-md">
                        <h3 className="font-primary font-bold text-xl mb-4">Ajouter un fichier</h3>
                        <div className="space-y-4">
                          
                          {/* Upload Section */}
                          <div className="border-2 border-dashed border-primary/50 p-4 text-center bg-primary/5">
                            <input
                              type="file"
                              ref={clientFileRef}
                              onChange={handleClientFileUpload}
                              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => clientFileRef.current?.click()}
                              disabled={uploadingClientFile}
                              className="btn-primary px-6 py-3 w-full flex items-center justify-center gap-2"
                            >
                              {uploadingClientFile ? (
                                <>
                                  <Loader size={16} className="animate-spin" /> Upload en cours...
                                </>
                              ) : (
                                <>
                                  <Upload size={16} /> Uploader un fichier
                                </>
                              )}
                            </button>
                            <p className="text-xs text-white/50 mt-2">JPG, PNG, MP4, WEBM, MOV (max 100 Mo)</p>
                            <p className="text-xs text-green-400 mt-1">Le client sera notifié par email !</p>
                          </div>
                          
                          <div className="text-white/40 text-center text-sm">— ou lien externe —</div>
                          
                          <input
                            type="text"
                            placeholder="Titre"
                            value={newFile.title}
                            onChange={(e) => setNewFile({ ...newFile, title: e.target.value })}
                            className="w-full bg-background border border-white/20 px-4 py-3"
                          />
                          <input
                            type="text"
                            placeholder="Description (optionnel)"
                            value={newFile.description}
                            onChange={(e) => setNewFile({ ...newFile, description: e.target.value })}
                            className="w-full bg-background border border-white/20 px-4 py-3"
                          />
                          <select
                            value={newFile.file_type}
                            onChange={(e) => setNewFile({ ...newFile, file_type: e.target.value })}
                            className="w-full bg-background border border-white/20 px-4 py-3"
                          >
                            <option value="video">Vidéo</option>
                            <option value="photo">Photo</option>
                            <option value="document">Document</option>
                          </select>
                          <input
                            type="url"
                            placeholder="URL du fichier (Google Drive, Dropbox...)"
                            value={newFile.file_url}
                            onChange={(e) => setNewFile({ ...newFile, file_url: e.target.value })}
                            className="w-full bg-background border border-white/20 px-4 py-3"
                          />
                          <input
                            type="url"
                            placeholder="URL miniature (optionnel)"
                            value={newFile.thumbnail_url}
                            onChange={(e) => setNewFile({ ...newFile, thumbnail_url: e.target.value })}
                            className="w-full bg-background border border-white/20 px-4 py-3"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setShowAddFile(false)} className="btn-outline flex-1 py-3">
                              Annuler
                            </button>
                            <button onClick={addFileToClient} className="btn-primary flex-1 py-3">
                              Ajouter via lien
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {clientFiles.map((file) => (
                      <div key={file.id} className="bg-card border border-white/10 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {file.file_type === "video" && <Video size={20} className="text-primary" />}
                          {file.file_type === "photo" && <Image size={20} className="text-primary" />}
                          {file.file_type === "document" && <FileText size={20} className="text-primary" />}
                          <div>
                            <p className="font-semibold text-sm">{file.title}</p>
                            <p className="text-white/40 text-xs truncate max-w-[200px]">{file.file_url}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="text-red-500 hover:text-red-400 text-xs"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                    {clientFiles.length === 0 && (
                      <p className="text-center text-white/60 py-8">Aucun fichier</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div>
            <h2 className="font-primary font-bold text-xl mb-4">Messages reçus</h2>
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`bg-card border p-6 ${msg.is_read ? "border-white/10" : "border-primary"}`} data-testid={`message-${msg.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-primary font-bold">{msg.name}</h3>
                      <p className="text-white/60 text-sm">{msg.email} {msg.phone && `• ${msg.phone}`}</p>
                    </div>
                    <span className="text-white/40 text-sm">
                      {new Date(msg.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <p className="font-semibold mb-2">{msg.subject}</p>
                  <p className="text-white/70 text-sm">{msg.message}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-center text-white/60 py-8">Aucun message</p>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div>
            <h2 className="font-primary font-bold text-xl mb-6">Paramètres</h2>
            
            {/* Bank Details */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-primary">💳 Coordonnées bancaires</h3>
              <p className="text-white/60 text-sm mb-4">Ces informations seront envoyées aux clients pour le paiement de l'acompte.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titulaire du compte</label>
                  <input
                    type="text"
                    value={bankDetails.account_holder}
                    onChange={(e) => setBankDetails({ ...bankDetails, account_holder: e.target.value })}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                    placeholder="CREATIVINDUSTRY FRANCE"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Nom de la banque</label>
                  <input
                    type="text"
                    value={bankDetails.bank_name}
                    onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                    placeholder="Revolut"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">IBAN</label>
                  <input
                    type="text"
                    value={bankDetails.iban}
                    onChange={(e) => setBankDetails({ ...bankDetails, iban: e.target.value })}
                    className="w-full bg-background border border-white/20 px-4 py-3 font-mono"
                    placeholder="FR76..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">BIC</label>
                  <input
                    type="text"
                    value={bankDetails.bic}
                    onChange={(e) => setBankDetails({ ...bankDetails, bic: e.target.value })}
                    className="w-full bg-background border border-white/20 px-4 py-3 font-mono"
                    placeholder="REVOFRP2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Pourcentage d'acompte (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={bankDetails.deposit_percentage}
                    onChange={(e) => setBankDetails({ ...bankDetails, deposit_percentage: parseInt(e.target.value) })}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
              </div>
              
              <button onClick={updateBankDetails} className="btn-primary px-6 py-3 mt-6">
                Enregistrer les coordonnées bancaires
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Edit Service Form Component
const EditServiceForm = ({ service, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: service.name,
    description: service.description,
    price: service.price,
    duration: service.duration || "",
    is_active: service.is_active,
    features: service.features || []
  });
  const [newFeature, setNewFeature] = useState("");

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({ ...formData, features: [...formData.features, newFeature.trim()] });
      setNewFeature("");
    }
  };

  const removeFeature = (index) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
        placeholder="Nom"
        data-testid="edit-service-name"
      />
      <textarea
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
        rows={2}
        placeholder="Description"
        data-testid="edit-service-description"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
          className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
          placeholder="Prix"
          data-testid="edit-service-price"
        />
        <input
          type="text"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
          className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
          placeholder="Durée"
          data-testid="edit-service-duration"
        />
      </div>
      
      {/* Features Editor */}
      <div className="border border-white/10 p-3 space-y-2">
        <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">Prestations incluses</p>
        {formData.features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2 bg-background/50 p-2">
            <span className="text-sm flex-1">{feature}</span>
            <button 
              onClick={() => removeFeature(index)}
              className="text-red-400 hover:text-red-300 text-xs px-2"
            >
              ✕
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
            className="flex-1 bg-background border border-white/20 px-3 py-2 text-sm"
            placeholder="Ajouter une prestation..."
          />
          <button 
            onClick={addFeature}
            className="btn-primary px-4 py-2 text-xs"
          >
            +
          </button>
        </div>
      </div>
      
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="accent-primary"
          data-testid="edit-service-active"
        />
        Service actif
      </label>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-outline flex-1 py-2 text-xs">
          Annuler
        </button>
        <button onClick={() => onSave(formData)} className="btn-primary flex-1 py-2 text-xs" data-testid="save-service-btn">
          Sauvegarder
        </button>
      </div>
    </div>
  );
};

// ==================== CLIENT LOGIN PAGE ====================
const ClientLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", name: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("client_token");
    if (token) {
      navigate("/client/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isRegister ? "/client/register" : "/client/login";
      const payload = isRegister ? formData : { email: formData.email, password: formData.password };
      const res = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem("client_token", res.data.token);
      localStorage.setItem("client_user", JSON.stringify(res.data.client));
      toast.success(isRegister ? "Compte créé !" : "Connexion réussie !");
      navigate("/client/dashboard");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen flex items-center justify-center" data-testid="client-login-page">
      <div className="w-full max-w-md p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <User className="text-primary" size={32} />
          <h1 className="font-primary font-black text-3xl tracking-tighter uppercase">
            <span className="text-gold-gradient">Espace Client</span>
          </h1>
        </div>
        <p className="font-secondary text-white/60 text-center mb-8">
          {isRegister ? "Créez votre compte client" : "Connectez-vous pour accéder à vos fichiers"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <>
              <div>
                <label className="block font-primary text-sm mb-2">Nom complet</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  data-testid="client-name-input"
                />
              </div>
              <div>
                <label className="block font-primary text-sm mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  data-testid="client-phone-input"
                />
              </div>
            </>
          )}
          <div>
            <label className="block font-primary text-sm mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
              data-testid="client-email-input"
            />
          </div>
          <div>
            <label className="block font-primary text-sm mb-2">Mot de passe</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
              data-testid="client-password-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-sm disabled:opacity-50"
            data-testid="client-submit-btn"
          >
            {loading ? "Chargement..." : isRegister ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-white/60 text-sm mt-6">
          {isRegister ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-primary hover:underline"
            data-testid="client-toggle-auth"
          >
            {isRegister ? "Se connecter" : "Créer un compte"}
          </button>
        </p>
      </div>
    </div>
  );
};

// ==================== CLIENT DASHBOARD ====================
const ClientDashboard = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientUser, setClientUser] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("client_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      navigate("/client");
      return;
    }
    const user = JSON.parse(localStorage.getItem("client_user") || "{}");
    setClientUser(user);
    fetchFiles();
  }, [token, navigate]);

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API}/client/files`, { headers });
      setFiles(res.data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem("client_token");
        navigate("/client");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("client_token");
    localStorage.removeItem("client_user");
    navigate("/client");
  };

  const fileTypeIcons = {
    video: Video,
    photo: Image,
    document: FileText
  };

  const videos = files.filter(f => f.file_type === "video");
  const photos = files.filter(f => f.file_type === "photo");
  const documents = files.filter(f => f.file_type === "document");

  return (
    <div className="pt-20 min-h-screen" data-testid="client-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-primary font-black text-3xl tracking-tighter uppercase">
              <span className="text-gold-gradient">Mes Fichiers</span>
            </h1>
            {clientUser && (
              <p className="text-white/60 mt-1">Bienvenue, {clientUser.name}</p>
            )}
          </div>
          <button onClick={logout} className="btn-outline px-6 py-2 text-sm flex items-center gap-2" data-testid="client-logout-btn">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>

        {loading ? (
          <div className="text-center text-white/60 py-20">Chargement...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="mx-auto text-white/30 mb-4" size={64} />
            <h2 className="font-primary font-bold text-xl mb-2">Aucun fichier disponible</h2>
            <p className="text-white/60">Vos fichiers (vidéos et photos) apparaîtront ici une fois mis à disposition par notre équipe.</p>
          </div>
        ) : (
          <>
            {/* Videos Section */}
            {videos.length > 0 && (
              <section className="mb-12">
                <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-3">
                  <Video className="text-primary" size={24} /> Mes Vidéos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((file) => (
                    <div key={file.id} className="bg-card border border-white/10 overflow-hidden card-hover" data-testid={`file-${file.id}`}>
                      <div className="relative aspect-video bg-black/50 flex items-center justify-center">
                        {file.thumbnail_url ? (
                          <img src={file.thumbnail_url} alt={file.title} className="w-full h-full object-cover" />
                        ) : (
                          <Video size={48} className="text-white/30" />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-primary font-semibold mb-1">{file.title}</h3>
                        {file.description && <p className="text-white/60 text-sm mb-3">{file.description}</p>}
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary w-full py-2 text-xs inline-flex items-center justify-center gap-2"
                        >
                          <Download size={14} /> Télécharger / Voir
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Photos Section */}
            {photos.length > 0 && (
              <section className="mb-12">
                <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-3">
                  <Image className="text-primary" size={24} /> Mes Photos
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-card border border-white/10 overflow-hidden card-hover group"
                      data-testid={`file-${file.id}`}
                    >
                      <div className="relative aspect-square bg-black/50">
                        {file.thumbnail_url ? (
                          <img src={file.thumbnail_url} alt={file.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image size={32} className="text-white/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Download size={24} className="text-primary" />
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-primary font-semibold text-sm truncate">{file.title}</h3>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Documents Section */}
            {documents.length > 0 && (
              <section>
                <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-3">
                  <FileText className="text-primary" size={24} /> Documents
                </h2>
                <div className="space-y-4">
                  {documents.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-card border border-white/10 p-4 card-hover flex items-center justify-between"
                      data-testid={`file-${file.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="text-primary" size={24} />
                        <div>
                          <h3 className="font-primary font-semibold">{file.title}</h3>
                          {file.description && <p className="text-white/60 text-sm">{file.description}</p>}
                        </div>
                      </div>
                      <Download size={20} className="text-white/60" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ==================== CHATBOT WIDGET ====================
const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Bonjour ! 👋 Je suis l'assistant de CREATIVINDUSTRY. Comment puis-je vous aider ? Je peux répondre à vos questions sur nos services de mariage, podcast ou plateau TV."
        }
      ]);
    }
  }, [isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/chat`, {
        session_id: sessionId,
        message: userMessage
      });
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Désolé, je rencontre un problème. Veuillez nous contacter au +33 1 23 45 67 89"
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 right-6 z-50 w-14 h-14 flex items-center justify-center transition-all ${
          isOpen ? "bg-white/20 rotate-0" : "bg-primary"
        }`}
        data-testid="chat-toggle"
      >
        {isOpen ? <X size={24} className="text-white" /> : <MessageCircle size={24} className="text-black" />}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-36 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-card border border-white/10 shadow-2xl"
            data-testid="chat-window"
          >
            {/* Header */}
            <div className="bg-primary p-4">
              <h3 className="font-primary font-bold text-black">CREATIVINDUSTRY</h3>
              <p className="text-black/70 text-sm">Assistant virtuel</p>
            </div>

            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-black"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 px-4 py-2 text-sm text-white/60">
                    En train d'écrire...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="border-t border-white/10 p-4 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Écrivez votre message..."
                className="flex-1 bg-background border border-white/20 px-4 py-2 text-sm focus:border-primary focus:outline-none"
                data-testid="chat-input"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn-primary px-4 py-2 disabled:opacity-50"
                data-testid="chat-send"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ==================== APP ====================
function App() {
  return (
    <div className="App">
      <div className="noise-overlay"></div>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services/wedding" element={<ServicePage category="wedding" />} />
          <Route path="/services/podcast" element={<ServicePage category="podcast" />} />
          <Route path="/services/tv_set" element={<ServicePage category="tv_set" />} />
          <Route path="/devis-mariage" element={<WeddingQuotePage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/rendez-vous" element={<AppointmentPage />} />
          <Route path="/rendez-vous/confirmer/:appointmentId/:token" element={<AppointmentConfirmPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/client" element={<ClientLogin />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />
        </Routes>
        <Footer />
        <ChatWidget />
        <Toaster position="top-right" />
      </BrowserRouter>
    </div>
  );
}

export default App;
