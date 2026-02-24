import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { User, Mail, KeyRound, Lock, CreditCard, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

const ClientLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", name: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordResetCode, setPasswordResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Expired account state
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expiredData, setExpiredData] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [renewalStep, setRenewalStep] = useState("options"); // options, payment, success
  const [renewalLoading, setRenewalLoading] = useState(false);
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

  const handleBackToLogin = () => {
    setShowPasswordReset(false);
    setPasswordResetSent(false);
    setPasswordResetCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSendResetCode = async () => {
    if (!formData.email) {
      toast.error("Veuillez entrer votre email");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/client/password/request-reset`, { email: formData.email });
      setPasswordResetSent(true);
      toast.success("Code envoyé par email ! Vérifiez votre boîte de réception.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/client/password/reset`, {
        email: formData.email,
        reset_code: passwordResetCode,
        new_password: newPassword
      });
      toast.success("Mot de passe modifié ! Vous pouvez maintenant vous connecter.");
      handleBackToLogin();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Code invalide ou expiré");
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Screen
  if (showPasswordReset) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center" data-testid="client-password-reset-page">
        <div className="w-full max-w-md p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <KeyRound size={32} className="text-primary" />
            </div>
          </div>
          <h1 className="font-primary font-black text-2xl tracking-tighter uppercase mb-2 text-center">
            <span className="text-gold-gradient">Mot de passe oublié</span>
          </h1>
          <p className="font-secondary text-white/60 text-center mb-8">
            {passwordResetSent
              ? "Entrez le code reçu par email et votre nouveau mot de passe"
              : "Entrez votre email pour recevoir un code de réinitialisation"}
          </p>

          {!passwordResetSent ? (
            <div className="space-y-6">
              <div>
                <label className="block font-primary text-sm mb-2">Email du compte</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  placeholder="votre@email.com"
                />
              </div>
              <button
                onClick={handleSendResetCode}
                disabled={loading || !formData.email}
                className="btn-primary w-full py-4 text-sm disabled:opacity-50"
              >
                {loading ? "Envoi en cours..." : "📧 Envoyer le code par email"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block font-primary text-sm mb-2 flex items-center gap-2">
                  <Mail size={16} className="text-primary" />
                  Code reçu par email
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={passwordResetCode}
                  onChange={(e) => setPasswordResetCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-background border border-white/20 px-4 py-4 text-center text-2xl tracking-widest font-mono focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-primary text-sm mb-2">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block font-primary text-sm mb-2">Confirmer le mot de passe</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button
                onClick={handleResetPassword}
                disabled={loading || passwordResetCode.length !== 6 || !newPassword || !confirmPassword}
                className="btn-primary w-full py-4 text-sm disabled:opacity-50"
              >
                {loading ? "Modification..." : "🔑 Modifier le mot de passe"}
              </button>
              <button
                onClick={handleSendResetCode}
                disabled={loading}
                className="btn-outline w-full py-3 text-sm"
              >
                Renvoyer le code
              </button>
            </div>
          )}

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
            {!isRegister && (
              <button
                type="button"
                onClick={() => setShowPasswordReset(true)}
                className="text-primary text-sm mt-2 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            )}
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
