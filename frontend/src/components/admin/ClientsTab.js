import { useState } from "react";
import axios from "axios";
import { User, Plus, Trash2, Eye, Download, Upload, FileText, Image, Video, Music, X, Loader, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../../config/api";
import { getMediaUrl } from "../../utils/url";

const ClientsTab = ({ 
  clients, 
  selectedClient, 
  setSelectedClient,
  clientFiles,
  setClientFiles,
  onRefresh,
  headers
}) => {
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", password: "", phone: "" });
  const [showClientFileTransfer, setShowClientFileTransfer] = useState(null);
  const [clientTransfers, setClientTransfers] = useState({ music: [], documents: [], photos: [], videos: [] });
  const [uploadingToClient, setUploadingToClient] = useState(false);
  const [uploadToClientProgress, setUploadToClientProgress] = useState(0);
  const [deletingClient, setDeletingClient] = useState(null);

  const fetchClientFiles = async (clientId) => {
    try {
      const res = await axios.get(`${API}/admin/client-files/${clientId}`, { headers });
      setClientFiles(res.data);
    } catch (e) {
      console.error("Error fetching client files");
    }
  };

  const fetchClientTransfers = async (clientId) => {
    try {
      const res = await axios.get(`${API}/admin/client-transfers/${clientId}`, { headers });
      setClientTransfers(res.data);
    } catch (e) {
      console.error("Error fetching client transfers");
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/clients`, newClient, { headers });
      toast.success("Client ajoute avec succes");
      setShowAddClient(false);
      setNewClient({ name: "", email: "", password: "", phone: "" });
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'ajout");
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm("Etes-vous sur de vouloir supprimer ce client et tous ses fichiers ?")) return;
    
    setDeletingClient(clientId);
    try {
      await axios.delete(`${API}/admin/client/${clientId}`, { headers });
      toast.success("Client et fichiers supprimes");
      setSelectedClient(null);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression");
    } finally {
      setDeletingClient(null);
    }
  };

  const handleDownloadClientZip = async (clientId, clientName) => {
    try {
      toast.info("Preparation du fichier ZIP...");
      const response = await axios.get(`${API}/admin/client/${clientId}/files-zip`, {
        headers,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${clientName.replace(/\s+/g, '_')}_fichiers.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Telechargement termine");
    } catch (e) {
      toast.error("Erreur lors du telechargement");
    }
  };

  const getExpirationStatus = (expiresAt) => {
    if (!expiresAt) return null;
    const expDate = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { text: "Expire", color: "text-red-400 bg-red-500/20" };
    if (daysLeft < 30) return { text: `${daysLeft}j restants`, color: "text-orange-400 bg-orange-500/20" };
    return { text: `${daysLeft}j restants`, color: "text-green-400 bg-green-500/20" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Gestion des Clients</h2>
        <button 
          onClick={() => setShowAddClient(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter un client
        </button>
      </div>

      {/* Clients List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => {
          const expStatus = getExpirationStatus(client.expires_at);
          return (
            <div 
              key={client.id} 
              className={`bg-slate-800/50 rounded-xl p-4 border cursor-pointer transition-all ${
                selectedClient?.id === client.id 
                  ? 'border-amber-500 ring-2 ring-amber-500/20' 
                  : 'border-slate-700/50 hover:border-slate-600'
              }`}
              onClick={() => {
                setSelectedClient(client);
                fetchClientFiles(client.id);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{client.name}</p>
                    <p className="text-slate-400 text-sm">{client.email}</p>
                  </div>
                </div>
                {expStatus && (
                  <span className={`px-2 py-1 rounded-full text-xs ${expStatus.color}`}>
                    {expStatus.text}
                  </span>
                )}
              </div>
              {client.phone && (
                <p className="text-slate-500 text-sm mt-2">{client.phone}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowClientFileTransfer(client);
                    fetchClientTransfers(client.id);
                  }}
                  className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  Transferts
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadClientZip(client.id, client.name);
                  }}
                  className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  title="Telecharger tous les fichiers en ZIP"
                >
                  <FileArchive className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClient(client.id);
                  }}
                  disabled={deletingClient === client.id}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  title="Supprimer le client"
                >
                  {deletingClient === client.id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
        {clients.length === 0 && (
          <div className="col-span-full text-center py-8 text-slate-400">
            Aucun client pour le moment
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Ajouter un client</h3>
              <button onClick={() => setShowAddClient(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Nom</label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={newClient.password}
                  onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Telephone</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium py-2 rounded-lg transition-colors"
              >
                Ajouter
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsTab;
