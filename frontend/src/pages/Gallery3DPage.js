import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import axios from "axios";
import { Loader, Move, Mouse, Maximize, Info, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

// Photo Frame Component with manual texture loading
function PhotoFrame({ position, rotation, imageUrl, onClick }) {
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const meshRef = useRef();
  
  useEffect(() => {
    if (!imageUrl) return;
    
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    
    loader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        setTexture(loadedTexture);
        if (loadedTexture.image) {
          setAspectRatio(loadedTexture.image.width / loadedTexture.image.height);
        }
      },
      undefined,
      (error) => {
        console.error("Failed to load texture:", imageUrl, error);
      }
    );
    
    return () => {
      if (texture) texture.dispose();
    };
  }, [imageUrl]);
  
  const frameWidth = 2;
  const frameHeight = frameWidth / aspectRatio;
  
  return (
    <group position={position} rotation={rotation}>
      {/* Frame background */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[frameWidth + 0.3, frameHeight + 0.3, 0.1]} />
        <meshStandardMaterial color={hovered ? "#D4AF37" : "#222222"} />
      </mesh>
      
      {/* Photo */}
      <mesh 
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
        onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
      >
        <planeGeometry args={[frameWidth, frameHeight]} />
        {texture ? (
          <meshBasicMaterial map={texture} />
        ) : (
          <meshBasicMaterial color="#444444" />
        )}
      </mesh>
    </group>
  );
}

// Gallery Room Component
function GalleryRoom({ photos, onPhotoClick }) {
  const roomWidth = 20;
  const roomDepth = 24;
  const roomHeight = 5;
  
  // Calculate positions for photos on left and right walls
  const getPhotoPositions = () => {
    const positions = [];
    const photosPerWall = Math.ceil(photos.length / 2);
    const spacing = (roomDepth - 4) / Math.max(photosPerWall, 1);
    
    photos.forEach((photo, index) => {
      const wallIndex = index < photosPerWall ? 0 : 1;
      const posInWall = wallIndex === 0 ? index : index - photosPerWall;
      const zPos = -roomDepth/2 + 2 + spacing * posInWall + spacing/2;
      
      if (wallIndex === 0) {
        // Left wall
        positions.push({
          position: [-roomWidth/2 + 0.15, 2, zPos],
          rotation: [0, Math.PI/2, 0]
        });
      } else {
        // Right wall
        positions.push({
          position: [roomWidth/2 - 0.15, 2, zPos],
          rotation: [0, -Math.PI/2, 0]
        });
      }
    });
    
    return positions;
  };
  
  const photoPositions = getPhotoPositions();
  
  return (
    <group>
      {/* Floor - dark wood style */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial color="#1a1815" roughness={0.8} />
      </mesh>
      
      {/* Ceiling */}
      <mesh rotation={[Math.PI/2, 0, 0]} position={[0, roomHeight, 0]}>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial color="#0f0f0f" />
      </mesh>
      
      {/* Back wall */}
      <mesh position={[0, roomHeight/2, -roomDepth/2]}>
        <planeGeometry args={[roomWidth, roomHeight]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Front wall */}
      <mesh position={[0, roomHeight/2, roomDepth/2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[roomWidth, roomHeight]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Left wall */}
      <mesh position={[-roomWidth/2, roomHeight/2, 0]} rotation={[0, Math.PI/2, 0]}>
        <planeGeometry args={[roomDepth, roomHeight]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      
      {/* Right wall */}
      <mesh position={[roomWidth/2, roomHeight/2, 0]} rotation={[0, -Math.PI/2, 0]}>
        <planeGeometry args={[roomDepth, roomHeight]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      
      {/* Ceiling lights */}
      {[-6, 0, 6].map((z, i) => (
        <group key={i}>
          <pointLight 
            position={[0, roomHeight - 0.3, z]} 
            intensity={30} 
            color="#fff5e6"
            distance={12}
            decay={2}
          />
          {/* Light fixture */}
          <mesh position={[0, roomHeight - 0.1, z]}>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
      
      {/* Photos on walls */}
      {photos.map((photo, index) => (
        photoPositions[index] && (
          <PhotoFrame
            key={photo.id || index}
            position={photoPositions[index].position}
            rotation={photoPositions[index].rotation}
            imageUrl={photo.fullUrl}
            onClick={() => onPhotoClick(photo)}
          />
        )
      ))}
      
      {/* Ambient light */}
      <ambientLight intensity={0.4} />
    </group>
  );
}

// Camera Controller with keyboard movement
function CameraController({ enabled }) {
  const { camera } = useThree();
  const moveSpeed = 0.08;
  const keys = useRef({ w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false });
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) keys.current[key] = true;
      if (e.key.startsWith('Arrow')) keys.current[e.key] = true;
    };
    
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) keys.current[key] = false;
      if (e.key.startsWith('Arrow')) keys.current[e.key] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled]);
  
  useFrame(() => {
    if (!enabled) return;
    
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0));
    
    // WASD and Arrow keys
    if (keys.current.w || keys.current.ArrowUp) camera.position.addScaledVector(direction, moveSpeed);
    if (keys.current.s || keys.current.ArrowDown) camera.position.addScaledVector(direction, -moveSpeed);
    if (keys.current.a || keys.current.ArrowLeft) camera.position.addScaledVector(right, -moveSpeed);
    if (keys.current.d || keys.current.ArrowRight) camera.position.addScaledVector(right, moveSpeed);
    
    // Keep at eye level
    camera.position.y = 1.7;
    
    // Room boundaries
    camera.position.x = Math.max(-9, Math.min(9, camera.position.x));
    camera.position.z = Math.max(-11, Math.min(11, camera.position.z));
  });
  
  return null;
}

// Main Gallery3D Page Component
const Gallery3DPage = () => {
  const { galleryId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    fetchGallery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId]);

  const fetchGallery = async () => {
    try {
      const res = await axios.get(`${API}/public/galleries/${galleryId}`);
      setGallery(res.data);
      
      // Prepare photos with full URLs using public API endpoint
      const preparedPhotos = (res.data.photos || []).slice(0, 20).map((photo, index) => ({
        ...photo,
        id: photo.id || index,
        fullUrl: `${API}/public/galleries/${galleryId}/image/${photo.id}`,
        title: photo.title || photo.filename || `Photo ${index + 1}`
      }));
      
      setPhotos(preparedPhotos);
    } catch (e) {
      console.error("Error fetching gallery:", e);
      toast.error("Galerie non trouvée");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
  };

  const enterGallery = () => {
    setShowHelp(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-primary mx-auto mb-4" size={48} />
          <p className="text-white">Chargement de la galerie 3D...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <X className="text-red-500 mx-auto mb-4" size={64} />
          <h1 className="text-2xl text-white mb-2">Galerie non trouvée</h1>
          <p className="text-white/60 mb-4">Cette galerie n'existe pas ou n'est plus disponible.</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-black rounded-lg"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
      {/* Help Overlay */}
      {showHelp && (
        <div className="absolute inset-0 z-20 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-card border border-white/20 rounded-xl p-8 max-w-lg text-center">
            <h1 className="font-primary text-3xl text-white mb-2">{gallery.name}</h1>
            <p className="text-primary mb-6">Galerie 3D Immersive</p>
            
            <div className="space-y-4 mb-8 text-left">
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg">
                <Mouse className="text-primary flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-medium">Souris</p>
                  <p className="text-white/60 text-sm">Cliquer-glisser pour regarder autour</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg">
                <Move className="text-primary flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-medium">ZQSD / Flèches</p>
                  <p className="text-white/60 text-sm">Se déplacer dans la galerie</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg">
                <Maximize className="text-primary flex-shrink-0" size={24} />
                <div>
                  <p className="text-white font-medium">Clic sur photo</p>
                  <p className="text-white/60 text-sm">Voir en grand</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={enterGallery}
              data-testid="enter-gallery-btn"
              className="px-8 py-4 bg-primary text-black font-bold rounded-lg text-lg hover:bg-primary/90 transition-colors"
            >
              Entrer dans la galerie
            </button>
            
            <p className="text-white/40 text-sm mt-4">
              {photos.length} photos à découvrir
            </p>
          </div>
        </div>
      )}

      {/* Controls Help (in-gallery) */}
      {!showHelp && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white/80 text-sm">
          <p><span className="text-primary font-medium">ZQSD/Flèches</span> Déplacer • <span className="text-primary font-medium">Souris</span> Regarder</p>
        </div>
      )}

      {/* Gallery Info */}
      {!showHelp && (
        <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-sm rounded-lg p-3">
          <h2 className="text-white font-medium">{gallery.name}</h2>
          <p className="text-white/60 text-sm">{photos.length} photos</p>
        </div>
      )}

      {/* Back button */}
      {!showHelp && (
        <button
          onClick={() => setShowHelp(true)}
          className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white hover:bg-black/90 transition-colors flex items-center gap-2"
        >
          <Info size={20} />
          <span className="text-sm">Aide</span>
        </button>
      )}

      {/* 3D Canvas */}
      <Canvas 
        shadows 
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 1.7, 8], fov: 60 }}
      >
        <color attach="background" args={['#000000']} />
        
        <GalleryRoom photos={photos} onPhotoClick={handlePhotoClick} />
        
        <CameraController enabled={!showHelp && !selectedPhoto} />
        
        <OrbitControls 
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
          rotateSpeed={0.5}
        />
        
        <fog attach="fog" args={['#000000', 8, 25]} />
      </Canvas>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="absolute inset-0 z-30 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto.fullUrl}
              alt={selectedPhoto.title}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="text-center text-white mt-4 text-lg">{selectedPhoto.title}</p>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-3 -right-3 bg-white/20 hover:bg-white/40 rounded-full p-2 transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery3DPage;
