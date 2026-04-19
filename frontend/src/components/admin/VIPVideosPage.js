/**
 * VIP Video Management Page (Admin)
 * Upload et gestion des vidéos pour clients VIP
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus, Search, Upload, Play, Trash2, Edit, Users, Video,
  ArrowLeft, RefreshCw, Eye, Film, HardDrive, UserPlus, X, Check
} from "lucide-react";
import { API } from "../../config/api";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function VIPVideosPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [vRes, cRes] = await Promise.all([
        axios.get(`${API}/vip/videos`, { headers }),
        axios.get(`${API}/vip/clients`, { headers })
      ]);
      setVideos(vRes.data);
      setClients(cRes.data);
    } catch (e) {
      if (e.response?.status === 401) navigate("/admin");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin/dashboard")} className="p-2 hover:bg-white/10 rounded-lg" data-testid="back-btn">
            <ArrowLeft size={24} className="text-white/70" />
          </button>
          <div>
            <h1 className="text-3xl font-primary text-white mb-1">Espace VIP Vidéo</h1>
            <p className="text-white/60">Plateforme de streaming pour vos clients</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-white/10 rounded-xl p-4">
          <div className="text-white/60 text-sm">Vidéos</div>
          <div className="text-3xl font-bold text-white">{videos.length}</div>
        </div>
        <div className="bg-card border border-white/10 rounded-xl p-4">
          <div className="text-white/60 text-sm">Clients VIP</div>
          <div className="text-3xl font-bold text-blue-400">{clients.length}</div>
        </div>
        <div className="bg-card border border-white/10 rounded-xl p-4">
          <div className="text-white/60 text-sm">Stockage</div>
          <div className="text-3xl font-bold text-amber-400">{formatBytes(videos.reduce((s, v) => s + (v.file_size || 0), 0))}</div>
        </div>
        <div className="bg-card border border-white/10 rounded-xl p-4">
          <div className="text-white/60 text-sm">Vues totales</div>
          <div className="text-3xl font-bold text-green-400">{videos.reduce((s, v) => s + (v.views || 0), 0)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
        {[
          { id: "videos", label: "Vidéos", icon: Film },
          { id: "clients", label: "Clients VIP", icon: Users },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === tab.id ? "bg-primary text-black font-bold" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
              <Icon size={18} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "videos" && <VideosTab videos={videos} clients={clients} onRefresh={fetchData} headers={headers} />}
      {activeTab === "clients" && <ClientsTab clients={clients} onRefresh={fetchData} headers={headers} />}
    </div>
  );
}

// ==================== VIDEOS TAB ====================

function VideosTab({ videos, clients, onRefresh, headers }) {
  const [showUpload, setShowUpload] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = videos.filter(v =>
    !search || v.title?.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase())
  );

  const deleteVideo = async (id, title) => {
    if (!window.confirm(`Supprimer "${title}" ?`)) return;
    try {
      await axios.delete(`${API}/vip/videos/${id}`, { headers });
      toast.success("Vidéo supprimée");
      onRefresh();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white" />
        </div>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg" data-testid="upload-video-btn">
          <Upload size={20} /> Uploader une vidéo
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/50">
          <Film size={64} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Aucune vidéo</p>
          <button onClick={() => setShowUpload(true)} className="mt-4 text-primary hover:underline">Uploader votre première vidéo</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(video => (
            <div key={video.id} className="bg-card border border-white/10 rounded-xl overflow-hidden group" data-testid={`video-${video.id}`}>
              <div className="relative aspect-video bg-zinc-900 flex items-center justify-center">
                {video.thumbnail ? (
                  <img src={`${API}/vip/thumbnails/${video.thumbnail}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Film size={48} className="text-white/20" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play size={48} className="text-white" />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-white truncate">{video.title}</h3>
                <p className="text-white/50 text-sm mt-1 truncate">{video.description || "Pas de description"}</p>
                <div className="flex items-center gap-3 mt-3 text-white/40 text-xs">
                  <span className="bg-white/10 px-2 py-0.5 rounded">{video.category}</span>
                  <span>{formatBytes(video.file_size)}</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {video.views}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setEditingVideo(video)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70">
                    <Edit size={14} /> Modifier
                  </button>
                  <button onClick={() => deleteVideo(video.id, video.title)}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadModal clients={clients} headers={headers} onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); onRefresh(); }} />}
      {editingVideo && <EditVideoModal video={editingVideo} clients={clients} headers={headers} onClose={() => setEditingVideo(null)} onDone={() => { setEditingVideo(null); onRefresh(); }} />}
    </div>
  );
}

// ==================== UPLOAD MODAL ====================

function UploadModal({ clients, headers, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "", client_ids: [] });
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

  const handleUpload = async () => {
    if (!file) { toast.error("Sélectionnez un fichier"); return; }
    setUploading(true);

    const upload_id = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let lastResponse = null;

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const fd = new FormData();
        fd.append("chunk", chunk);
        fd.append("upload_id", upload_id);
        fd.append("chunk_index", i);
        fd.append("total_chunks", totalChunks);
        fd.append("filename", file.name);
        fd.append("title", form.title || file.name);
        fd.append("description", form.description);
        fd.append("category", form.category);
        fd.append("client_ids", form.client_ids.join(","));

        lastResponse = await axios.post(`${API}/vip/videos/upload-chunk`, fd, { headers });
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      if (lastResponse?.data?.status === "complete") {
        toast.success("Vidéo uploadée !");
        onDone();
      }
    } catch (e) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const toggleClient = (id) => {
    setForm(prev => ({
      ...prev,
      client_ids: prev.client_ids.includes(id) ? prev.client_ids.filter(c => c !== id) : [...prev.client_ids, id]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-white/10 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Uploader une vidéo</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* File picker */}
          <div>
            <label className="block text-white/60 text-sm mb-2">Fichier vidéo *</label>
            {!file ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-xl p-8 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload size={32} className="text-white/30 mb-2" />
                <span className="text-white/50">Cliquez pour sélectionner</span>
                <span className="text-white/30 text-xs mt-1">MP4, MOV, AVI — Max 50 Go</span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => {
                  if (e.target.files[0]) {
                    setFile(e.target.files[0]);
                    if (!form.title) setForm(f => ({ ...f, title: e.target.files[0].name.replace(/\.[^.]+$/, '') }));
                  }
                }} />
              </label>
            ) : (
              <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                <Video size={20} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">{file.name}</p>
                  <p className="text-white/50 text-xs">{formatBytes(file.size)}</p>
                </div>
                <button onClick={() => setFile(null)} className="text-white/50 hover:text-red-400"><X size={16} /></button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-1">Titre</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Titre de la vidéo" />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Description..." />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-1">Catégorie</label>
            <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Ex: Mariage, Corporate, Shooting..." />
          </div>

          {/* Assign to clients */}
          {clients.length > 0 && (
            <div>
              <label className="block text-white/60 text-sm mb-2">Attribuer à des clients</label>
              <div className="space-y-1 max-h-32 overflow-y-auto border border-white/10 rounded-lg p-2">
                {clients.map(c => (
                  <label key={c.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${form.client_ids.includes(c.id) ? "bg-primary/10" : "hover:bg-white/5"}`}>
                    <input type="checkbox" checked={form.client_ids.includes(c.id)} onChange={() => toggleClient(c.id)} className="w-4 h-4" />
                    <span className="text-white text-sm">{c.name}</span>
                    <span className="text-white/40 text-xs">{c.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">Upload en cours...</span>
                <span className="text-primary font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3">
                <div className="bg-primary h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-white/10 flex gap-3">
          <button onClick={onClose} disabled={uploading} className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white disabled:opacity-50">Annuler</button>
          <button onClick={handleUpload} disabled={uploading || !file}
            className="flex-1 px-4 py-2 bg-primary text-black font-bold rounded-lg disabled:opacity-50" data-testid="upload-submit-btn">
            {uploading ? `Upload... ${progress}%` : "Uploader"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== EDIT VIDEO MODAL ====================

function EditVideoModal({ video, clients, headers, onClose, onDone }) {
  const [form, setForm] = useState({
    title: video.title || "", description: video.description || "",
    category: video.category || "", client_ids: video.client_ids || []
  });
  const [saving, setSaving] = useState(false);

  const toggleClient = (id) => {
    setForm(prev => ({
      ...prev,
      client_ids: prev.client_ids.includes(id) ? prev.client_ids.filter(c => c !== id) : [...prev.client_ids, id]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/vip/videos/${video.id}`, form, { headers });
      toast.success("Vidéo mise à jour");
      onDone();
    } catch (e) {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-white/10 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Modifier la vidéo</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-1">Titre</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-1">Catégorie</label>
            <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>
          {clients.length > 0 && (
            <div>
              <label className="block text-white/60 text-sm mb-2">Clients assignés</label>
              <div className="space-y-1 max-h-32 overflow-y-auto border border-white/10 rounded-lg p-2">
                {clients.map(c => (
                  <label key={c.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${form.client_ids.includes(c.id) ? "bg-primary/10" : "hover:bg-white/5"}`}>
                    <input type="checkbox" checked={form.client_ids.includes(c.id)} onChange={() => toggleClient(c.id)} className="w-4 h-4" />
                    <span className="text-white text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-primary text-black font-bold rounded-lg disabled:opacity-50">
            {saving ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== CLIENTS TAB ====================

function ClientsTab({ clients, onRefresh, headers }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const openEdit = (c) => {
    setEditingClient(c);
    setForm({ name: c.name, email: c.email, password: "", notes: c.notes || "" });
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error("Nom et email requis"); return; }
    if (!editingClient && !form.password) { toast.error("Mot de passe requis"); return; }
    setSaving(true);
    try {
      if (editingClient) {
        const payload = { name: form.name, email: form.email, notes: form.notes };
        if (form.password) payload.password = form.password;
        await axios.put(`${API}/vip/clients/${editingClient.id}`, payload, { headers });
        toast.success("Client mis à jour");
      } else {
        await axios.post(`${API}/vip/clients`, form, { headers });
        toast.success("Client VIP créé");
      }
      setShowAdd(false);
      setEditingClient(null);
      setForm({ name: "", email: "", password: "", notes: "" });
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const deleteClient = async (id, name) => {
    if (!window.confirm(`Supprimer le client "${name}" ?`)) return;
    try {
      await axios.delete(`${API}/vip/clients/${id}`, { headers });
      toast.success("Client supprimé");
      onRefresh();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const toggleActive = async (c) => {
    try {
      await axios.put(`${API}/vip/clients/${c.id}`, { is_active: !c.is_active }, { headers });
      toast.success(c.is_active ? "Compte désactivé" : "Compte activé");
      onRefresh();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button onClick={() => { setShowAdd(true); setForm({ name: "", email: "", password: "", notes: "" }); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg" data-testid="add-client-btn">
          <UserPlus size={20} /> Nouveau client VIP
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-16 text-white/50">
          <Users size={64} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Aucun client VIP</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(c => (
            <div key={c.id} className="bg-card border border-white/10 rounded-xl p-4 flex items-center gap-4" data-testid={`client-${c.id}`}>
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white">{c.name}</h3>
                <p className="text-white/50 text-sm">{c.email}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                  <span>{c.video_count || 0} vidéo(s)</span>
                  {c.last_login && <span>Dernière connexion: {new Date(c.last_login).toLocaleDateString("fr-FR")}</span>}
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${c.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {c.is_active ? "Actif" : "Désactivé"}
              </span>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(c)} className="p-2 hover:bg-white/10 rounded-lg" title={c.is_active ? "Désactiver" : "Activer"}>
                  {c.is_active ? <X size={16} className="text-red-400" /> : <Check size={16} className="text-green-400" />}
                </button>
                <button onClick={() => openEdit(c)} className="p-2 hover:bg-white/10 rounded-lg"><Edit size={16} className="text-white/60" /></button>
                <button onClick={() => deleteClient(c.id, c.name)} className="p-2 hover:bg-red-500/20 rounded-lg"><Trash2 size={16} className="text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAdd || editingClient) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-white/10 rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">{editingClient ? "Modifier le client" : "Nouveau client VIP"}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-1">Nom *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Nom du client" />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="email@client.com" />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">Mot de passe {editingClient ? "(laisser vide pour ne pas changer)" : "*"}</label>
                <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Mot de passe" />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Notes..." />
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button onClick={() => { setShowAdd(false); setEditingClient(null); }} className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-primary text-black font-bold rounded-lg disabled:opacity-50" data-testid="save-client-btn">
                {saving ? "..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
