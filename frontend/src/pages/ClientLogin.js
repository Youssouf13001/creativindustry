import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { User } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

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

export default ClientLogin;
