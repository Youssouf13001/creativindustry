/**
 * VIP Client Video Page - Premium Streaming Experience
 * Page de visionnage pour les clients VIP
 */

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Play, LogOut, Film, Eye, Search, X, ChevronLeft, Clock, Star } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "/api";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function VIPClientPage() {
  const [token, setToken] = useState(localStorage.getItem("vip_token"));
  const [client, setClient] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (token) {
      const saved = localStorage.getItem("vip_client");
      if (saved) setClient(JSON.parse(saved));
      fetchVideos();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchVideos = async () => {
    try {
      const res = await axios.get(`${API}/vip/my-videos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(res.data);
    } catch (e) {
      if (e.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const res = await axios.post(`${API}/vip/login`, { email, password });
      localStorage.setItem("vip_token", res.data.token);
      localStorage.setItem("vip_client", JSON.stringify(res.data.client));
      setToken(res.data.token);
      setClient(res.data.client);
      return true;
    } catch (e) {
      return e.response?.data?.detail || "Erreur de connexion";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("vip_token");
    localStorage.removeItem("vip_client");
    setToken(null);
    setClient(null);
    setVideos([]);
  };

  if (!token) return <LoginScreen onLogin={handleLogin} />;
  if (playingVideo) return <VideoPlayer video={playingVideo} token={token} onBack={() => setPlayingVideo(null)} />;

  // Group by category
  const filtered = videos.filter(v =>
    !search || v.title?.toLowerCase().includes(search.toLowerCase())
  );
  const categories = {};
  filtered.forEach(v => {
    const cat = v.category || "Non classé";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(v);
  });

  // Featured video = most recent or first
  const featured = videos[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)" }}>
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-black tracking-tighter">
              <span className="text-red-600">CREATIV</span><span className="text-white">INDUSTRY</span>
            </h1>
            <span className="text-white/30 text-xs uppercase tracking-[0.3em] border border-white/20 px-3 py-1 rounded-full">Espace VIP</span>
          </div>
          <div className="flex items-center gap-5">
            {showSearch ? (
              <div className="flex items-center bg-black/80 border border-white/20 rounded-lg overflow-hidden animate-in slide-in-from-right">
                <Search size={16} className="text-white/40 ml-3" />
                <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
                  autoFocus className="bg-transparent px-3 py-2 text-white text-sm w-48 outline-none" />
                <button onClick={() => { setShowSearch(false); setSearch(""); }} className="p-2 text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)} className="text-white/50 hover:text-white transition-colors p-2">
                <Search size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-red-900/30">
                {client?.name?.charAt(0)?.toUpperCase() || "V"}
              </div>
              <span className="text-white/60 text-sm hidden md:block">{client?.name}</span>
            </div>
            <button onClick={handleLogout} className="text-white/30 hover:text-white/70 transition-colors" title="Déconnexion">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pb-16">
        {loading ? (
          <div className="flex items-center justify-center h-screen">
            <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <EmptyState clientName={client?.name} />
        ) : (
          <>
            {/* Hero Featured Video */}
            {featured && (
              <section className="relative h-[75vh] min-h-[500px]">
                <div className="absolute inset-0">
                  {featured.thumbnail ? (
                    <img src={`${API}/vip/thumbnails/${featured.thumbnail}`} alt=""
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black" />
                  )}
                  {/* Multi-layer gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 px-8 pb-16">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {featured.category || "Vidéo"}
                      </span>
                      {featured.created_at && (
                        <span className="text-white/30 text-sm">{formatDate(featured.created_at)}</span>
                      )}
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">{featured.title}</h2>
                    {featured.description && (
                      <p className="text-white/50 text-lg mb-8 line-clamp-2">{featured.description}</p>
                    )}
                    <button
                      onClick={() => setPlayingVideo(featured)}
                      className="group flex items-center gap-3 bg-white text-black font-bold px-8 py-4 rounded-lg hover:bg-white/90 transition-all shadow-2xl shadow-white/10"
                      data-testid="play-featured-btn"
                    >
                      <Play size={22} className="group-hover:scale-110 transition-transform" fill="black" />
                      Regarder
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Video Categories */}
            <div className="px-8 space-y-12 mt-4">
              {Object.entries(categories).map(([cat, catVideos]) => (
                <section key={cat}>
                  <h3 className="text-white text-xl font-bold mb-5 flex items-center gap-3">
                    <div className="w-1 h-6 bg-red-600 rounded-full" />
                    {cat}
                    <span className="text-white/20 text-sm font-normal ml-2">{catVideos.length} vidéo{catVideos.length > 1 ? "s" : ""}</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {catVideos.map(video => (
                      <VideoCard key={video.id} video={video} onClick={() => setPlayingVideo(video)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ==================== VIDEO CARD ====================

function VideoCard({ video, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-red-900/10"
      data-testid={`vip-video-${video.id}`}
    >
      <div className="relative aspect-video overflow-hidden">
        {video.thumbnail ? (
          <img src={`${API}/vip/thumbnails/${video.thumbnail}`} alt=""
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <Film size={36} className="text-white/10" />
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play size={24} className="text-white ml-0.5" fill="white" />
          </div>
        </div>
        {/* Category badge */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="bg-red-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
            {video.category}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h4 className="text-white font-semibold truncate group-hover:text-red-400 transition-colors">{video.title}</h4>
        {video.description && (
          <p className="text-white/30 text-sm mt-1.5 line-clamp-2 leading-relaxed">{video.description}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-white/20 text-xs">
          {video.created_at && (
            <span className="flex items-center gap-1">
              <Clock size={11} /> {formatDate(video.created_at)}
            </span>
          )}
          {video.views > 0 && (
            <span className="flex items-center gap-1"><Eye size={11} /> {video.views}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== EMPTY STATE ====================

function EmptyState({ clientName }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600/20 to-red-900/10 flex items-center justify-center border border-red-600/20">
          <Film size={40} className="text-red-600/40" />
        </div>
        <div className="absolute -inset-4 rounded-full bg-red-600/5 animate-pulse" />
      </div>
      <h2 className="text-white text-2xl font-bold mb-3">
        Bienvenue{clientName ? `, ${clientName}` : ""} !
      </h2>
      <p className="text-white/30 max-w-md leading-relaxed">
        Votre espace privé est prêt. Vos vidéos apparaîtront ici dès qu'elles seront publiées par CREATIVINDUSTRY.
      </p>
      <div className="mt-8 flex items-center gap-2 text-white/15 text-xs">
        <Star size={12} /> Contenu exclusif réservé
      </div>
    </div>
  );
}

// ==================== LOGIN SCREEN ====================

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await onLogin(email, password);
    if (result !== true) setError(result);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1775250869743-d08c72844f6e?w=1920&q=80"
          alt=""
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tighter mb-1">
            <span className="text-red-600">CREATIV</span><span className="text-white">INDUSTRY</span>
          </h1>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="w-8 h-px bg-white/20" />
            <span className="text-white/30 text-xs uppercase tracking-[0.3em]">Espace VIP</span>
            <div className="w-8 h-px bg-white/20" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-5 shadow-2xl">
          <h2 className="text-xl font-bold text-white">Connexion</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-white/40 text-xs uppercase tracking-wider mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-500/50 outline-none transition-colors"
              placeholder="votre@email.com" required data-testid="vip-email" />
          </div>
          <div>
            <label className="block text-white/40 text-xs uppercase tracking-wider mb-2">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-500/50 outline-none transition-colors"
              placeholder="Votre mot de passe" required data-testid="vip-password" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 transition-all shadow-lg shadow-red-600/20"
            data-testid="vip-login-btn">
            {loading ? "Connexion..." : "Accéder à mon espace"}
          </button>
        </form>

        <p className="text-center text-white/15 text-xs mt-8">
          Accès réservé aux clients CREATIVINDUSTRY
        </p>
      </div>
    </div>
  );
}

// ==================== VIDEO PLAYER ====================

function VideoPlayer({ video, token, onBack }) {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0 z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group">
          <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Retour</span>
        </button>
        <div className="flex-1" />
        <span className="text-white/20 text-sm">{video.category}</span>
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center bg-black">
        <video
          src={`${API}/vip/stream/${video.id}`}
          controls
          autoPlay
          className="max-w-full max-h-[85vh] w-full"
          style={{ aspectRatio: "16/9" }}
          data-testid="vip-video-player"
        />
      </div>

      {/* Info bar */}
      <div className="px-8 py-6 bg-gradient-to-t from-zinc-900/50 to-transparent">
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-red-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              {video.category}
            </span>
            {video.created_at && <span className="text-white/20 text-sm">{formatDate(video.created_at)}</span>}
          </div>
          <h3 className="text-white text-2xl font-bold">{video.title}</h3>
          {video.description && <p className="text-white/40 mt-2 max-w-2xl">{video.description}</p>}
        </div>
      </div>
    </div>
  );
}
