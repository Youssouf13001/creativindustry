import { useState, useRef, useEffect } from 'react';
import { X, Plus, Type, CheckSquare, Calendar, PenTool, Save, Trash2, Upload, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../../config/api';

const ContractEditor = ({ token, onClose, existingTemplate = null, onSaved }) => {
  const [pdfUrl, setPdfUrl] = useState(existingTemplate?.pdf_url || '');
  const [pdfFile, setPdfFile] = useState(null);
  const [templateName, setTemplateName] = useState(existingTemplate?.name || '');
  const [fields, setFields] = useState(existingTemplate?.fields || []);
  const [selectedField, setSelectedField] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingField, setAddingField] = useState(null); // 'text', 'checkbox', 'date', 'signature'
  const [draggingField, setDraggingField] = useState(null);
  const pdfContainerRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fieldTypes = [
    { type: 'text', icon: Type, label: 'Texte', color: 'bg-blue-500' },
    { type: 'checkbox', icon: CheckSquare, label: 'Case à cocher', color: 'bg-green-500' },
    { type: 'date', icon: Calendar, label: 'Date', color: 'bg-purple-500' },
    { type: 'signature', icon: PenTool, label: 'Signature', color: 'bg-amber-500' },
  ];

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.pdf')) {
      toast.error('Veuillez sélectionner un fichier PDF');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/contracts/templates/upload-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPdfUrl(data.pdf_url);
        setPdfFile(file);
        toast.success('PDF uploadé !');
      } else {
        toast.error(data.detail || 'Erreur upload');
      }
    } catch (e) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handlePdfClick = (e) => {
    if (!addingField || !pdfContainerRef.current) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newField = {
      id: `field_${Date.now()}`,
      type: addingField,
      label: `Champ ${fields.length + 1}`,
      x: x,
      y: y,
      page: 1,
      width: addingField === 'checkbox' ? 30 : (addingField === 'signature' ? 200 : 150),
      height: addingField === 'checkbox' ? 30 : (addingField === 'signature' ? 60 : 30),
      required: true,
    };

    setFields([...fields, newField]);
    setSelectedField(newField.id);
    setAddingField(null);
    toast.success('Champ ajouté ! Cliquez dessus pour le configurer.');
  };

  // Gérer le déplacement des champs par drag
  const handleFieldDragStart = (e, fieldId) => {
    e.stopPropagation();
    setDraggingField(fieldId);
  };

  const handleFieldDrag = (e) => {
    if (!draggingField || !pdfContainerRef.current) return;
    
    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Limiter les valeurs entre 0 et 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    setFields(fields.map(f => 
      f.id === draggingField 
        ? { ...f, x: clampedX, y: clampedY } 
        : f
    ));
  };

  const handleFieldDragEnd = () => {
    if (draggingField) {
      setDraggingField(null);
    }
  };

  const updateField = (fieldId, updates) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const deleteField = (fieldId) => {
    setFields(fields.filter(f => f.id !== fieldId));
    setSelectedField(null);
    toast.success('Champ supprimé');
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Donnez un nom au modèle');
      return;
    }
    if (!pdfUrl) {
      toast.error('Uploadez un PDF');
      return;
    }
    if (fields.length === 0) {
      toast.error('Ajoutez au moins un champ');
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        name: templateName,
        pdf_url: pdfUrl,
        fields: fields,
      };

      const url = existingTemplate 
        ? `${API}/contracts/templates/${existingTemplate.id}`
        : `${API}/contracts/templates`;
      
      const method = existingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(existingTemplate ? 'Modèle mis à jour !' : 'Modèle créé !');
        onSaved && onSaved();
        onClose();
      } else {
        toast.error(data.detail || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const selectedFieldData = fields.find(f => f.id === selectedField);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <FileText className="text-amber-400" size={24} />
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nom du modèle de contrat..."
              className="bg-transparent text-xl font-bold text-white border-none outline-none placeholder:text-white/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg flex items-center gap-2"
            >
              <Save size={18} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="w-64 bg-slate-800 p-4 border-r border-slate-700 overflow-y-auto">
            {/* Upload PDF */}
            {!pdfUrl && (
              <div className="mb-6">
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-amber-500 transition-colors">
                  <Upload className="text-amber-400 mb-2" size={32} />
                  <span className="text-white/60 text-sm text-center">
                    {uploading ? 'Upload en cours...' : 'Cliquez pour uploader votre PDF'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            )}

            {/* Field Types */}
            <div className="mb-6">
              <h3 className="text-white/60 text-sm font-medium mb-3">AJOUTER UN CHAMP</h3>
              <div className="grid grid-cols-2 gap-2">
                {fieldTypes.map(({ type, icon: Icon, label, color }) => (
                  <button
                    key={type}
                    onClick={() => setAddingField(addingField === type ? null : type)}
                    disabled={!pdfUrl}
                    className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${
                      addingField === type 
                        ? `${color} text-white` 
                        : 'bg-slate-700 text-white/60 hover:bg-slate-600 disabled:opacity-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
              {addingField && (
                <p className="text-amber-400 text-xs mt-2 text-center">
                  Cliquez sur le PDF pour placer le champ
                </p>
              )}
            </div>

            {/* Field List */}
            <div>
              <h3 className="text-white/60 text-sm font-medium mb-3">CHAMPS ({fields.length})</h3>
              <div className="space-y-2">
                {fields.map((field) => {
                  const fieldType = fieldTypes.find(t => t.type === field.type);
                  const Icon = fieldType?.icon || Type;
                  return (
                    <div
                      key={field.id}
                      onClick={() => setSelectedField(field.id)}
                      className={`p-2 rounded-lg cursor-pointer flex items-center gap-2 ${
                        selectedField === field.id 
                          ? 'bg-amber-500/20 border border-amber-500' 
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      <Icon size={16} className="text-amber-400" />
                      <span className="text-white text-sm truncate flex-1">{field.label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PDF Preview */}
          <div className="flex-1 bg-slate-950 p-4 overflow-auto">
            {pdfUrl ? (
              <div
                ref={pdfContainerRef}
                className={`relative bg-white mx-auto shadow-2xl ${addingField ? 'cursor-crosshair' : ''}`}
                style={{ width: '100%', maxWidth: '800px', aspectRatio: '0.707' }}
              >
                {/* PDF iframe - affichage uniquement */}
                <iframe
                  src={`${API.replace('/api', '')}${pdfUrl}`}
                  className="w-full h-full"
                  style={{ pointerEvents: 'none' }}
                  title="PDF Preview"
                />
                
                {/* Couche overlay transparente pour capturer les clics */}
                <div
                  onClick={handlePdfClick}
                  onMouseMove={handleFieldDrag}
                  onMouseUp={handleFieldDragEnd}
                  onMouseLeave={handleFieldDragEnd}
                  className="absolute inset-0 z-10"
                  style={{ 
                    cursor: addingField ? 'crosshair' : (draggingField ? 'grabbing' : 'default'),
                    background: 'transparent'
                  }}
                  data-testid="pdf-click-overlay"
                />
                
                {/* Field overlays - positionnés au-dessus de la couche de clic */}
                {fields.map((field) => {
                  const fieldType = fieldTypes.find(t => t.type === field.type);
                  const Icon = fieldType?.icon || Type;
                  const isSelected = selectedField === field.id;
                  const isDragging = draggingField === field.id;
                  
                  return (
                    <div
                      key={field.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedField(field.id); }}
                      onMouseDown={(e) => handleFieldDragStart(e, field.id)}
                      className={`absolute border-2 rounded transition-all z-20 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/30 shadow-lg shadow-amber-400/20'
                          : isDragging 
                            ? 'border-green-400 bg-green-400/30'
                            : 'border-blue-400/50 bg-blue-400/20 hover:border-blue-400'
                      }`}
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        width: `${field.width}px`,
                        height: `${field.height}px`,
                        transform: 'translate(-50%, -50%)',
                        cursor: isDragging ? 'grabbing' : 'grab',
                      }}
                      data-testid={`contract-field-${field.id}`}
                    >
                      {/* Icône du type de champ */}
                      <Icon 
                        size={field.type === 'checkbox' ? 14 : 12} 
                        className={`absolute top-1/2 left-1 -translate-y-1/2 ${isSelected ? 'text-amber-400' : 'text-blue-400'}`} 
                      />
                      {/* Label du champ */}
                      <span className="absolute -top-6 left-0 text-xs text-white bg-slate-800/90 px-2 py-0.5 rounded whitespace-nowrap flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${fieldType?.color || 'bg-blue-500'}`}></span>
                        {field.label}
                        {field.required && <span className="text-red-400">*</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-white/40">
                <div className="text-center">
                  <FileText size={64} className="mx-auto mb-4 opacity-50" />
                  <p>Uploadez votre contrat PDF pour commencer</p>
                </div>
              </div>
            )}
          </div>

          {/* Field Properties */}
          {selectedFieldData && (
            <div className="w-72 bg-slate-800 p-4 border-l border-slate-700 overflow-y-auto">
              <h3 className="text-white font-bold mb-4">Propriétés du champ</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm block mb-1">Libellé</label>
                  <input
                    type="text"
                    value={selectedFieldData.label}
                    onChange={(e) => updateField(selectedFieldData.id, { label: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-sm block mb-1">Type</label>
                  <select
                    value={selectedFieldData.type}
                    onChange={(e) => updateField(selectedFieldData.id, { type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                  >
                    {fieldTypes.map(t => (
                      <option key={t.type} value={t.type}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-white/60 text-sm block mb-1">Largeur</label>
                    <input
                      type="number"
                      value={selectedFieldData.width}
                      onChange={(e) => updateField(selectedFieldData.id, { width: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-white/60 text-sm block mb-1">Hauteur</label>
                    <input
                      type="number"
                      value={selectedFieldData.height}
                      onChange={(e) => updateField(selectedFieldData.id, { height: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="required"
                    checked={selectedFieldData.required}
                    onChange={(e) => updateField(selectedFieldData.id, { required: e.target.checked })}
                    className="accent-amber-500"
                  />
                  <label htmlFor="required" className="text-white text-sm">Champ obligatoire</label>
                </div>

                <button
                  onClick={() => deleteField(selectedFieldData.id)}
                  className="w-full px-4 py-2 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center gap-2 hover:bg-red-500/30"
                >
                  <Trash2 size={16} /> Supprimer ce champ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractEditor;
