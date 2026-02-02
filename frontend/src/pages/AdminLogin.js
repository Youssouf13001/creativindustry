import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Shield, Smartphone } from "lucide-react";
import { API } from "../config/api";

const AdminLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister 
        ? formData 
        : { 
            email: formData.email, 
            password: formData.password,
            totp_code: mfaRequired ? mfaCode : null
          };
      
      const res = await axios.post(`${API}${endpoint}`, payload);
      
      // Check if MFA is required
      if (res.data.mfa_required) {
        setMfaRequired(true);
        toast.info("Entrez le code de votre application d'authentification");
        setLoading(false);
        return;
      }
      
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

  const handleBackToLogin = () => {
    setMfaRequired(false);
    setMfaCode("");
  };

  // MFA Code Entry Screen
  if (mfaRequired) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center" data-testid="admin-mfa-page">
        <div className="w-full max-w-md p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <Shield size={32} className="text-primary" />
            </div>
          </div>
          <h1 className="font-primary font-black text-2xl tracking-tighter uppercase mb-2 text-center">
            <span className="text-gold-gradient">Vérification MFA</span>
          </h1>
          <p className="font-secondary text-white/60 text-center mb-8">
            Entrez le code à 6 chiffres de votre application d'authentification
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-primary text-sm mb-2 flex items-center gap-2">
                <Smartphone size={16} className="text-primary" />
                Code MFA
              </label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="123456 ou code de secours"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\s/g, ''))}
                className="w-full bg-background border border-white/20 px-4 py-4 text-center text-2xl tracking-widest font-mono focus:border-primary focus:outline-none"
                autoFocus
                data-testid="mfa-code-input"
              />
              <p className="text-xs text-white/40 mt-2 text-center">
                Ou utilisez un code de secours à 8 caractères
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || mfaCode.length < 6}
              className="btn-primary w-full py-4 text-sm disabled:opacity-50"
              data-testid="mfa-submit-btn"
            >
              {loading ? "Vérification..." : "Vérifier"}
            </button>
          </form>

          <button
            onClick={handleBackToLogin}
            className="w-full text-center text-white/60 text-sm mt-6 hover:text-primary"
          >
            ← Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

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
