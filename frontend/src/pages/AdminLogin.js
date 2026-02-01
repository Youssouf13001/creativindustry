import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { API } from "../config/api";

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

export default AdminLogin;
