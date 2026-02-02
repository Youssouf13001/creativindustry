import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut, Settings } from "lucide-react";
import axios from "axios";
import { API, BACKEND_URL } from "../config/api";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [clientUser, setClientUser] = useState(null);
  const [showClientMenu, setShowClientMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check if client is logged in and fetch profile
  useEffect(() => {
    const checkClientAuth = async () => {
      const token = localStorage.getItem("client_token");
      if (token) {
        try {
          const res = await axios.get(`${API}/client/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setClientUser(res.data);
        } catch (e) {
          // Token invalid, clear it
          localStorage.removeItem("client_token");
          localStorage.removeItem("client_user");
          setClientUser(null);
        }
      } else {
        setClientUser(null);
      }
    };
    checkClientAuth();
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("client_token");
    localStorage.removeItem("client_user");
    setClientUser(null);
    setShowClientMenu(false);
    navigate("/client");
  };

  const navLinks = [
    { name: "Accueil", path: "/" },
    { name: "Mariages", path: "/services/wedding" },
    { name: "Podcast", path: "/services/podcast" },
    { name: "Plateau TV", path: "/services/tv_set" },
    { name: "Portfolio", path: "/portfolio" },
    { name: "Rendez-vous", path: "/rendez-vous" },
    { name: "Contact", path: "/contact" },
  ];

  const profilePhotoUrl = clientUser?.profile_photo
    ? (clientUser.profile_photo.startsWith('http') ? clientUser.profile_photo : `${BACKEND_URL}${clientUser.profile_photo}`)
    : null;

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

          <nav className="hidden md:flex items-center gap-6">
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
              className="btn-primary px-5 py-2 text-sm"
            >
              Devis
            </Link>

            {/* Client Profile or Login Button */}
            {clientUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowClientMenu(!showClientMenu)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full transition-colors"
                  data-testid="client-profile-btn"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/30 overflow-hidden flex items-center justify-center border border-primary">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt={clientUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} className="text-primary" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white max-w-[100px] truncate">
                    {clientUser.name?.split(' ')[0]}
                  </span>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showClientMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-card border border-white/20 shadow-xl rounded-lg overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/10">
                        <p className="font-semibold text-white">{clientUser.name}</p>
                        <p className="text-sm text-white/60 truncate">{clientUser.email}</p>
                      </div>
                      <div className="p-2">
                        <Link
                          to="/client/dashboard"
                          onClick={() => setShowClientMenu(false)}
                          className="flex items-center gap-3 px-3 py-2 text-white/80 hover:bg-white/10 rounded transition-colors"
                        >
                          <User size={16} /> Mon Espace
                        </Link>
                        <Link
                          to="/client/dashboard"
                          onClick={() => { setShowClientMenu(false); localStorage.setItem('client_tab', 'settings'); }}
                          className="flex items-center gap-3 px-3 py-2 text-white/80 hover:bg-white/10 rounded transition-colors"
                        >
                          <Settings size={16} /> Paramètres
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded transition-colors w-full"
                        >
                          <LogOut size={16} /> Déconnexion
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/client"
                className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
                data-testid="nav-espace-client"
              >
                <User size={16} /> Espace Client
              </Link>
            )}
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

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10"
          >
            <nav className="flex flex-col p-6 gap-4">
              {/* Client Profile in Mobile */}
              {clientUser && (
                <div className="flex items-center gap-3 pb-4 mb-2 border-b border-white/10">
                  <div className="w-12 h-12 rounded-full bg-primary/30 overflow-hidden flex items-center justify-center border-2 border-primary">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt={clientUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} className="text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{clientUser.name}</p>
                    <p className="text-sm text-white/60">{clientUser.email}</p>
                  </div>
                </div>
              )}

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
              
              {clientUser ? (
                <>
                  <Link
                    to="/client/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="font-primary text-lg text-primary hover:text-primary/80 transition-colors"
                  >
                    Mon Espace
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="font-primary text-lg text-red-400 hover:text-red-300 transition-colors text-left"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <Link
                  to="/client"
                  onClick={() => setIsMenuOpen(false)}
                  className="font-primary text-lg text-white/80 hover:text-primary transition-colors"
                >
                  Espace Client
                </Link>
              )}
              
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
