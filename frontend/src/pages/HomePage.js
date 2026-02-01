import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Camera, Mic, Tv, FileText, Play, ChevronRight } from "lucide-react";
import { API } from "../config/api";

const HomePage = () => {
  const [content, setContent] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const contentRes = await axios.get(`${API}/content`);
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

export default HomePage;
