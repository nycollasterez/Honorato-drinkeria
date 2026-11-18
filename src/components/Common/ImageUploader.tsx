import React, { useState, useRef } from 'react';
import { Upload, X, Check, Camera, Link as LinkIcon } from 'lucide-react';
import { compressImageFile, MAX_UPLOAD_SIZE_MB } from '../../utils/imageCompressor';

interface ImageUploaderProps {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  focalPoint?: 'center' | 'top' | 'bottom';
  onFocalPointChange?: (point: 'center' | 'top' | 'bottom') => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = 'Foto do Drink',
  focalPoint = 'center',
  onFocalPointChange,
}) => {
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showUrlFallback, setShowUrlFallback] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleProcessFile = async (file: File) => {
    setErrorMsg('');
    setIsCompressing(true);

    try {
      const result = await compressImageFile(file, 800, 800, 0.82);
      onChange(result.dataUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar imagem.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleRemoveImage = () => {
    onChange('');
    setErrorMsg('');
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex justify-between items-center">
        <label className="text-neutral-300 font-medium">
          {label}
        </label>
        <span className="text-[10px] text-neutral-500">
          Até {MAX_UPLOAD_SIZE_MB}MB · JPG ou PNG
        </span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {errorMsg && (
        <div className="p-2 bg-neutral-900 border border-white text-white text-[11px] flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="p-0.5 hover:text-neutral-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {value ? (
        <div className="space-y-2">
          <div className="border border-navy-800 bg-[#0c1122] p-2.5 flex items-center justify-between gap-3 rounded">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 bg-navy-950 border border-navy-700 shrink-0 overflow-hidden rounded">
                <img
                  src={value}
                  alt="Foto"
                  className={`w-full h-full object-cover ${
                    focalPoint === 'top' ? 'object-top' : focalPoint === 'bottom' ? 'object-bottom' : 'object-center'
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-white font-medium text-xs">
                  <Check className="w-3.5 h-3.5 text-orange-500" />
                  <span>Foto pronta</span>
                </div>
                <p className="text-[10px] text-neutral-400 truncate">
                  Salva com sucesso
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 rounded cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Trocar</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1.5 border border-navy-700 text-neutral-400 hover:text-white hover:bg-navy-800 transition-colors rounded cursor-pointer"
                title="Remover"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {onFocalPointChange && (
            <div className="flex items-center justify-between gap-2 bg-[#13192f] border border-navy-800 p-2 rounded">
              <span className="text-[11px] text-neutral-300">Ponto de Foco (Copo):</span>
              <div className="flex items-center gap-1">
                {(['top', 'center', 'bottom'] as const).map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => onFocalPointChange(pt)}
                    className={`px-2 py-0.5 text-[10px] uppercase font-semibold rounded border transition-colors ${
                      focalPoint === pt
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                        : 'bg-navy-900 text-neutral-400 border-navy-700 hover:text-white'
                    }`}
                  >
                    {pt === 'top' ? 'Topo' : pt === 'center' ? 'Centro' : 'Base'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed p-5 text-center transition-colors cursor-pointer flex flex-col items-center justify-center space-y-1.5 rounded ${
            isDragging
              ? 'border-orange-500 bg-navy-900'
              : 'border-navy-700 bg-[#0c1122] hover:border-orange-500/50 hover:bg-[#13192f]'
          }`}
        >
          {isCompressing ? (
            <div className="py-2 space-y-1">
              <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-white">Processando imagem...</p>
            </div>
          ) : (
            <>
              <Camera className="w-5 h-5 text-neutral-400 stroke-[1.5]" />
              <p className="font-medium text-white text-xs">
                Clique para enviar foto
              </p>
              <p className="text-[10px] text-neutral-500">
                ou arraste o arquivo aqui
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowUrlFallback(!showUrlFallback)}
          className="text-[10px] text-neutral-500 hover:text-neutral-300 underline flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="w-2.5 h-2.5" />
          <span>{showUrlFallback ? 'Ocultar link' : 'Usar link externo'}</span>
        </button>
      </div>

      {showUrlFallback && (
        <input
          type="url"
          placeholder="https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-white"
        />
      )}
    </div>
  );
};
