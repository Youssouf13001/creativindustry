import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import axios from "axios";
import { Loader, Move, Mouse, Maximize, Info, X } from "lucide-react";
import { toast } from "sonner";
import { API } from "../config/api";

// Simple Photo Frame
function PhotoFrame({ position, rotation, imageUrl, onClick }) {
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(1.5);
  
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
      (err) => console.warn("Texture load error:", err)
    );
    
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);
  
  const w = 2;
  const h = w / aspectRatio;
  
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[w + 0.2, h + 0.2, 0.08]} />
        <meshStandardMaterial color={hovered ? "#c9a227" : "#1a1a1a"} />
      </mesh>
      <mesh 
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
        onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
      >
        <planeGeometry args={[w, h]} />
        {texture ? (
          <meshBasicMaterial map={texture} />
        ) : (
          <meshBasicMaterial color="#333" />
        )}
      </mesh>
    </group>
  );
}

// Simple Camera Controls
function CameraControls({ enabled }) {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const keys = useRef({});
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleMouseDown = (e) => {
      isDragging.current = true;
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      
      camera.rotation.y -= dx * 0.002;
      camera.rotation.x -= dy * 0.002;
      camera.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, camera.rotation.x));
      
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleKeyDown = (e) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    
    const handleKeyUp = (e) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    
    const canvas = gl.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, camera, gl]);
  
  useFrame(() => {
    if (!enabled) return;
    
    const speed = 0.1;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(dir, new THREE.Vector3(0, 1, 0));
    
    if (keys.current['w'] || keys.current['z'] || keys.current['arrowup']) {
      camera.position.addScaledVector(dir, speed);
    }
    if (keys.current['s'] || keys.current['arrowdown']) {
      camera.position.addScaledVector(dir, -speed);
    }
    if (keys.current['a'] || keys.current['q'] || keys.current['arrowleft']) {
      camera.position.addScaledVector(right, -speed);
    }
    if (keys.current['d'] || keys.current['arrowright']) {
      camera.position.addScaledVector(right, speed);
    }
    
    camera.position.y = 1.6;
    camera.position.x = Math.max(-8, Math.min(8, camera.position.x));
    camera.position.z = Math.max(-10, Math.min(10, camera.position.z));
  });
  
  return null;
}

// Simple Gallery Scene
function GalleryScene({ photos, onPhotoClick, enabled }) {
  const getPositions = () => {
    const pos = [];
    const perWall = Math.ceil(photos.length / 2);
    const spacing = 18 / Math.max(perWall, 1);
    
    photos.forEach((_, i) => {
      const wall = i < perWall ? 0 : 1;
      const idx = wall === 0 ? i : i - perWall;
      const z = -9 + spacing * idx + spacing / 2;
      
      pos.push(wall === 0 
        ? { pos: [-9.5, 2, z], rot: [0, Math.PI / 2, 0] }
        : { pos: [9.5, 2, z], rot: [0, -Math.PI / 2, 0] }
      );
    });
    
    return pos;
  };
  
  const positions = getPositions();
  
  return (
    <>
      {/* Room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 22]} />
        <meshStandardMaterial color="#151515" />
      </mesh>
      
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5, 0]}>
        <planeGeometry args={[20, 22]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      
      <mesh position={[0, 2.5, -11]}>
        <planeGeometry args={[20, 5]} />
        <meshStandardMaterial color="#181818" />
      </mesh>
      
      <mesh position={[0, 2.5, 11]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[20, 5]} />
        <meshStandardMaterial color="#181818" />
      </mesh>
      
      <mesh position={[-10, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[22, 5]} />
        <meshStandardMaterial color="#1e1e1e" />
      </mesh>
      
      <mesh position={[10, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[22, 5]} />
        <meshStandardMaterial color="#1e1e1e" />
      </mesh>
      
      {/* Lights */}
      <ambientLight intensity={0.3} />
      {[-5, 0, 5].map((z, i) => (
        <pointLight key={i} position={[0, 4.5, z]} intensity={25} color="#fff8e7" distance={12} />
      ))}
      
      {/* Photos */}
      {photos.map((photo, i) => (
        positions[i] && (
          <PhotoFrame
            key={photo.id}
            position={positions[i].pos}
            rotation={positions[i].rot}
            imageUrl={photo.fullUrl}
            onClick={() => onPhotoClick(photo)}
          />
        )
      ))}
      
      <CameraControls enabled={enabled} />
    </>
  );
}

// Main Component
export default function Gallery3DPage() {
  const { galleryId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await axios.get(`${API}/public/galleries/${galleryId}`);
        setGallery(res.data);
        
        const prepared = (res.data.photos || []).slice(0, 20).map((p, i) => ({
          ...p,
          id: p.id || `photo-${i}`,
          fullUrl: `${API}/public/galleries/${galleryId}/image/${p.id}`,
          title: p.title || p.filename || `Photo ${i + 1}`
        }));
        
        setPhotos(prepared);
      } catch (e) {
        console.error(e);
        toast.error("Galerie non trouvée");
      } finally {
        setLoading(false);
      }
    };
    
    fetchGallery();
  }, [galleryId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <X className="mx-auto mb-4 text-red-500" size={64} />
          <h1 className="text-2xl mb-4">Galerie introuvable</h1>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-black rounded">
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
      {/* Intro */}
      {showIntro && (
        <div className="absolute inset-0 z-20 bg-black/95 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-md text-center">
            <h1 className="text-3xl text-white font-bold mb-2">{gallery.name}</h1>
            <p className="text-primary mb-8">Galerie 3D Interactive</p>
            
            <div className="space-y-3 mb-8 text-left text-sm">
              <div className="flex items-center gap-3 bg-zinc-800 p-3 rounded">
                <Mouse className="text-primary" size={20} />
                <span className="text-white">Cliquer-glisser pour regarder</span>
              </div>
              <div className="flex items-center gap-3 bg-zinc-800 p-3 rounded">
                <Move className="text-primary" size={20} />
                <span className="text-white">ZQSD / Flèches pour se déplacer</span>
              </div>
              <div className="flex items-center gap-3 bg-zinc-800 p-3 rounded">
                <Maximize className="text-primary" size={20} />
                <span className="text-white">Cliquer sur une photo pour l'agrandir</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowIntro(false)}
              data-testid="enter-gallery-btn"
              className="w-full px-6 py-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90"
            >
              Entrer ({photos.length} photos)
            </button>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      {!showIntro && (
        <>
          <div className="absolute top-4 left-4 z-10 bg-black/60 rounded-lg p-3">
            <h2 className="text-white font-medium">{gallery.name}</h2>
            <p className="text-zinc-400 text-sm">{photos.length} photos</p>
          </div>
          
          <button
            onClick={() => setShowIntro(true)}
            className="absolute top-4 right-4 z-10 bg-black/60 rounded-lg p-3 text-white hover:bg-black/80"
          >
            <Info size={20} />
          </button>
          
          <div className="absolute bottom-4 left-4 z-10 bg-black/60 rounded-lg p-3 text-zinc-300 text-sm">
            <span className="text-primary">ZQSD</span> Déplacer • <span className="text-primary">Souris</span> Regarder
          </div>
        </>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.6, 6], fov: 65, near: 0.1, far: 100 }}
        gl={{ antialias: true }}
        style={{ background: '#000' }}
      >
        <GalleryScene 
          photos={photos} 
          onPhotoClick={setSelectedPhoto}
          enabled={!showIntro && !selectedPhoto}
        />
      </Canvas>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="absolute inset-0 z-30 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img
              src={selectedPhoto.fullUrl}
              alt={selectedPhoto.title}
              className="max-w-full max-h-[85vh] rounded-lg"
            />
            <p className="text-white text-center mt-4">{selectedPhoto.title}</p>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-2 -right-2 bg-zinc-700 hover:bg-zinc-600 rounded-full p-2"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
