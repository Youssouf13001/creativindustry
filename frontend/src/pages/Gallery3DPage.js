import { useState, useEffect, useRef, Suspense } from "react";
import { useParams } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  OrbitControls, 
  useTexture, 
  Environment, 
  Text,
  PerspectiveCamera,
  PointerLockControls
} from "@react-three/drei";
import * as THREE from "three";
import axios from "axios";
import { Loader, Move, Mouse, Maximize, Info, X } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";

// Photo Frame Component
function PhotoFrame({ position, rotation, imageUrl, title, onClick }) {
  const texture = useTexture(imageUrl);
  const [hovered, setHovered] = useState(false);
  
  // Calculate aspect ratio
  const aspectRatio = texture.image ? texture.image.width / texture.image.height : 1;
  const frameWidth = 2;
  const frameHeight = frameWidth / aspectRatio;
  
  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[frameWidth + 0.2, frameHeight + 0.2, 0.1]} />
        <meshStandardMaterial color={hovered ? "#D4AF37" : "#1a1a1a"} />
      </mesh>
      
      {/* Photo */}
      <mesh 
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onClick}
      >
        <planeGeometry args={[frameWidth, frameHeight]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      
      {/* Title plate */}
      {title && (
        <Text
          position={[0, -frameHeight/2 - 0.3, 0]}
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {title}
        </Text>
      )}
    </group>
  );
}

// Gallery Room Component
function GalleryRoom({ photos, onPhotoClick }) {
  const roomWidth = 20;
  const roomDepth = 30;
  const roomHeight = 6;
  const wallColor = "#1a1a1a";
  const floorColor = "#2a2a2a";
  
  // Calculate photo positions along walls
  const getPhotoPositions = () => {
    const positions = [];
    const photosPerWall = Math.ceil(photos.length / 2);
    const spacing = roomDepth / (photosPerWall + 1);
    
    photos.forEach((photo, index) => {
      const wallIndex = Math.floor(index / photosPerWall);
      const posInWall = index % photosPerWall;
      
      if (wallIndex === 0) {
        // Left wall
        positions.push({
          position: [-roomWidth/2 + 0.1, 2, -roomDepth/2 + spacing * (posInWall + 1)],
          rotation: [0, Math.PI/2, 0]
        });
      } else {
        // Right wall
        positions.push({
          position: [roomWidth/2 - 0.1, 2, -roomDepth/2 + spacing * (posInWall + 1)],
          rotation: [0, -Math.PI/2, 0]
        });
      }
    });
    
    return positions;
  };
  
  const photoPositions = getPhotoPositions();
  
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>
      
      {/* Ceiling */}
      <mesh rotation={[Math.PI/2, 0, 0]} position={[0, roomHeight, 0]}>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      
      {/* Back wall */}
      <mesh position={[0, roomHeight/2, -roomDepth/2]}>
        <planeGeometry args={[roomWidth, roomHeight]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      
      {/* Front wall (with opening) */}
      <mesh position={[0, roomHeight/2, roomDepth/2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[roomWidth, roomHeight]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      
      {/* Left wall */}
      <mesh position={[-roomWidth/2, roomHeight/2, 0]} rotation={[0, Math.PI/2, 0]}>
        <planeGeometry args={[roomDepth, roomHeight]} />
        <meshStandardMaterial color="#252525" />
      </mesh>
      
      {/* Right wall */}
      <mesh position={[roomWidth/2, roomHeight/2, 0]} rotation={[0, -Math.PI/2, 0]}>
        <planeGeometry args={[roomDepth, roomHeight]} />
        <meshStandardMaterial color="#252525" />
      </mesh>
      
      {/* Ceiling lights */}
      {[-8, 0, 8].map((z, i) => (
        <pointLight 
          key={i}
          position={[0, roomHeight - 0.5, z]} 
          intensity={50} 
          color="#fff5e6"
          castShadow
        />
      ))}
      
      {/* Photos on walls */}
      {photos.map((photo, index) => (
        photoPositions[index] && (
          <Suspense key={photo.id} fallback={null}>
            <PhotoFrame
              position={photoPositions[index].position}
              rotation={photoPositions[index].rotation}
              imageUrl={photo.fullUrl}
              title={photo.title || `Photo ${index + 1}`}
              onClick={() => onPhotoClick(photo)}
            />
          </Suspense>
        )
      ))}
      
      {/* Ambient light */}
      <ambientLight intensity={0.3} />
    </group>
  );
}

// First Person Controls
function FirstPersonControls() {
  const { camera, gl } = useThree();
  const moveSpeed = 0.1;
  const keys = useRef({ w: false, a: false, s: false, d: false });
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (keys.current.hasOwnProperty(key)) {
        keys.current[key] = true;
      }
    };
    
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (keys.current.hasOwnProperty(key)) {
        keys.current[key] = false;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  useFrame(() => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0));
    
    if (keys.current.w) camera.position.addScaledVector(direction, moveSpeed);
    if (keys.current.s) camera.position.addScaledVector(direction, -moveSpeed);
    if (keys.current.a) camera.position.addScaledVector(right, -moveSpeed);
    if (keys.current.d) camera.position.addScaledVector(right, moveSpeed);
    
    // Keep camera at eye level
    camera.position.y = 1.7;
    
    // Boundary limits
    camera.position.x = Math.max(-9, Math.min(9, camera.position.x));
    camera.position.z = Math.max(-14, Math.min(14, camera.position.z));
  });
  
  return <PointerLockControls args={[camera, gl.domElement]} />;
}

// Main Gallery3D Page Component
const Gallery3DPage = () => {
  const { galleryId } = useParams();
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [controlsLocked, setControlsLocked] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    fetchGallery();
  }, [galleryId]);

  const fetchGallery = async () => {
    try {
      const res = await axios.get(`${API}/galleries/${galleryId}`);
      setGallery(res.data);
      
      // Prepare photos with full URLs
      const preparedPhotos = (res.data.photos || []).slice(0, 20).map((photo, index) => ({
        ...photo,
        id: photo.id || index,
        fullUrl: photo.url.startsWith('http') ? photo.url : `${BACKEND_URL}${photo.url}`,
        title: photo.title || `Photo ${index + 1}`
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
    document.exitPointerLock();
  };

  const enterGallery = () => {
    setShowHelp(false);
    setControlsLocked(true);
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
          <p className="text-white/60">Cette galerie n'existe pas ou n'est plus disponible.</p>
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
                <Mouse className="text-primary" size={24} />
                <div>
                  <p className="text-white font-medium">Souris</p>
                  <p className="text-white/60 text-sm">Regarder autour de vous</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg">
                <Move className="text-primary" size={24} />
                <div>
                  <p className="text-white font-medium">ZQSD / WASD</p>
                  <p className="text-white/60 text-sm">Se déplacer dans la galerie</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-lg">
                <Maximize className="text-primary" size={24} />
                <div>
                  <p className="text-white font-medium">Clic sur photo</p>
                  <p className="text-white/60 text-sm">Voir en grand</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={enterGallery}
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
        <div className="absolute bottom-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white/60 text-sm">
          <p><span className="text-primary">ZQSD</span> Déplacer • <span className="text-primary">Souris</span> Regarder • <span className="text-primary">ESC</span> Menu</p>
        </div>
      )}

      {/* Gallery Info */}
      {!showHelp && (
        <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3">
          <h2 className="text-white font-medium">{gallery.name}</h2>
          <p className="text-white/60 text-sm">{photos.length} photos</p>
        </div>
      )}

      {/* Back to help button */}
      {!showHelp && (
        <button
          onClick={() => setShowHelp(true)}
          className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white hover:bg-black/70 transition-colors"
        >
          <Info size={20} />
        </button>
      )}

      {/* 3D Canvas */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 1.7, 10]} fov={75} />
        
        <Suspense fallback={null}>
          <GalleryRoom photos={photos} onPhotoClick={handlePhotoClick} />
        </Suspense>
        
        {controlsLocked ? (
          <FirstPersonControls />
        ) : (
          <OrbitControls 
            target={[0, 1.5, 0]} 
            maxPolarAngle={Math.PI / 2}
            minDistance={2}
            maxDistance={15}
          />
        )}
        
        <fog attach="fog" args={['#000000', 10, 30]} />
      </Canvas>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="absolute inset-0 z-30 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedPhoto.fullUrl}
              alt={selectedPhoto.title}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <p className="text-center text-white mt-4">{selectedPhoto.title}</p>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-4 -right-4 bg-white/20 hover:bg-white/30 rounded-full p-2"
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
