/**
 * UploadPrint - Page mobile pour uploader une photo et l'imprimer sur la borne
 * Le client scanne le QR code affiché sur la borne
 */

import React, { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast, Toaster } from "sonner";
import { 
  Camera, Upload, Check, Loader, Image, X, RotateCcw
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function UploadPrint() {
  const { eventId, sessionId } = useParams();
  
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Gérer la sélection de fichier
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Veuillez sélectionner une image");
        return;
      }
      
      setPhoto(file);
      
      // Créer la prévisualisation
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Uploader la photo
  const uploadPhoto = async () => {
    if (!photo) {
      toast.error("Veuillez sélectionner une photo");
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', photo);
      
      const res = await axios.post(
        `${API}/public/photofind/${eventId}/upload-session/${sessionId}/upload`,
        formData,
        { 
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000
        }
      );
      
      if (res.data.success) {
        setUploaded(true);
        toast.success("Photo envoyée à la borne !");
      }
    } catch (e) {
      console.error("Upload error:", e);
      const message = e.response?.data?.detail || "Erreur lors de l'envoi";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  // Réinitialiser
  const reset = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setUploaded(false);
    setError(null);
  };

  // Écran de succès
  if (uploaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-black text-white flex flex-col items-center justify-center p-6">
        <Toaster position="top-center" richColors />
        
        <div className="text-center">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={48} className="text-white" />
          </div>
          
          <h1 className="text-2xl font-bold mb-4">Photo envoyée !</h1>
          
          <p className="text-white/70 mb-8">
            Votre photo est maintenant affichée sur la borne.<br />
            Vous pouvez procéder à l'impression.
          </p>
          
          <button
            onClick={reset}
            className="flex items-center gap-2 mx-auto text-white/60 hover:text-white"
          >
            <RotateCcw size={20} />
            Envoyer une autre photo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-sm p-4 text-center border-b border-white/10">
        <h1 className="text-xl font-bold text-primary">Imprimer ma photo</h1>
        <p className="text-white/60 text-sm">Session: {sessionId}</p>
      </div>

      <div className="p-6">
        {/* Zone de prévisualisation */}
        <div className="mb-6">
          {photoPreview ? (
            <div className="relative">
              <img 
                src={photoPreview} 
                alt="Prévisualisation" 
                className="w-full max-h-[50vh] object-contain rounded-xl border-2 border-white/20"
              />
              <button
                onClick={reset}
                className="absolute top-2 right-2 bg-black/70 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="aspect-[4/3] bg-white/5 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center">
              <Image size={64} className="text-white/30 mb-4" />
              <p className="text-white/50">Aucune photo sélectionnée</p>
            </div>
          )}
        </div>

        {/* Boutons de sélection */}
        {!photoPreview && (
          <div className="space-y-3 mb-6">
            {/* Prendre une photo */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full p-4 bg-primary hover:bg-primary/90 text-black rounded-xl font-bold flex items-center justify-center gap-3"
            >
              <Camera size={24} />
              Prendre une photo
            </button>
            
            {/* Choisir depuis la galerie */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold flex items-center justify-center gap-3"
            >
              <Image size={24} />
              Choisir depuis la galerie
            </button>
            
            {/* Inputs cachés */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Bouton d'envoi */}
        {photoPreview && !uploaded && (
          <div className="space-y-3">
            <button
              onClick={uploadPhoto}
              disabled={uploading}
              className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader className="animate-spin" size={24} />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Upload size={24} />
                  Envoyer à la borne
                </>
              )}
            </button>
            
            <button
              onClick={reset}
              disabled={uploading}
              className="w-full p-3 text-white/60 hover:text-white"
            >
              Choisir une autre photo
            </button>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-center text-white/50 text-sm">
          <p>La photo sera affichée sur la borne pour impression.</p>
          <p>Format recommandé : JPEG ou PNG</p>
        </div>
      </div>
    </div>
  );
}
