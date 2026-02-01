import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Video, Image, FileText, Download, LogOut, FolderOpen, Check, X, Camera, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";

const ClientDashboard = () => {
  const [files, setFiles] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isValidated, setIsValidated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("galleries");
  const [clientUser, setClientUser] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
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
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  const fetchData = async () => {
    try {
      const [filesRes, galleriesRes] = await Promise.all([
        axios.get(`${API}/client/files`, { headers }),
        axios.get(`${API}/client/galleries`, { headers })
      ]);
      setFiles(filesRes.data);
      setGalleries(galleriesRes.data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem("client_token");
        navigate("/client");
      }
    } finally {
      setLoading(false);
    }
  };

  const openGallery = async (gallery) => {
    try {
      const res = await axios.get(`${API}/client/galleries/${gallery.id}`, { headers });
      setSelectedGallery(res.data);
      setSelectedPhotos(res.data.selected_photo_ids || []);
      setIsValidated(res.data.is_validated || false);
    } catch (e) {
      toast.error("Erreur lors du chargement de la galerie");
    }
  };

  const togglePhotoSelection = (photoId, e) => {
    e.stopPropagation();
    if (isValidated) return; // Can't modify if already validated
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const openLightbox = (photo, index) => {
    setLightboxPhoto(photo);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxPhoto(null);
  };

  const nextPhoto = (e) => {
    e.stopPropagation();
    if (!selectedGallery?.photos) return;
    const nextIndex = (lightboxIndex + 1) % selectedGallery.photos.length;
    setLightboxIndex(nextIndex);
    setLightboxPhoto(selectedGallery.photos[nextIndex]);
  };

  const prevPhoto = (e) => {
    e.stopPropagation();
    if (!selectedGallery?.photos) return;
    const prevIndex = (lightboxIndex - 1 + selectedGallery.photos.length) % selectedGallery.photos.length;
    setLightboxIndex(prevIndex);
    setLightboxPhoto(selectedGallery.photos[prevIndex]);
  };

  const saveSelection = async () => {
    if (!selectedGallery) return;
    try {
      await axios.post(`${API}/client/galleries/${selectedGallery.id}/selection`, {
        selected_photo_ids: selectedPhotos
      }, { headers });
      toast.success("Sélection sauvegardée !");
    } catch (e) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const validateSelection = async () => {
    if (!selectedGallery || selectedPhotos.length === 0) {
      toast.error("Veuillez sélectionner au moins une photo");
      return;
    }
    
    // First save the selection
    try {
      await axios.post(`${API}/client/galleries/${selectedGallery.id}/selection`, {
        selected_photo_ids: selectedPhotos
      }, { headers });
    } catch (e) {
      toast.error("Erreur lors de la sauvegarde");
      return;
    }
    
    // Then validate
    if (!window.confirm(`Valider définitivement votre sélection de ${selectedPhotos.length} photo(s) ? L'équipe sera notifiée et commencera le travail de retouche.`)) {
      return;
    }
    
    try {
      await axios.post(`${API}/client/galleries/${selectedGallery.id}/validate`, {}, { headers });
      setIsValidated(true);
      toast.success("Sélection validée ! L'équipe a été notifiée.");
      fetchData();
    } catch (e) {
      toast.error("Erreur lors de la validation");
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
              <span className="text-gold-gradient">Mon Espace</span>
            </h1>
            {clientUser && (
              <p className="text-white/60 mt-1">Bienvenue, {clientUser.name}</p>
            )}
          </div>
          <button onClick={logout} className="btn-outline px-6 py-2 text-sm flex items-center gap-2" data-testid="client-logout-btn">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
          <button
            onClick={() => { setActiveTab("galleries"); setSelectedGallery(null); }}
            className={`font-primary text-sm uppercase tracking-wider pb-2 border-b-2 transition-colors ${
              activeTab === "galleries" ? "border-primary text-primary" : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            📸 Sélection Photos
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`font-primary text-sm uppercase tracking-wider pb-2 border-b-2 transition-colors ${
              activeTab === "files" ? "border-primary text-primary" : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            📁 Mes Fichiers
          </button>
        </div>

        {loading ? (
          <div className="text-center text-white/60 py-20">Chargement...</div>
        ) : (
          <>
            {/* Galleries Tab */}
            {activeTab === "galleries" && !selectedGallery && (
              <div>
                <p className="text-white/60 mb-6">
                  Parcourez vos galeries photos et sélectionnez les images que vous souhaitez faire retoucher.
                </p>
                
                {galleries.length === 0 ? (
                  <div className="text-center py-20">
                    <Camera className="mx-auto text-white/30 mb-4" size={64} />
                    <h2 className="font-primary font-bold text-xl mb-2">Aucune galerie disponible</h2>
                    <p className="text-white/60">Vos galeries photos apparaîtront ici une fois mises à disposition par notre équipe.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {galleries.map((gallery) => (
                      <div 
                        key={gallery.id}
                        onClick={() => openGallery(gallery)}
                        className="bg-card border border-white/10 p-6 cursor-pointer hover:border-primary transition-colors"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-primary font-bold text-lg">{gallery.name}</h3>
                          {gallery.is_validated && (
                            <span className="bg-green-500/20 text-green-500 text-xs px-2 py-1 flex items-center gap-1">
                              <Check size={12} /> Validé
                            </span>
                          )}
                        </div>
                        {gallery.description && (
                          <p className="text-white/60 text-sm mb-4">{gallery.description}</p>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">{gallery.photo_count} photos</span>
                          <span className="text-primary">{gallery.selection_count} sélectionnées</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Gallery Detail View */}
            {activeTab === "galleries" && selectedGallery && (
              <div>
                <button 
                  onClick={() => setSelectedGallery(null)}
                  className="text-primary hover:underline text-sm mb-4"
                >
                  ← Retour aux galeries
                </button>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="font-primary font-bold text-2xl">{selectedGallery.name}</h2>
                    {selectedGallery.description && (
                      <p className="text-white/60">{selectedGallery.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{selectedPhotos.length}</p>
                    <p className="text-white/60 text-sm">photo(s) sélectionnée(s)</p>
                  </div>
                </div>

                {isValidated ? (
                  <div className="bg-green-500/20 border border-green-500 p-4 mb-6 flex items-center gap-3">
                    <Check size={24} className="text-green-500" />
                    <div>
                      <p className="font-bold text-green-500">Sélection validée !</p>
                      <p className="text-white/70 text-sm">Notre équipe travaille sur vos photos sélectionnées.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-primary/10 border border-primary/30 p-4 mb-6">
                    <p className="text-sm text-white/70 mb-3">
                      <strong>Instructions :</strong> Cliquez sur les photos que vous souhaitez faire retoucher. 
                      Une fois votre sélection terminée, cliquez sur "Valider ma sélection".
                    </p>
                    <div className="flex gap-3">
                      <button 
                        onClick={saveSelection}
                        className="btn-outline px-6 py-2 text-sm"
                      >
                        Sauvegarder (brouillon)
                      </button>
                      <button 
                        onClick={validateSelection}
                        disabled={selectedPhotos.length === 0}
                        className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
                      >
                        ✓ Valider ma sélection ({selectedPhotos.length})
                      </button>
                    </div>
                  </div>
                )}

                {/* Photos Grid */}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {selectedGallery.photos?.map((photo) => {
                    const isSelected = selectedPhotos.includes(photo.id);
                    return (
                      <div 
                        key={photo.id}
                        onClick={() => togglePhotoSelection(photo.id)}
                        className={`relative aspect-square cursor-pointer transition-all ${
                          isSelected ? 'ring-4 ring-primary scale-95' : 'hover:opacity-80'
                        } ${isValidated && !isSelected ? 'opacity-30' : ''}`}
                      >
                        <img 
                          src={`${BACKEND_URL}${photo.url}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <div className="bg-primary text-black p-2 rounded-full">
                              <Check size={24} />
                            </div>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-black text-xs font-bold w-6 h-6 flex items-center justify-center">
                            {selectedPhotos.indexOf(photo.id) + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Files Tab */}
            {activeTab === "files" && (
              <>
                {files.length === 0 ? (
                  <div className="text-center py-20">
                    <FolderOpen className="mx-auto text-white/30 mb-4" size={64} />
                    <h2 className="font-primary font-bold text-xl mb-2">Aucun fichier disponible</h2>
                    <p className="text-white/60">Vos fichiers (vidéos et photos retouchées) apparaîtront ici une fois mis à disposition par notre équipe.</p>
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
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
