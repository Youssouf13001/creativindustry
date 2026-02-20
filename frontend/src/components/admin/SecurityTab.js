import { useState } from "react";
import axios from "axios";
import { Shield, Plus, Trash2, Eye, EyeOff, X, Loader, User, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { API } from "../../config/api";

const SecurityTab = ({ 
  mfaStatus, 
  setMfaStatus,
  adminsList,
  setAdminsList,
  headers,
  onRefreshAdmins
}) => {
  const [mfaSetupData, setMfaSetupData] = useState(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showDisableMfa, setShowDisableMfa] = useState(false);
  const [disableMfaData, setDisableMfaData] = useState({ password: "", code: "" });
  const [newAdminData, setNewAdminData] = useState({ name: "", email: "", password: "" });
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSetupMfa = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/mfa/setup`, {}, { headers });
      setMfaSetupData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la configuration MFA");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    try {
      await axios.post(`${API}/auth/mfa/verify`, { totp_code: mfaVerifyCode }, { headers });
      toast.success("MFA active avec succes !");
      setMfaSetupData(null);
      setMfaVerifyCode("");
      setMfaStatus({ ...mfaStatus, mfa_enabled: true });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Code invalide");
    }
  };

  const handleDisableMfa = async () => {
    try {
      await axios.post(`${API}/auth/mfa/disable`, {
        password: disableMfaData.password,
        totp_code: disableMfaData.code
      }, { headers });
      toast.success("MFA desactive");
      setShowDisableMfa(false);
      setDisableMfaData({ password: "", code: "" });
      setMfaStatus({ ...mfaStatus, mfa_enabled: false });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la desactivation");
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/admin/create-admin`, newAdminData, { headers });
      toast.success("Administrateur ajoute avec succes");
      setShowAddAdmin(false);
      setNewAdminData({ name: "", email: "", password: "" });
      onRefreshAdmins();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm("Etes-vous sur de vouloir supprimer cet administrateur ?")) return;
    
    try {
      await axios.delete(`${API}/admin/delete-admin/${adminId}`, { headers });
      toast.success("Administrateur supprime");
      onRefreshAdmins();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Shield className="w-6 h-6 text-amber-500" />
        Securite
      </h2>

      {/* MFA Section */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Authentification a deux facteurs (MFA)</h3>
        
        {mfaStatus.mfa_enabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400">
              <Shield className="w-5 h-5" />
              <span>MFA active</span>
            </div>
            <p className="text-slate-400 text-sm">
              Codes de secours restants: {mfaStatus.backup_codes_remaining}
            </p>
            <button
              onClick={() => setShowDisableMfa(true)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-colors"
            >
              Desactiver MFA
            </button>
          </div>
        ) : mfaSetupData ? (
          <div className="space-y-4">
            <p className="text-slate-400">Scannez ce QR code avec votre application d'authentification:</p>
            <div className="flex justify-center">
              <img 
                src={`data:image/png;base64,${mfaSetupData.qr_code}`} 
                alt="QR Code MFA" 
                className="w-48 h-48 bg-white p-2 rounded-lg"
              />
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-2">Ou entrez ce code manuellement:</p>
              <code className="bg-slate-700 px-3 py-1 rounded text-amber-400">{mfaSetupData.secret}</code>
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Code de verification:</label>
              <input
                type="text"
                value={mfaVerifyCode}
                onChange={(e) => setMfaVerifyCode(e.target.value)}
                placeholder="000000"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleVerifyMfa}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-medium py-2 rounded-lg transition-colors"
              >
                Activer MFA
              </button>
              <button
                onClick={() => setMfaSetupData(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
            <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
              <p className="text-slate-400 text-sm mb-2">Codes de secours (a conserver en lieu sur):</p>
              <div className="grid grid-cols-2 gap-2">
                {mfaSetupData.backup_codes.map((code, i) => (
                  <code key={i} className="bg-slate-600 px-2 py-1 rounded text-white text-sm">{code}</code>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-400">
              Protegez votre compte avec l'authentification a deux facteurs.
            </p>
            <button
              onClick={handleSetupMfa}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : "Configurer MFA"}
            </button>
          </div>
        )}
      </div>

      {/* Admins Management */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Gestion des administrateurs</h3>
          <button
            onClick={() => setShowAddAdmin(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
        
        <div className="space-y-3">
          {adminsList.map((admin) => (
            <div key={admin.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{admin.name}</p>
                  <p className="text-slate-400 text-sm">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {admin.mfa_enabled && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">MFA</span>
                )}
                <button
                  onClick={() => handleDeleteAdmin(admin.id)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disable MFA Modal */}
      {showDisableMfa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Desactiver MFA</h3>
              <button onClick={() => setShowDisableMfa(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={disableMfaData.password}
                  onChange={(e) => setDisableMfaData({ ...disableMfaData, password: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Code MFA</label>
                <input
                  type="text"
                  value={disableMfaData.code}
                  onChange={(e) => setDisableMfaData({ ...disableMfaData, code: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              <button
                onClick={handleDisableMfa}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Desactiver MFA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Ajouter un administrateur</h3>
              <button onClick={() => setShowAddAdmin(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Nom</label>
                <input
                  type="text"
                  value={newAdminData.name}
                  onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newAdminData.password}
                    onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : "Ajouter"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityTab;
