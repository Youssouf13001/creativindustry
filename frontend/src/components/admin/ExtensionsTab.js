import { useState } from "react";
import axios from "axios";
import { CreditCard, Clock, Check, X, User, Loader } from "lucide-react";
import { toast } from "sonner";
import { API } from "../../config/api";

const ExtensionsTab = ({ 
  extensionOrders,
  headers,
  onRefresh
}) => {
  const [processingId, setProcessingId] = useState(null);

  const handleApproveExtension = async (orderId) => {
    setProcessingId(orderId);
    try {
      await axios.post(`${API}/admin/approve-extension/${orderId}`, {}, { headers });
      toast.success("Extension approuvee - Compte prolonge de 6 mois");
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'approbation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectExtension = async (orderId) => {
    if (!window.confirm("Etes-vous sur de vouloir rejeter cette demande ?")) return;
    
    setProcessingId(orderId);
    try {
      await axios.post(`${API}/admin/reject-extension/${orderId}`, {}, { headers });
      toast.success("Demande rejetee");
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors du rejet");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">En attente</span>;
      case "approved":
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Approuve</span>;
      case "rejected":
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">Rejete</span>;
      default:
        return null;
    }
  };

  const pendingOrders = extensionOrders.filter(o => o.status === "pending");
  const processedOrders = extensionOrders.filter(o => o.status !== "pending");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <CreditCard className="w-6 h-6 text-amber-500" />
        Extensions de compte
      </h2>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-blue-400 text-sm">
          Les clients dont le compte expire peuvent demander une extension de 6 mois pour 20 EUR via PayPal.me.
          Approuvez la demande une fois le paiement recu.
        </p>
      </div>

      {/* Pending Orders */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-400" />
          Demandes en attente ({pendingOrders.length})
        </h3>
        
        {pendingOrders.length > 0 ? (
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{order.client_name}</p>
                    <p className="text-slate-400 text-sm">{order.client_email}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      Demande le {new Date(order.requested_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold mr-4">20 EUR</span>
                  <button
                    onClick={() => handleApproveExtension(order.id)}
                    disabled={processingId === order.id}
                    className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                    title="Approuver (paiement recu)"
                  >
                    {processingId === order.id ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRejectExtension(order.id)}
                    disabled={processingId === order.id}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                    title="Rejeter"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-4">Aucune demande en attente</p>
        )}
      </div>

      {/* Processed Orders */}
      {processedOrders.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Historique</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {processedOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div>
                  <p className="text-white">{order.client_name}</p>
                  <p className="text-slate-400 text-sm">{order.client_email}</p>
                </div>
                {getStatusBadge(order.status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtensionsTab;
