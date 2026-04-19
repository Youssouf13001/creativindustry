/**
 * VIP Client Video Page - Netflix-style streaming
 * Page de visionnage pour les clients VIP
 */

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Play, LogOut, Film, Eye, Search, X, ChevronLeft } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "/api";

export default function VIPClientPage() {
  const [token, setToken] = useState(localStorage.getItem("vip_token"));
  const [client, setClient] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [search, setSearch] = useState("");

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
      if (e.response?.status === 401) {
        handleLogout();
      }
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

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-red-600 tracking-tight">CREATIVINDUSTRY</h1>
            <span className="text-white/60 text-sm hidden md:block">Espace VIP</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="bg-white/10 border border-white/20 rounded pl-9 pr-4 py-1.5 text-white text-sm w-48 focus:w-64 transition-all" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center text-white font-bold text-sm">
                {client?.name?.charAt(0)?.toUpperCase() || "V"}
              </div>
              <span className="text-white/70 text-sm hidden md:block">{client?.name}</span>
            </div>
            <button onClick={handleLogout} className="text-white/50 hover:text-white p-2" title="Déconnexion">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-20 pb-12 px-6">
        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-white/40">
            <Film size={80} className="mb-6 opacity-30" />
            <p className="text-xl">Aucune vidéo disponible</p>
            <p className="text-sm mt-2">Vos vidéos apparaîtront ici dès qu'elles seront publiées</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(categories).map(([cat, catVideos]) => (
              <section key={cat}>
                <h2 className="text-white text-xl font-bold mb-4">{cat}</h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {catVideos.map(video => (
                    <div
                      key={video.id}
                      onClick={() => setPlayingVideo(video)}
                      className="shrink-0 w-72 cursor-pointer group"
                      data-testid={`vip-video-${video.id}`}
                    >
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900 mb-2">
                        {video.thumbnail ? (
                          <img src={`${API}/vip/thumbnails/${video.thumbnail}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film size={40} className="text-white/10" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={28} className="text-white ml-1" />
                          </div>
                        </div>
                      </div>
                      <h3 className="text-white font-medium text-sm truncate">{video.title}</h3>
                      {video.description && (
                        <p className="text-white/40 text-xs truncate mt-0.5">{video.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
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
    if (result !== true) {
      setError(result);
    }
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-600 tracking-tight mb-2">CREATIVINDUSTRY</h1>
          <p className="text-white/50">Espace VIP — Visionnage privé</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900/80 backdrop-blur border border-white/10 rounded-xl p-8 space-y-5">
          <h2 className="text-xl font-bold text-white">Connexion</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-white/60 text-sm mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-500 outline-none"
              placeholder="votre@email.com" required data-testid="vip-email" />
          </div>
          <div>
            <label className="block text-white/60 text-sm mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-500 outline-none"
              placeholder="Votre mot de passe" required data-testid="vip-password" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors"
            data-testid="vip-login-btn">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-white/30 text-xs mt-6">
          Accès réservé aux clients CREATIVINDUSTRY
        </p>
      </div>
    </div>
  );
}

// ==================== VIDEO PLAYER ====================

function VideoPlayer({ video, token, onBack }) {
  const videoRef = useRef(null);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 bg-black/80 z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <ChevronLeft size={24} />
          <span className="text-sm">Retour</span>
        </button>
        <h2 className="text-white font-bold truncate">{video.title}</h2>
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src={`${API}/vip/stream/${video.id}`}
          controls
          autoPlay
          className="max-w-full max-h-[80vh] w-full"
          style={{ aspectRatio: "16/9" }}
          data-testid="vip-video-player"
        />
      </div>

      {/* Info */}
      <div className="px-6 py-4 bg-zinc-900/50">
        <h3 className="text-white text-lg font-bold">{video.title}</h3>
        {video.description && <p className="text-white/50 mt-1">{video.description}</p>}
        <div className="flex items-center gap-3 mt-2 text-white/30 text-xs">
          <span>{video.category}</span>
          {video.views > 0 && <span className="flex items-center gap-1"><Eye size={12} /> {video.views} vue(s)</span>}
        </div>
      </div>
    </div>
  );
}
