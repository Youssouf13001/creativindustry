import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Camera, Mic, Video, Send, Loader, Heart, Play, Pause, StopCircle, Clock, CheckCircle, BookOpen, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";

const GuestbookPage = () => {
  const { guestbookId } = useParams();
  const [guestbook, setGuestbook] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form states
  const [authorName, setAuthorName] = useState("");
  const [textMessage, setTextMessage] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaBlob, setMediaBlob] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const videoPreviewRef = useRef(null);

  useEffect(() => {
    const fetchGuestbook = async () => {
      try {
        const [gbRes, msgRes] = await Promise.all([
          axios.get(`${API}/public/guestbooks/${guestbookId}`),
          axios.get(`${API}/public/guestbooks/${guestbookId}/messages`)
        ]);
        setGuestbook(gbRes.data);
        setMessages(msgRes.data);
      } catch (err) {
        setError("Ce livre d'or n'existe pas ou n'est plus disponible.");
      }
      setLoading(false);
    };

    if (guestbookId) {
      fetchGuestbook();
    }
  }, [guestbookId]);

  const startRecording = async () => {
    try {
      const constraints = messageType === "video" 
        ? { video: { facingMode: "user" }, audio: true }
        : { audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: messageType === "video" ? "video/webm" : "audio/webm"
      });
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: messageType === "video" ? "video/webm" : "audio/webm" });
        setMediaBlob(blob);
        setMediaPreviewUrl(URL.createObjectURL(blob));
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Assign stream to video element AFTER isRecording is true (so the element exists)
      setTimeout(() => {
        if (messageType === "video" && videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(e => console.log("Play error:", e));
        }
      }, 100);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const maxTime = messageType === "video" 
            ? guestbook?.max_video_duration || 60 
            : guestbook?.max_audio_duration || 120;
          if (prev >= maxTime) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error("Recording error:", err);
      toast.error("Impossible d'accéder à la caméra/microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    stopRecording();
    setMediaBlob(null);
    setMediaPreviewUrl(null);
    setRecordingTime(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!authorName.trim()) {
      toast.error("Veuillez entrer votre nom");
      return;
    }
    
    if (messageType === "text" && !textMessage.trim()) {
      toast.error("Veuillez écrire un message");
      return;
    }
    
    if ((messageType === "audio" || messageType === "video") && !mediaBlob) {
      toast.error("Veuillez enregistrer un message");
      return;
    }
    
    setSubmitting(true);
    
    try {
      if (messageType === "text") {
        const formData = new FormData();
        formData.append("author_name", authorName);
        formData.append("text_content", textMessage);
        
        await axios.post(`${API}/public/guestbooks/${guestbookId}/messages/text`, formData);
      } else {
        const formData = new FormData();
        formData.append("author_name", authorName);
        formData.append("message_type", messageType);
        formData.append("file", mediaBlob, `${messageType}.webm`);
        formData.append("duration", recordingTime);
        
        await axios.post(`${API}/public/guestbooks/${guestbookId}/messages/media`, formData);
      }
      
      setSubmitted(true);
      toast.success("Message envoyé !");
      
      // Reset form
      setTextMessage("");
      setMediaBlob(null);
      setMediaPreviewUrl(null);
      setRecordingTime(0);
      
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'envoi");
    }
    
    setSubmitting(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-primary mx-auto mb-4" size={48} />
          <p className="text-white/60">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <BookOpen className="text-white/30 mx-auto mb-4" size={64} />
          <h1 className="font-primary font-bold text-2xl text-white mb-2">Livre d'or introuvable</h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-500" size={40} />
          </div>
          <h1 className="font-primary font-bold text-2xl text-white mb-2">Merci {authorName} !</h1>
          <p className="text-white/60 mb-6">
            Votre message a bien été envoyé.
            {guestbook?.require_approval && " Il sera visible après validation."}
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="bg-primary hover:bg-primary/90 text-black font-bold px-6 py-3 rounded transition-colors"
          >
            Laisser un autre message
          </button>
        </div>
      </div>
    );
  }

  const maxTime = messageType === "video" 
    ? guestbook?.max_video_duration || 60 
    : guestbook?.max_audio_duration || 120;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d]">
      {/* Header */}
      <div className="bg-black/40 border-b border-white/10 py-6 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-primary text-sm font-medium mb-2">LIVRE D'OR</p>
          <h1 className="font-primary font-bold text-2xl sm:text-3xl text-white">
            {guestbook?.name}
          </h1>
          {guestbook?.event_date && (
            <p className="text-white/50 mt-1">{guestbook.event_date}</p>
          )}
        </div>
      </div>

      {/* Welcome Message */}
      {guestbook?.welcome_message && (
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
            <Heart className="text-primary mx-auto mb-2" size={24} />
            <p className="text-white/80">{guestbook.welcome_message}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-white/60 text-sm mb-2">Votre nom</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Entrez votre nom..."
              className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
              data-testid="guestbook-name-input"
            />
          </div>

          {/* Message Type Selector */}
          <div>
            <label className="block text-white/60 text-sm mb-2">Type de message</label>
            <div className="flex gap-2">
              {guestbook?.allow_text && (
                <button
                  type="button"
                  onClick={() => { setMessageType("text"); cancelRecording(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-colors ${
                    messageType === "text" 
                      ? "bg-primary text-black" 
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                  data-testid="type-text-btn"
                >
                  <MessageCircle size={18} /> Texte
                </button>
              )}
              {guestbook?.allow_audio && (
                <button
                  type="button"
                  onClick={() => { setMessageType("audio"); cancelRecording(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-colors ${
                    messageType === "audio" 
                      ? "bg-primary text-black" 
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                  data-testid="type-audio-btn"
                >
                  <Mic size={18} /> Audio
                </button>
              )}
              {guestbook?.allow_video && (
                <button
                  type="button"
                  onClick={() => { setMessageType("video"); cancelRecording(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-colors ${
                    messageType === "video" 
                      ? "bg-primary text-black" 
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                  data-testid="type-video-btn"
                >
                  <Video size={18} /> Vidéo
                </button>
              )}
            </div>
          </div>

          {/* Text Input */}
          {messageType === "text" && (
            <div>
              <label className="block text-white/60 text-sm mb-2">Votre message</label>
              <textarea
                value={textMessage}
                onChange={(e) => setTextMessage(e.target.value)}
                placeholder="Écrivez votre message..."
                rows={4}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:border-primary focus:outline-none resize-none"
                data-testid="guestbook-message-input"
              />
            </div>
          )}

          {/* Audio/Video Recording */}
          {(messageType === "audio" || messageType === "video") && (
            <div className="space-y-4">
              {/* Video Preview */}
              {messageType === "video" && (
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  {isRecording ? (
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      muted
                      playsInline
                      webkit-playsinline="true"
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                    />
                  ) : mediaPreviewUrl ? (
                    <video
                      src={mediaPreviewUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="text-white/30" size={48} />
                    </div>
                  )}
                  
                  {isRecording && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      {formatTime(recordingTime)} / {formatTime(maxTime)}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Visualizer */}
              {messageType === "audio" && (
                <div className="bg-black/40 rounded-lg p-6 text-center">
                  {isRecording ? (
                    <div className="space-y-4">
                      <div className="flex justify-center items-center gap-1">
                        {[...Array(20)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-primary rounded-full animate-pulse"
                            style={{ 
                              height: `${20 + Math.random() * 30}px`,
                              animationDelay: `${i * 50}ms`
                            }}
                          />
                        ))}
                      </div>
                      <div className="text-red-500 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        {formatTime(recordingTime)} / {formatTime(maxTime)}
                      </div>
                    </div>
                  ) : mediaPreviewUrl ? (
                    <audio src={mediaPreviewUrl} controls className="w-full" />
                  ) : (
                    <div className="text-white/40">
                      <Mic size={48} className="mx-auto mb-2" />
                      <p>Appuyez sur le bouton pour enregistrer</p>
                    </div>
                  )}
                </div>
              )}

              {/* Recording Controls */}
              <div className="flex justify-center gap-4">
                {!isRecording && !mediaBlob && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-colors"
                    data-testid="start-recording-btn"
                  >
                    {messageType === "video" ? <Video size={24} /> : <Mic size={24} />}
                  </button>
                )}
                
                {isRecording && (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-colors animate-pulse"
                    data-testid="stop-recording-btn"
                  >
                    <StopCircle size={24} />
                  </button>
                )}
                
                {mediaBlob && !isRecording && (
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Recommencer
                  </button>
                )}
              </div>

              <p className="text-center text-white/40 text-sm">
                <Clock size={14} className="inline mr-1" />
                Durée max : {formatTime(maxTime)}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || (messageType !== "text" && !mediaBlob)}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            data-testid="submit-guestbook-btn"
          >
            {submitting ? (
              <>
                <Loader size={20} className="animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send size={20} />
                Envoyer mon message
              </>
            )}
          </button>
        </form>
      </div>

      {/* Approved Messages */}
      {messages.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 py-8 border-t border-white/10">
          <h2 className="font-primary font-bold text-xl text-white mb-6 text-center">
            Messages ({messages.length})
          </h2>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-black/40 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">{msg.author_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{msg.author_name}</p>
                    {msg.message_type === "text" && (
                      <p className="text-white/70 mt-1">{msg.text_content}</p>
                    )}
                    {msg.message_type === "audio" && (
                      <audio src={`${BACKEND_URL}${msg.media_url}`} controls className="mt-2 w-full" />
                    )}
                    {msg.message_type === "video" && (
                      <video src={`${BACKEND_URL}${msg.media_url}`} controls className="mt-2 w-full rounded-lg" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="py-6 text-center border-t border-white/10">
        <p className="text-white/40 text-sm">CREATIVINDUSTRY</p>
      </div>
    </div>
  );
};

export default GuestbookPage;
