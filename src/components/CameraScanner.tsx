import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'html5-qr-code-scanner-box';

  useEffect(() => {
    let html5QrCode: Html5Qrcode;

    async function initScanner() {
      try {
        setIsStarting(true);
        setErrorMessage(null);

        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setErrorMessage('Kamera tidak ditemukan pada perangkat ini.');
          setIsStarting(false);
          return;
        }

        setCameras(devices);
        // Prioritaskan kamera belakang (environment)
        const backCamera = devices.find(
          d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('belakang')
        ) || devices[devices.length - 1];

        const camId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCameraId(camId);

        html5QrCode = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          camId,
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.33,
          },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {
            // Abaikan frame yang belum membaca barcode
          }
        );

        setIsStarting(false);
      } catch (err: any) {
        console.error('Error starting camera scanner:', err);
        setErrorMessage(err.message || 'Gagal mengakses kamera. Pastikan izin kamera telah diberikan.');
        setIsStarting(false);
      }
    }

    initScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error).finally(() => {
          scannerRef.current?.clear();
        });
      }
    };
  }, [onScan]);

  const switchCamera = async () => {
    if (!scannerRef.current || cameras.length <= 1) return;
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCam = cameras[nextIndex];
      setSelectedCameraId(nextCam.id);
      setIsStarting(true);

      await scannerRef.current.start(
        nextCam.id,
        {
          fps: 10,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.33,
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {}
      );
      setIsStarting(false);
    } catch (err: any) {
      console.error('Error switching camera:', err);
      setErrorMessage(err.message || 'Gagal mengganti kamera.');
      setIsStarting(false);
    }
  };

  return (
    <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 p-3 sm:p-4 mb-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-brand-400 animate-pulse" />
          <span className="font-semibold text-sm">Scanner Kamera Aktif</span>
        </div>
        <div className="flex items-center gap-2">
          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Ganti Kamera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-200 transition"
            title="Tutup Kamera"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {isStarting && !errorMessage && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
          <span>Mempersiapkan sensor kamera...</span>
        </div>
      )}

      <div className="mt-2 relative rounded-xl overflow-hidden bg-black flex justify-center items-center min-h-[220px]">
        <div id={readerElementId} className="w-full max-w-[360px]" />
      </div>

      <p className="text-center text-[11px] text-slate-400 mt-2">
        Arahkan kamera ke barcode label kasur (Code 128 / QR). Hasil terbaca otomatis.
      </p>
    </div>
  );
};

