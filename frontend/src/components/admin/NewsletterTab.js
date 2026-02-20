import { useState } from "react";
import axios from "axios";
import { Mail, Send, Users, UserMinus, Loader, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { API } from "../../config/api";

const NewsletterTab = ({ 
  newsletterStats,
  newsletterSubscribers,
  headers,
  onRefresh
}) => {
  const [newsletterForm, setNewsletterForm] = useState({ subject: "", message: "" });
  const [sendingNewsletter, setSendingNewsletter] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("send");

  const handleSendNewsletter = async (e) => {
    e.preventDefault();
    if (!newsletterForm.subject || !newsletterForm.message) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setSendingNewsletter(true);
    try {
      const res = await axios.post(`${API}/admin/newsletter/send`, {
        subject: newsletterForm.subject,
        content: newsletterForm.message,
        send_to_all: true
      }, { headers });
      
      toast.success(`Newsletter envoyee a ${res.data.sent_count} abonnes`);
      setNewsletterForm({ subject: "", message: "" });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSendingNewsletter(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Mail className="w-6 h-6 text-amber-500" />
          Newsletter
        </h2>
        <button
          onClick={onRefresh}
          className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Abonnes</p>
              <p className="text-2xl font-bold text-white mt-1">{newsletterStats?.subscribed || 0}</p>
            </div>
            <Users className="w-10 h-10 text-green-500/50" />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Desabonnes</p>
              <p className="text-2xl font-bold text-white mt-1">{newsletterStats?.unsubscribed || 0}</p>
            </div>
            <UserMinus className="w-10 h-10 text-red-500/50" />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Newsletters envoyees</p>
              <p className="text-2xl font-bold text-white mt-1">{newsletterStats?.total_sent || 0}</p>
            </div>
            <Send className="w-10 h-10 text-amber-500/50" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveSubTab("send")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSubTab === "send" 
              ? "text-amber-400 border-b-2 border-amber-400" 
              : "text-slate-400 hover:text-white"
          }`}
        >
          Envoyer
        </button>
        <button
          onClick={() => setActiveSubTab("subscribers")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeSubTab === "subscribers" 
              ? "text-amber-400 border-b-2 border-amber-400" 
              : "text-slate-400 hover:text-white"
          }`}
        >
          Abonnes
        </button>
      </div>

      {activeSubTab === "send" && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Envoyer une newsletter</h3>
          <form onSubmit={handleSendNewsletter} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Sujet</label>
              <input
                type="text"
                value={newsletterForm.subject}
                onChange={(e) => setNewsletterForm({ ...newsletterForm, subject: e.target.value })}
                placeholder="Ex: Nouvelle video disponible !"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Message</label>
              <textarea
                value={newsletterForm.message}
                onChange={(e) => setNewsletterForm({ ...newsletterForm, message: e.target.value })}
                placeholder="Contenu de votre newsletter..."
                rows={6}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white resize-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={sendingNewsletter}
              className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-black font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {sendingNewsletter ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer a {newsletterStats?.subscribed || 0} abonnes
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {activeSubTab === "subscribers" && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Liste des abonnes</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {newsletterSubscribers.subscribers?.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div>
                  <p className="text-white">{sub.name}</p>
                  <p className="text-slate-400 text-sm">{sub.email}</p>
                </div>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Abonne</span>
              </div>
            ))}
            {(!newsletterSubscribers.subscribers || newsletterSubscribers.subscribers.length === 0) && (
              <p className="text-slate-400 text-center py-4">Aucun abonne pour le moment</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsletterTab;
