import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Video, Image, FileText, Download, LogOut, FolderOpen } from "lucide-react";
import { API } from "../config/api";

const ClientDashboard = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientUser, setClientUser] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("client_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      navigate("/client");
      return;
    }
    const user = JSON.parse(localStorage.getItem("client_user") || "{}");
    setClientUser(user);
    fetchFiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API}/client/files`, { headers });
      setFiles(res.data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem("client_token");
        navigate("/client");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("client_token");
    localStorage.removeItem("client_user");
    navigate("/client");
  };

  const videos = files.filter(f => f.file_type === "video");
  const photos = files.filter(f => f.file_type === "photo");
  const documents = files.filter(f => f.file_type === "document");

  return (
    <div className="pt-20 min-h-screen" data-testid="client-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-primary font-black text-3xl tracking-tighter uppercase">
              <span className="text-gold-gradient">Mes Fichiers</span>
            </h1>
            {clientUser && (
              <p className="text-white/60 mt-1">Bienvenue, {clientUser.name}</p>
            )}
          </div>
          <button onClick={logout} className="btn-outline px-6 py-2 text-sm flex items-center gap-2" data-testid="client-logout-btn">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>

        {loading ? (
          <div className="text-center text-white/60 py-20">Chargement...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="mx-auto text-white/30 mb-4" size={64} />
            <h2 className="font-primary font-bold text-xl mb-2">Aucun fichier disponible</h2>
            <p className="text-white/60">Vos fichiers (vidéos et photos) apparaîtront ici une fois mis à disposition par notre équipe.</p>
          </div>
        ) : (
          <>
            {/* Videos Section */}
            {videos.length > 0 && (
              <section className="mb-12">
                <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-3">
                  <Video className="text-primary" size={24} /> Mes Vidéos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((file) => (
                    <div key={file.id} className="bg-card border border-white/10 overflow-hidden card-hover" data-testid={`file-${file.id}`}>
                      <div className="relative aspect-video bg-black/50 flex items-center justify-center">
                        {file.thumbnail_url ? (
                          <img src={file.thumbnail_url} alt={file.title} className="w-full h-full object-cover" />
                        ) : (
                          <Video size={48} className="text-white/30" />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-primary font-semibold mb-1">{file.title}</h3>
                        {file.description && <p className="text-white/60 text-sm mb-3">{file.description}</p>}
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary w-full py-2 text-xs inline-flex items-center justify-center gap-2"
                        >
                          <Download size={14} /> Télécharger / Voir
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Photos Section */}
            {photos.length > 0 && (
              <section className="mb-12">
                <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-3">
                  <Image className="text-primary" size={24} /> Mes Photos
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-card border border-white/10 overflow-hidden card-hover group"
                      data-testid={`file-${file.id}`}
                    >
                      <div className="relative aspect-square bg-black/50">
                        {file.thumbnail_url ? (
                          <img src={file.thumbnail_url} alt={file.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image size={32} className="text-white/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Download size={24} className="text-primary" />
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-primary font-semibold text-sm truncate">{file.title}</h3>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Documents Section */}
            {documents.length > 0 && (
              <section>
                <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-3">
                  <FileText className="text-primary" size={24} /> Documents
                </h2>
                <div className="space-y-4">
                  {documents.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-card border border-white/10 p-4 card-hover flex items-center justify-between"
                      data-testid={`file-${file.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="text-primary" size={24} />
                        <div>
                          <h3 className="font-primary font-semibold">{file.title}</h3>
                          {file.description && <p className="text-white/60 text-sm">{file.description}</p>}
                        </div>
                      </div>
                      <Download size={20} className="text-white/60" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
