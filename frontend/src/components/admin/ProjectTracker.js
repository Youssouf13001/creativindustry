import { useState, useEffect } from "react";
import axios from "axios";
import { ChevronRight, Check, Clock, Circle, Send, User } from "lucide-react";
import { toast } from "sonner";
import { API } from "../../config/api";

const PROJECT_STEPS = [
  { step: 1, label: "Vidage des cartes mémoire", description: "Transfert de vos fichiers en cours" },
  { step: 2, label: "Sauvegarde sur nos serveurs", description: "Vos fichiers sont sauvegardés en sécurité" },
  { step: 3, label: "Tri et sélection", description: "Sélection des meilleures prises" },
  { step: 4, label: "Retouche / Montage", description: "Édition et retouche en cours" },
  { step: 5, label: "Vérification qualité", description: "Contrôle qualité final" },
  { step: 6, label: "Livraison", description: "Votre projet est prêt !" },
];

const ProjectTracker = ({ token, clients = [] }) => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientProject, setClientProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const loadClientProject = async (clientId) => {
    if (!clientId) {
      setClientProject(null);
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/client-project/${clientId}`, { headers });
      setClientProject(res.data);
    } catch (error) {
      console.error("Error loading project:", error);
      setClientProject({ client_id: clientId, current_step: 0, steps: PROJECT_STEPS });
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client);
    loadClientProject(clientId);
  };

  const handleStepChange = async (newStep) => {
    if (!selectedClient) return;
    
    setUpdating(true);
    try {
      const res = await axios.put(
        `${API}/admin/client-project/${selectedClient.id}`,
        { current_step: newStep },
        { headers }
      );
      setClientProject(res.data.project);
      toast.success(`Étape mise à jour ! Email envoyé à ${selectedClient.email}`);
    } catch (error) {
      console.error("Project update error:", error.response?.data || error);
      toast.error(error.response?.data?.detail || "Erreur lors de la mise à jour");
    } finally {
      setUpdating(false);
    }
  };

  const currentStep = clientProject?.current_step || 0;
  const progressPercentage = currentStep > 0 ? Math.round((currentStep / PROJECT_STEPS.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Suivi de Projet</h2>
          <p className="text-white/60">Gérez l'avancement des projets clients</p>
        </div>
      </div>

      {/* Client Selection */}
      <div className="bg-card border border-white/10 rounded-xl p-6">
        <label className="block text-white/60 text-sm mb-2">Sélectionner un client</label>
        <select
          value={selectedClient?.id || ""}
          onChange={(e) => handleClientChange(e.target.value)}
          className="w-full md:w-1/2 bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-white text-lg [&>option]:bg-[#1a1a1a] [&>option]:text-white"
        >
          <option value="">-- Choisir un client --</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.email})
            </option>
          ))}
        </select>
      </div>

      {/* Project Progress */}
      {selectedClient && (
        <div className="bg-card border border-white/10 rounded-xl p-6 space-y-6">
          {/* Client Info */}
          <div className="flex items-center gap-4 pb-4 border-b border-white/10">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">{selectedClient.name}</h3>
              <p className="text-white/60">{selectedClient.email}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-white/60">Chargement...</div>
          ) : (
            <>
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/60">Progression globale</span>
                  <span className="text-primary font-bold text-2xl">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-primary via-yellow-500 to-green-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <h4 className="text-white font-medium">Cliquez sur une étape pour mettre à jour :</h4>
                
                {PROJECT_STEPS.map((step, idx) => {
                  const isCompleted = step.step < currentStep;
                  const isCurrent = step.step === currentStep;
                  const isPending = step.step > currentStep;
                  
                  return (
                    <button
                      key={step.step}
                      onClick={() => handleStepChange(step.step)}
                      disabled={updating}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                        isCurrent 
                          ? "bg-primary/20 border-primary text-white" 
                          : isCompleted
                          ? "bg-green-500/10 border-green-500/30 text-green-400"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20"
                      } ${updating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {/* Step Number/Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted 
                          ? "bg-green-500 text-white" 
                          : isCurrent
                          ? "bg-primary text-black"
                          : "bg-white/10 text-white/40"
                      }`}>
                        {isCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : isCurrent ? (
                          <Clock className="w-5 h-5" />
                        ) : (
                          <span className="font-bold">{step.step}</span>
                        )}
                      </div>
                      
                      {/* Step Info */}
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${isCurrent ? "text-white" : isCompleted ? "text-green-400" : "text-white/60"}`}>
                          {step.label}
                        </p>
                        <p className="text-sm text-white/40">{step.description}</p>
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isCompleted 
                          ? "bg-green-500/20 text-green-400" 
                          : isCurrent
                          ? "bg-primary/20 text-primary"
                          : "bg-white/5 text-white/40"
                      }`}>
                        {isCompleted ? "Terminé ✓" : isCurrent ? "En cours" : "À venir"}
                      </div>
                      
                      {/* Arrow */}
                      <ChevronRight className={`w-5 h-5 ${isCurrent ? "text-primary" : "text-white/20"}`} />
                    </button>
                  );
                })}
                
                {/* Complete Project Button - Show when on last step */}
                {currentStep === PROJECT_STEPS.length && (
                  <button
                    onClick={() => handleStepChange(PROJECT_STEPS.length + 1)}
                    disabled={updating}
                    className={`w-full flex items-center justify-center gap-3 p-4 rounded-lg border-2 border-green-500 bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all ${updating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <Check className="w-6 h-6" />
                    <span className="font-bold text-lg">✅ Marquer le projet comme TERMINÉ</span>
                  </button>
                )}
                
                {/* Project Completed State */}
                {currentStep > PROJECT_STEPS.length && (
                  <div className="w-full p-6 rounded-lg border-2 border-green-500 bg-green-500/20 text-center">
                    <Check className="w-12 h-12 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-bold text-xl">🎉 Projet terminé !</p>
                    <p className="text-green-400/70 text-sm mt-1">Toutes les étapes sont complétées</p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-start gap-3">
                <Send className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-white font-medium">Notification automatique</p>
                  <p className="text-white/60 text-sm">
                    Un email est envoyé automatiquement au client à chaque changement d'étape.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedClient && (
        <div className="bg-card border border-white/10 rounded-xl p-12 text-center">
          <User className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white/60">Sélectionnez un client</h3>
          <p className="text-white/40 mt-2">Choisissez un client pour gérer l'avancement de son projet</p>
        </div>
      )}
    </div>
  );
};

export default ProjectTracker;
