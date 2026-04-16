import React, { useRef, useState, useEffect } from "react";
import { X, Check, RotateCcw } from "lucide-react";

/**
 * Composant de signature tactile
 * Permet de dessiner une signature sur un canvas
 */
export default function SignaturePad({ onSave, onCancel, signerName = "" }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState(signerName);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // Retina support
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    
    // Style
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const coords = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const coords = getCoordinates(e);
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (!hasDrawn) {
      alert("Veuillez dessiner votre signature");
      return;
    }
    if (!name.trim()) {
      alert("Veuillez entrer votre nom");
      return;
    }
    
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL("image/png");
    onSave(signatureData, name);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Signature</h3>
          <button onClick={onCancel} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-white/60 text-sm mb-1">Nom du signataire</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom complet"
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white"
            />
          </div>

          {/* Signature area */}
          <div>
            <label className="block text-white/60 text-sm mb-1">Dessinez votre signature</label>
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="w-full h-40 bg-white rounded-lg cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <button
                onClick={clearCanvas}
                className="absolute top-2 right-2 p-2 bg-zinc-800/80 rounded-lg text-white/70 hover:text-white"
                title="Effacer"
              >
                <RotateCcw size={18} />
              </button>
            </div>
            <p className="text-white/40 text-xs mt-1">
              Utilisez votre souris ou votre doigt pour signer
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-white/10">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!hasDrawn || !name.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={20} /> Valider
          </button>
        </div>
      </div>
    </div>
  );
}
