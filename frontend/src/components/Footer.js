import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../config/api";

const Footer = () => {
  const [contactInfo, setContactInfo] = useState({
    phone: "+33 1 23 45 67 89",
    email: "contact@creativindustry.fr",
    address: "Paris, France"
  });

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const res = await axios.get(`${API}/content`);
        if (res.data) {
          setContactInfo({
            phone: res.data.phone || "+33 1 23 45 67 89",
            email: res.data.email || "contact@creativindustry.fr",
            address: res.data.address ? res.data.address.split(',')[0] + ", France" : "Paris, France"
          });
        }
      } catch (e) {
        // Keep default values
      }
    };
    fetchContactInfo();
  }, []);

  return (
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
              <li><Link to="/actualites" className="text-white/60 hover:text-primary transition-colors text-sm">Actualités</Link></li>
              <li><Link to="/temoignages" className="text-white/60 hover:text-primary transition-colors text-sm">Témoignages</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-primary font-bold text-sm uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li className="flex items-center gap-2"><Phone size={14} /> {contactInfo.phone}</li>
              <li className="flex items-center gap-2"><Mail size={14} /> {contactInfo.email}</li>
              <li className="flex items-center gap-2"><MapPin size={14} /> {contactInfo.address}</li>
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
};

export default Footer;
