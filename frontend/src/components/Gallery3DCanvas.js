import { useState, useEffect, useRef, memo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Simple Photo Frame
const PhotoFrame = memo(function PhotoFrame({ position, rotation, imageUrl, onClick }) {
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(1.5);
  const textureRef = useRef(null);
  
  useEffect(() => {
    if (!imageUrl) return;
    
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    
    loader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        textureRef.current = loadedTexture;
        setTexture(loadedTexture);
        if (loadedTexture.image) {
          setAspectRatio(loadedTexture.image.width / loadedTexture.image.height);
        }
      },
      undefined,
      (err) => console.warn("Texture load error:", err)
    );
    
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
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
});

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

// Main Canvas component (exported as default for lazy loading)
export default function Gallery3DCanvas({ photos, onPhotoClick, enabled }) {
  return (
    <Canvas
      camera={{ position: [0, 1.6, 6], fov: 65, near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      style={{ background: '#000' }}
    >
      <GalleryScene 
        photos={photos} 
        onPhotoClick={onPhotoClick}
        enabled={enabled}
      />
    </Canvas>
  );
}
