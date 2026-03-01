import { useState, useEffect } from 'react';
import { FileText, PenTool, Check, Clock, Send, Eye, X, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../../config/api';

const ClientContracts = ({ token, clientId }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [signing, setSigning] = useState(false);
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchContracts();
  }, [clientId]);

  const fetchContracts = async () => {
    try {
      const res = await fetch(`${API}/contracts/client/${clientId}`, { headers });
      const data = await res.json();
      setContracts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openContract = async (contract) => {
    try {
      const res = await fetch(`${API}/contracts/${contract.id}`, { headers });
      const data = await res.json();
      setSelectedContract(data);
      setFieldValues(data.field_values || {});
    } catch (e) {
      toast.error('Erreur lors du chargement du contrat');
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setFieldValues({ ...fieldValues, [fieldId]: value });
  };

  const saveFields = async () => {
    if (!selectedContract) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/contracts/${selectedContract.id}/fill`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ field_values: fieldValues }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Informations sauvegardées');
        setSelectedContract({ ...selectedContract, status: 'filled', field_values: fieldValues });
      }
    } catch (e) {
      toast.error('Erreur');
    } finally {
      setSaving(false);
    }
  };

  const requestOtp = async () => {
    if (!selectedContract) return;
    setRequestingOtp(true);
    try {
      const res = await fetch(`${API}/contracts/${selectedContract.id}/request-otp`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Code envoyé par email !');
        setShowOtpModal(true);
      } else {
        toast.error(data.detail || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur lors de l\'envoi du code');
    } finally {
      setRequestingOtp(false);
    }
  };

  const signContract = async () => {
    if (!otpCode.trim()) {
      toast.error('Entrez le code reçu par email');
      return;
    }
    setSigning(true);
    try {
      const res = await fetch(`${API}/contracts/${selectedContract.id}/sign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ otp_code: otpCode }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Contrat signé avec succès !');
        setShowOtpModal(false);
        setSelectedContract(null);
        setOtpCode('');
        fetchContracts();
      } else {
        toast.error(data.detail || 'Code invalide');
      }
    } catch (e) {
      toast.error('Erreur');
    } finally {
      setSigning(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      sent: { color: 'bg-blue-500', label: 'À remplir', icon: PenTool },
      filled: { color: 'bg-amber-500', label: 'À signer', icon: Clock },
      signed: { color: 'bg-green-500', label: 'Signé', icon: Check },
    };
    const config = configs[status] || configs.sent;
    const Icon = config.icon;
    return (
      <span className={`${config.color} text-white text-xs px-2 py-1 rounded-full flex items-center gap-1`}>
        <Icon size={12} /> {config.label}
      </span>
    );
  };

  const renderField = (field) => {
    const value = fieldValues[field.id] || '';
    
    switch (field.type) {
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="w-5 h-5 accent-amber-500"
              disabled={selectedContract?.status === 'signed'}
            />
            <span className="text-white">{field.label}</span>
          </label>
        );
      case 'date':
        return (
          <div>
            <label className="text-white/60 text-sm block mb-1">{field.label}</label>
            <input
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
              disabled={selectedContract?.status === 'signed'}
            />
          </div>
        );
      case 'signature':
        return (
          <div>
            <label className="text-white/60 text-sm block mb-1">{field.label}</label>
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center">
              {selectedContract?.status === 'signed' ? (
                <div className="text-green-400 flex items-center justify-center gap-2">
                  <CheckCircle size={20} /> Signé électroniquement
                </div>
              ) : (
                <p className="text-white/40">La signature sera validée par code email</p>
              )}
            </div>
          </div>
        );
      default:
        return (
          <div>
            <label className="text-white/60 text-sm block mb-1">{field.label} {field.required && '*'}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
              placeholder={`Entrez ${field.label.toLowerCase()}`}
              disabled={selectedContract?.status === 'signed'}
            />
          </div>
        );
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-white/60">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <FileText className="text-amber-400" /> Mes Contrats
      </h2>

      {contracts.length === 0 ? (
        <div className="text-center py-12 text-white/60">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>Aucun contrat disponible</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <FileText className="text-amber-400" size={32} />
                <div>
                  <h3 className="text-white font-bold">{contract.template_name || 'Contrat'}</h3>
                  <p className="text-white/60 text-sm">
                    {contract.sent_at && `Reçu le ${new Date(contract.sent_at).toLocaleDateString('fr-FR')}`}
                    {contract.signed_at && ` • Signé le ${new Date(contract.signed_at).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(contract.status)}
                <button
                  onClick={() => openContract(contract)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    contract.status === 'signed'
                      ? 'bg-slate-700 text-white'
                      : 'bg-amber-500 text-black'
                  }`}
                >
                  {contract.status === 'signed' ? 'Voir' : 'Remplir et signer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contract Modal */}
      {selectedContract && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedContract.template_name || 'Contrat'}</h3>
                {getStatusBadge(selectedContract.status)}
              </div>
              <button onClick={() => setSelectedContract(null)} className="text-white/60 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {selectedContract.status === 'signed' ? (
                <div className="text-center py-12">
                  <CheckCircle size={64} className="mx-auto text-green-400 mb-4" />
                  <h4 className="text-2xl font-bold text-white mb-2">Contrat signé !</h4>
                  <p className="text-white/60">
                    Signé le {new Date(selectedContract.signed_at).toLocaleDateString('fr-FR')} à {new Date(selectedContract.signed_at).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* PDF Preview */}
                  {selectedContract.pdf_url && (
                    <div className="bg-white rounded-lg overflow-hidden" style={{ height: '400px' }}>
                      <iframe
                        src={`${API.replace('/api', '')}${selectedContract.pdf_url}`}
                        className="w-full h-full"
                        title="Contrat PDF"
                      />
                    </div>
                  )}

                  {/* Form Fields */}
                  <div className="bg-slate-800 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <PenTool className="text-amber-400" /> Informations à remplir
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedContract.fields?.map((field) => (
                        <div key={field.id}>{renderField(field)}</div>
                      ))}
                    </div>
                  </div>

                  {/* Alert */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-amber-400 font-medium">Signature électronique</p>
                      <p className="text-white/60 text-sm">
                        Après avoir rempli tous les champs, cliquez sur "Signer". Un code de validation vous sera envoyé par email.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {selectedContract.status !== 'signed' && (
              <div className="p-4 border-t border-slate-700 flex gap-3">
                <button
                  onClick={saveFields}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
                <button
                  onClick={requestOtp}
                  disabled={requestingOtp}
                  className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg flex items-center justify-center gap-2"
                >
                  <PenTool size={18} /> {requestingOtp ? 'Envoi du code...' : 'Signer le contrat'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4 text-center">Validation de signature</h3>
            <p className="text-white/60 text-center mb-6">
              Un code de validation a été envoyé à votre adresse email. Entrez-le ci-dessous pour signer le contrat.
            </p>
            
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Code à 6 chiffres"
              maxLength={6}
              className="w-full px-4 py-4 bg-slate-800 text-white text-center text-2xl tracking-[0.5em] rounded-lg border border-slate-700 mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowOtpModal(false); setOtpCode(''); }}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={signContract}
                disabled={signing}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
              >
                {signing ? 'Validation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientContracts;
