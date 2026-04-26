// ═══════════════════════════════════════════════════════════════
// src/components/booking/PaymentUpload.jsx
// Sube el comprobante de Yape/Plin a Supabase Storage.
// Estados: idle, uploading, uploaded, error.
// Devuelve al padre el path del archivo via onUploaded(path).
// ═══════════════════════════════════════════════════════════════

import { useRef, useState } from 'react';
import { Upload, CheckCircle2, XCircle, Loader2, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import publicBookingService from '../../services/publicBookingService';

export default function PaymentUpload({ tenantId, onUploaded }) {
  const inputRef = useRef(null);
  // status: 'idle' | 'uploading' | 'uploaded' | 'error'
  const [status, setStatus] = useState('idle');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePickFile = () => inputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validacion rapida en cliente
    if (!file.type.startsWith('image/')) {
      setStatus('error');
      setErrorMsg('Solo se aceptan imágenes (JPG, PNG, WebP).');
      return;
    }

    // Preview local antes de subir
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setStatus('uploading');
    setErrorMsg('');

    try {
      const path = await publicBookingService.uploadPaymentProof({ tenantId, file });
      setStatus('uploaded');
      onUploaded?.(path);
      toast.success('Comprobante subido correctamente.');
    } catch (err) {
      console.error('[PaymentUpload]', err);
      setStatus('error');
      setErrorMsg(err.message || 'Error al subir el comprobante.');
      onUploaded?.(null);
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMsg('');
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700 font-sora">
        Comprobante de pago (Yape / Plin) <span className="text-red-500">*</span>
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Estado: idle ─ Boton para seleccionar imagen */}
      {status === 'idle' && (
        <button
          type="button"
          onClick={handlePickFile}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-teal-500 hover:bg-teal-50/40 transition-colors"
        >
          <Upload className="w-8 h-8 text-gray-400" />
          <span className="text-sm text-gray-600">
            Toca para subir foto del comprobante
          </span>
          <span className="text-xs text-gray-400">JPG, PNG o WebP — máx. 5 MB</span>
        </button>
      )}

      {/* Estados: uploading / uploaded / error con preview */}
      {status !== 'idle' && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Comprobante"
              className="w-full max-h-64 object-contain bg-gray-50"
            />
          ) : (
            <div className="flex items-center justify-center h-32 bg-gray-50">
              <ImageIcon className="w-10 h-10 text-gray-300" />
            </div>
          )}

          <div className="p-3 flex items-center justify-between gap-3">
            {status === 'uploading' && (
              <span className="flex items-center gap-2 text-sm text-teal-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                Subiendo comprobante...
              </span>
            )}
            {status === 'uploaded' && (
              <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Comprobante listo
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-2 text-sm text-red-600">
                <XCircle className="w-4 h-4" />
                {errorMsg || 'Error al subir'}
              </span>
            )}

            {(status === 'uploaded' || status === 'error') && (
              <button
                type="button"
                onClick={handleRetry}
                className="text-xs text-teal-700 hover:text-teal-800 font-medium underline"
              >
                Cambiar imagen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
