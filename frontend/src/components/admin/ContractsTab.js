import { useState, useEffect } from 'react';
import { FileText, Plus, Send, Eye, Trash2, Check, Clock, PenTool, Users, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../../config/api';
import ContractEditor from './ContractEditor';

const ContractsTab = ({ token, clients = [] }) => {
  const [templates, setTemplates] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [sending, setSending] = useState(false);
  const [activeView, setActiveView] = useState('contracts'); // 'contracts' or 'templates'
  const [searchTerm, setSearchTerm] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, contractsRes] = await Promise.all([
        fetch(`${API}/contracts/templates`, { headers }),
        fetch(`${API}/contracts/admin/list`, { headers }),
      ]);
      const templatesData = await templatesRes.json();
      const contractsData = await contractsRes.json();
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setContracts(Array.isArray(contractsData) ? contractsData : []);
    } catch (e) {
      console.error('Error fetching contracts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendContract = async () => {
    if (!selectedTemplateId || !selectedClientId) {
      toast.error('Sélectionnez un modèle et un client');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API}/contracts/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          template_id: selectedTemplateId,
          client_id: selectedClientId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Contrat envoyé au client !');
        setShowSendModal(false);
        setSelectedTemplateId('');
        setSelectedClientId('');
        fetchData();
      } else {
        toast.error(data.detail || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Supprimer ce modèle ?')) return;
    try {
      const res = await fetch(`${API}/contracts/templates/${templateId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Modèle supprimé');
        fetchData();
      }
    } catch (e) {
      toast.error('Erreur');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-gray-500', label: 'En attente', icon: Clock },
      sent: { color: 'bg-blue-500', label: 'Envoyé', icon: Send },
      filled: { color: 'bg-amber-500', label: 'Rempli', icon: PenTool },
      signed: { color: 'bg-green-500', label: 'Signé', icon: Check },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`${config.color} text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 w-fit`}>
        <Icon size={12} /> {config.label}
      </span>
    );
  };

  const filteredContracts = contracts.filter(c => 
    c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.template_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="text-amber-400" /> Gestion des Contrats
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSendModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
          >
            <Send size={18} /> Envoyer un contrat
          </button>
          <button
            onClick={() => { setEditingTemplate(null); setShowEditor(true); }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg flex items-center gap-2"
          >
            <Plus size={18} /> Nouveau modèle
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button
          onClick={() => setActiveView('contracts')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeView === 'contracts' 
              ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-400' 
              : 'text-white/60 hover:text-white'
          }`}
        >
          Contrats envoyés ({contracts.length})
        </button>
        <button
          onClick={() => setActiveView('templates')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeView === 'templates' 
              ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-400' 
              : 'text-white/60 hover:text-white'
          }`}
        >
          Modèles ({templates.length})
        </button>
      </div>

      {/* Contracts List */}
      {activeView === 'contracts' && (
        <div>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input
                type="text"
                placeholder="Rechercher par client ou contrat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center text-white/60 py-8">Chargement...</div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center text-white/60 py-8">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>Aucun contrat envoyé</p>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Client</th>
                    <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Contrat</th>
                    <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Status</th>
                    <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Date</th>
                    <th className="text-right text-white/60 text-sm font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{contract.client_name}</p>
                        <p className="text-white/60 text-sm">{contract.client_email}</p>
                      </td>
                      <td className="px-4 py-3 text-white">{contract.template_name || 'Contrat'}</td>
                      <td className="px-4 py-3">{getStatusBadge(contract.status)}</td>
                      <td className="px-4 py-3 text-white/60 text-sm">
                        {contract.signed_at 
                          ? `Signé le ${new Date(contract.signed_at).toLocaleDateString('fr-FR')}`
                          : contract.sent_at 
                            ? `Envoyé le ${new Date(contract.sent_at).toLocaleDateString('fr-FR')}`
                            : '-'
                        }
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => window.open(`${API.replace('/api', '')}/contracts/${contract.id}`, '_blank')}
                          className="p-2 text-blue-400 hover:text-blue-300"
                          title="Voir"
                        >
                          <Eye size={18} />
                        </button>
                        {contract.status === 'signed' && (
                          <button
                            className="p-2 text-green-400 hover:text-green-300"
                            title="Télécharger"
                          >
                            <Download size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Templates List */}
      {activeView === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.length === 0 ? (
            <div className="col-span-full text-center text-white/60 py-8">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>Aucun modèle créé</p>
              <button
                onClick={() => { setEditingTemplate(null); setShowEditor(true); }}
                className="mt-4 px-4 py-2 bg-amber-500 text-black font-bold rounded-lg"
              >
                Créer un modèle
              </button>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold">{template.name}</h3>
                    <p className="text-white/60 text-sm">{template.fields?.length || 0} champs</p>
                  </div>
                  <FileText className="text-amber-400" size={24} />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setEditingTemplate(template); setShowEditor(true); }}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => { setSelectedTemplateId(template.id); setShowSendModal(true); }}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                  >
                    Envoyer
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Contract Editor Modal */}
      {showEditor && (
        <ContractEditor
          token={token}
          existingTemplate={editingTemplate}
          onClose={() => { setShowEditor(false); setEditingTemplate(null); }}
          onSaved={fetchData}
        />
      )}

      {/* Send Contract Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Send className="text-green-400" /> Envoyer un contrat
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm block mb-2">Modèle de contrat</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                >
                  <option value="">Sélectionner un modèle...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/60 text-sm block mb-2">Client</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700"
                >
                  <option value="">Sélectionner un client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleSendContract}
                disabled={sending}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
              >
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractsTab;
