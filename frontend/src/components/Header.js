import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

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
    { name: "Rendez-vous", path: "/rendez-vous" },
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

export default Header;
