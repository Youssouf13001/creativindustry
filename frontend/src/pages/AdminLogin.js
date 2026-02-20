import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Shield, Smartphone, Mail, KeyRound } from "lucide-react";
import { API } from "../config/api";

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [showEmailReset, setShowEmailReset] = useState(false);
  const [emailResetCode, setEmailResetCode] = useState("");
  const [emailResetSent, setEmailResetSent] = useState(false);
  // Password reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetCode, setPasswordResetCode] = useState("");
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        email: formData.email, 
        password: formData.password,
        totp_code: mfaRequired ? mfaCode : null
      };
      
      const res = await axios.post(`${API}/auth/login`, payload);
      
      // Check if MFA is required
      if (res.data.mfa_required) {
        setMfaRequired(true);
        toast.info("Entrez le code de votre application d'authentification");
        setLoading(false);
        return;
      }
      
      localStorage.setItem("admin_token", res.data.token);
      localStorage.setItem("admin_user", JSON.stringify(res.data.admin));
      toast.success("Connexion réussie !");
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
    setShowEmailReset(false);
    setEmailResetSent(false);
    setEmailResetCode("");
    setShowPasswordReset(false);
    setPasswordResetSent(false);
    setPasswordResetCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // Password Reset Functions
  const handleSendPasswordResetCode = async () => {
    if (!formData.email) {
      toast.error("Veuillez entrer votre email");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/password/request-reset`, { email: formData.email });
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
      await axios.post(`${API}/auth/password/reset`, { 
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

  const handleSendEmailCode = async () => {
    if (!formData.email) {
      toast.error("Veuillez entrer votre email");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/mfa/send-reset-email`, { email: formData.email });
      setEmailResetSent(true);
      toast.success("Code envoyé par email ! Vérifiez votre boîte de réception.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/auth/mfa/verify-reset-email`, { 
        email: formData.email, 
        reset_code: emailResetCode 
      });
      toast.success("MFA désactivé ! Vous pouvez maintenant vous connecter.");
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
      <div className="pt-20 min-h-screen flex items-center justify-center" data-testid="admin-password-reset-page">
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
                onClick={handleSendPasswordResetCode}
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
                onClick={handleSendPasswordResetCode}
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

  // Email Reset Screen (MFA)
  if (showEmailReset) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center" data-testid="admin-email-reset-page">
        <div className="w-full max-w-md p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Mail size={32} className="text-blue-500" />
            </div>
          </div>
          <h1 className="font-primary font-black text-2xl tracking-tighter uppercase mb-2 text-center">
            <span className="text-gold-gradient">Réinitialisation par Email</span>
          </h1>
          <p className="font-secondary text-white/60 text-center mb-8">
            {emailResetSent 
              ? "Entrez le code à 6 chiffres reçu par email" 
              : "Nous allons vous envoyer un code par email pour désactiver le MFA"}
          </p>

          {!emailResetSent ? (
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
                onClick={handleSendEmailCode}
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
                  <Mail size={16} className="text-blue-500" />
                  Code reçu par email
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={emailResetCode}
                  onChange={(e) => setEmailResetCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-background border border-white/20 px-4 py-4 text-center text-2xl tracking-widest font-mono focus:border-primary focus:outline-none"
                  autoFocus
                />
                <p className="text-xs text-white/40 mt-2 text-center">
                  Le code expire dans 15 minutes
                </p>
              </div>
              <button
                onClick={handleVerifyEmailCode}
                disabled={loading || emailResetCode.length !== 6}
                className="btn-primary w-full py-4 text-sm disabled:opacity-50"
              >
                {loading ? "Vérification..." : "Désactiver le MFA"}
              </button>
              <button
                onClick={handleSendEmailCode}
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

          {/* Lost phone option */}
          <div className="mt-8 p-4 bg-card border border-white/10 rounded">
            <p className="text-sm text-white/60 mb-3 text-center">
              📱 Vous avez perdu l'accès à votre téléphone ?
            </p>
            <button
              onClick={() => setShowEmailReset(true)}
              className="w-full text-center text-blue-400 text-sm hover:text-blue-300 flex items-center justify-center gap-2"
            >
              <Mail size={16} />
              Recevoir un code par email
            </button>
          </div>

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
          Connectez-vous pour gérer votre site
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <button
              type="button"
              onClick={() => setShowPasswordReset(true)}
              className="text-primary text-sm mt-2 hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-sm disabled:opacity-50"
            data-testid="admin-submit-btn"
          >
            {loading ? "Chargement..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
