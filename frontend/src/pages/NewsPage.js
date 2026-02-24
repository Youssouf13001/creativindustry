import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, MapPin, Send, X, User, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { API, BACKEND_URL } from "../config/api";

const NewsPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likedPosts, setLikedPosts] = useState({});
  
  // Check if client is authenticated
  const clientToken = localStorage.getItem("client_token");
  const isAuthenticated = !!clientToken;
  const headers = clientToken ? { Authorization: `Bearer ${clientToken}` } : {};

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API}/news`);
      setPosts(res.data);
      
      // Check liked status for each post if authenticated
      if (isAuthenticated) {
        const likedStatus = {};
        for (const post of res.data) {
          try {
            const likeRes = await axios.get(`${API}/news/${post.id}/liked`, { headers });
            likedStatus[post.id] = likeRes.data.liked;
          } catch {
            likedStatus[post.id] = false;
          }
        }
        setLikedPosts(likedStatus);
      }
    } catch (e) {
      console.error("Error fetching news:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId) => {
    if (!isAuthenticated) {
      alert("Vous devez être connecté pour aimer une publication");
      return;
    }
    
    try {
      const res = await axios.post(`${API}/news/${postId}/like`, {}, { headers });
      setLikedPosts(prev => ({ ...prev, [postId]: res.data.action === "liked" }));
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likes_count: res.data.likes_count } : p
      ));
    } catch (e) {
      console.error("Error liking post:", e);
    }
  };

  const openPost = async (post) => {
    setSelectedPost(post);
    setLoadingComments(true);
    try {
      const res = await axios.get(`${API}/news/${post.id}/comments`);
      setComments(res.data);
    } catch (e) {
      console.error("Error fetching comments:", e);
    } finally {
      setLoadingComments(false);
    }
  };

  const closePost = () => {
    setSelectedPost(null);
    setComments([]);
    setNewComment("");
    setGuestName("");
    setGuestEmail("");
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      const payload = {
        content: newComment,
        guest_name: !isAuthenticated ? guestName : null,
        guest_email: !isAuthenticated ? guestEmail : null
      };
      
      const res = await axios.post(
        `${API}/news/${selectedPost.id}/comment`,
        payload,
        { headers }
      );
      
      if (res.data.status === "approved") {
        // Refresh comments
        const commentsRes = await axios.get(`${API}/news/${selectedPost.id}/comments`);
        setComments(commentsRes.data);
        // Update count
        setPosts(prev => prev.map(p => 
          p.id === selectedPost.id ? { ...p, comments_count: p.comments_count + 1 } : p
        ));
      }
      
      alert(res.data.message);
      setNewComment("");
      setGuestName("");
      setGuestEmail("");
    } catch (e) {
      alert(e.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `il y a ${minutes} min`;
      }
      return `il y a ${hours}h`;
    } else if (days === 1) {
      return "hier";
    } else if (days < 7) {
      return `il y a ${days} jours`;
    } else {
      return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="news-page">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 spotlight opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="font-primary font-black text-5xl md:text-7xl tracking-tighter uppercase mb-6">
              <span className="text-gold-gradient">Actualités</span>
            </h1>
            <p className="font-secondary text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
              Suivez nos dernières aventures, coulisses et réalisations
            </p>
          </motion.div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-12 pb-24" data-testid="news-grid">
        <div className="max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin w-12 h-12 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-white/60 mt-4">Chargement...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <MessageCircle size={64} className="text-white/20 mx-auto mb-6" />
              <h3 className="font-primary font-bold text-xl mb-2">Aucune actualité</h3>
              <p className="text-white/60">Revenez bientôt pour découvrir nos dernières nouvelles !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => openPost(post)}
                  className="relative aspect-square cursor-pointer group overflow-hidden bg-card"
                  data-testid={`news-post-${index}`}
                >
                  {post.media_type === "photo" ? (
                    <img
                      src={`${BACKEND_URL}${post.media_url}`}
                      alt={post.caption}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <video
                      src={`${BACKEND_URL}${post.media_url}`}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-8">
                    <div className="flex items-center gap-2 text-white">
                      <Heart size={24} fill={likedPosts[post.id] ? "#D4AF37" : "transparent"} className={likedPosts[post.id] ? "text-primary" : ""} />
                      <span className="font-bold">{post.likes_count}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      <MessageCircle size={24} />
                      <span className="font-bold">{post.comments_count}</span>
                    </div>
                  </div>
                  
                  {/* Video indicator */}
                  {post.media_type === "video" && (
                    <div className="absolute top-3 right-3 bg-black/50 px-2 py-1 text-xs text-white">
                      VIDEO
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
            onClick={closePost}
            data-testid="post-detail-modal"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl max-h-[90vh] bg-card border border-white/10 overflow-hidden flex flex-col lg:flex-row"
            >
              {/* Close Button */}
              <button
                onClick={closePost}
                className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/80 transition-colors"
              >
                <X size={24} className="text-white" />
              </button>

              {/* Media */}
              <div className="lg:w-3/5 bg-black flex items-center justify-center">
                {selectedPost.media_type === "photo" ? (
                  <img
                    src={`${BACKEND_URL}${selectedPost.media_url}`}
                    alt={selectedPost.caption}
                    className="w-full h-full object-contain max-h-[50vh] lg:max-h-[90vh]"
                  />
                ) : (
                  <video
                    src={`${BACKEND_URL}${selectedPost.media_url}`}
                    className="w-full h-full object-contain max-h-[50vh] lg:max-h-[90vh]"
                    controls
                    autoPlay
                  />
                )}
              </div>

              {/* Content & Comments */}
              <div className="lg:w-2/5 flex flex-col max-h-[40vh] lg:max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">CI</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">CREATIVINDUSTRY</p>
                      {selectedPost.location && (
                        <p className="text-xs text-white/50 flex items-center gap-1">
                          <MapPin size={12} />
                          {selectedPost.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Caption */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex-shrink-0 flex items-center justify-center">
                      <span className="text-primary font-bold text-xs">CI</span>
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-bold mr-2">CREATIVINDUSTRY</span>
                        {selectedPost.caption}
                      </p>
                      <p className="text-xs text-white/40 mt-1">{formatDate(selectedPost.created_at)}</p>
                    </div>
                  </div>

                  {/* Comments List */}
                  {loadingComments ? (
                    <div className="text-center py-4">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-center text-white/40 text-sm py-4">Aucun commentaire</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-white/10 flex items-center justify-center">
                          {comment.client_avatar ? (
                            <img src={`${BACKEND_URL}${comment.client_avatar}`} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} className="text-white/50" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-bold mr-2">
                              {comment.client_name || comment.guest_name}
                            </span>
                            {comment.content}
                          </p>
                          <p className="text-xs text-white/40 mt-1">{formatDate(comment.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-white/10">
                  <div className="flex items-center gap-4 mb-3">
                    <button
                      onClick={() => handleLike(selectedPost.id)}
                      className="hover:opacity-70 transition-opacity"
                      disabled={!isAuthenticated}
                    >
                      <Heart
                        size={28}
                        fill={likedPosts[selectedPost.id] ? "#D4AF37" : "transparent"}
                        className={likedPosts[selectedPost.id] ? "text-primary" : "text-white"}
                      />
                    </button>
                    <MessageCircle size={28} className="text-white" />
                  </div>
                  <p className="font-bold text-sm mb-1">{selectedPost.likes_count} J'aime</p>
                  <p className="text-xs text-white/40">{formatDate(selectedPost.created_at)}</p>
                </div>

                {/* Comment Form */}
                <form onSubmit={submitComment} className="p-4 border-t border-white/10">
                  {!isAuthenticated && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Votre nom *"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                        className="bg-background/50 border border-white/10 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                      <input
                        type="email"
                        placeholder="Votre email *"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        required
                        className="bg-background/50 border border-white/10 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={isAuthenticated ? "Ajouter un commentaire..." : "Votre commentaire *"}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                      required
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="text-primary font-bold text-sm disabled:opacity-50"
                    >
                      {submittingComment ? "..." : <Send size={20} />}
                    </button>
                  </div>
                  {!isAuthenticated && (
                    <p className="text-xs text-white/40 mt-2">
                      Votre commentaire sera publié après validation
                    </p>
                  )}
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NewsPage;
