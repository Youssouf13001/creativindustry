import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Download, Loader, X, CheckCircle, Clock, Image } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";

const PhotoFindDownloadPage = () => {
  const { purchaseId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadInfo, setDownloadInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchDownloadInfo();
  }, [purchaseId, token]);

  const fetchDownloadInfo = async () => {
    if (!token) {
      setError("Lien invalide - token manquant");
      setLoading(false);
      return;
    }
    
    try {
      const res = await axios.get(`${API}/public/photofind/download/${purchaseId}?token=${token}`);
      setDownloadInfo(res.data);
    } catch (e) {
      const msg = e.response?.data?.detail || "Lien invalide ou expiré";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const downloadAllAsZip = async () => {
    setDownloading(true);
    try {
      const response = await axios.get(
        `${API}/public/photofind/download/${purchaseId}/zip?token=${token}`,
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${downloadInfo.event_name.replace(/\s+/g, '_')}_photos.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Téléchargement démarré !");
    } catch (e) {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloading(false);
    }
  };

  const downloadSinglePhoto = (photo) => {
    const link = document.createElement('a');
    link.href = `${BACKEND_URL}${photo.url}`;
    link.setAttribute('download', photo.filename);
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <X className="mx-auto text-red-500 mb-4" size={64} />
          <h1 className="text-2xl font-primary text-white mb-2">Oops !</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <p className="text-white/40 text-sm">
            Si vous pensez qu'il s'agit d'une erreur, contactez le photographe.
          </p>
        </div>
      </div>
    );
  }

  const expiresDate = downloadInfo.expires ? new Date(downloadInfo.expires) : null;
  const daysLeft = expiresDate ? Math.ceil((expiresDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-transparent py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
          <h1 className="font-primary text-3xl md:text-4xl text-white mb-2">
            Vos photos sont prêtes !
          </h1>
          <p className="text-white/60">
            Bonjour <span className="text-primary">{downloadInfo.customer_name}</span>
          </p>
          <p className="text-white/40 mt-2">
            {downloadInfo.num_photos} photo(s) de <span className="text-white">{downloadInfo.event_name}</span>
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Expiration Warning */}
        {expiresDate && (
          <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${daysLeft <= 2 ? 'bg-red-500/20 border border-red-500/30' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
            <Clock className={daysLeft <= 2 ? 'text-red-500' : 'text-yellow-500'} size={24} />
            <div>
              <p className={`font-medium ${daysLeft <= 2 ? 'text-red-400' : 'text-yellow-400'}`}>
                {daysLeft <= 0 ? 'Ce lien a expiré !' : `Il vous reste ${daysLeft} jour(s) pour télécharger`}
              </p>
              <p className="text-white/60 text-sm">
                Lien valable jusqu'au {expiresDate.toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        )}

        {/* Download All Button */}
        <div className="bg-card border border-white/10 rounded-xl p-6 mb-8 text-center">
          <h2 className="font-primary text-xl text-white mb-4">
            Télécharger toutes les photos
          </h2>
          <button
            onClick={downloadAllAsZip}
            disabled={downloading}
            className="px-8 py-4 bg-primary text-black font-bold rounded-lg text-lg flex items-center gap-3 mx-auto disabled:opacity-50"
          >
            {downloading ? (
              <><Loader className="animate-spin" size={24} /> Préparation...</>
            ) : (
              <><Download size={24} /> Télécharger en ZIP ({downloadInfo.num_photos} photos)</>
            )}
          </button>
          <p className="text-white/40 text-sm mt-3">
            Toutes vos photos en haute qualité dans un seul fichier
          </p>
        </div>

        {/* Individual Photos */}
        <div>
          <h3 className="font-primary text-lg text-white mb-4 flex items-center gap-2">
            <Image size={20} className="text-primary" />
            Ou téléchargez individuellement
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {downloadInfo.photos.map((photo, index) => (
              <div 
                key={photo.id}
                className="relative group rounded-lg overflow-hidden border border-white/10"
              >
                <img
                  src={`${BACKEND_URL}${photo.url}`}
                  alt={`Photo ${index + 1}`}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => downloadSinglePhoto(photo)}
                    className="px-4 py-2 bg-primary text-black font-bold rounded-lg flex items-center gap-2"
                  >
                    <Download size={16} /> Télécharger
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                  Photo {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-white/40 text-sm">
            Merci pour votre confiance !
          </p>
          <p className="text-primary mt-2">
            <a href="https://creativindustry.com" className="hover:underline">
              CREATIVINDUSTRY France
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhotoFindDownloadPage;
