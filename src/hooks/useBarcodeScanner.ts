import { useState, useRef, useEffect, useCallback } from 'react';
import { playSuccessBeep, playErrorBeep } from '../utils/feedback';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => boolean | Promise<boolean>; // return true if valid, false if rejected
  debounceMs?: number; // default 1000ms (1 detik) sesuai PRD
  enabled?: boolean;
}

export function useBarcodeScanner({
  onScan,
  debounceMs = 1000,
  enabled = true,
}: UseBarcodeScannerOptions) {
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScanCodeRef = useRef<string>('');
  const bufferRef = useRef<string>('');
  const keyTimerRef = useRef<any>(null);

  const processScan = useCallback(async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    const now = Date.now();
    // Rule PRD: Pembacaan ganda pada barcode yang sama dalam waktu < 1 detik dianggap satu scan
    if (trimmed === lastScanCodeRef.current && (now - lastScanTimeRef.current) < debounceMs) {
      console.warn(`Debounced duplicate scan for code: ${trimmed} (${now - lastScanTimeRef.current}ms)`);
      return;
    }

    lastScanTimeRef.current = now;
    lastScanCodeRef.current = trimmed;
    setLastScannedCode(trimmed);
    setErrorMessage(null);

    try {
      const isValid = await onScan(trimmed);
      if (isValid) {
        playSuccessBeep();
      } else {
        playErrorBeep();
      }
    } catch (err: any) {
      playErrorBeep();
      setErrorMessage(err.message || 'Gagal memproses barcode');
    }
  }, [onScan, debounceMs]);

  // Listener untuk Scanner USB / Bluetooth (berperilaku seperti keyboard cepat diakhiri Enter)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Jika pengguna sedang mengetik di textarea atau input teks biasa selain scanner input, abaikan
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      
      // Jika fokus di input manual biasa, biarkan input tersebut mengurus submit sendiri
      if (isInput && !(activeEl as HTMLElement).hasAttribute('data-barcode-scanner')) {
        return;
      }

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 3) {
          e.preventDefault();
          processScan(bufferRef.current);
          bufferRef.current = '';
        }
        return;
      }

      // Scanner mengetik karakter dengan cepat
      if (e.key.length === 1) {
        bufferRef.current += e.key;

        // Reset buffer jika jeda terlalu lama (bukan scanner mesin melainkan pengetikan lambat manual)
        clearTimeout(keyTimerRef.current);
        keyTimerRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(keyTimerRef.current);
    };
  }, [enabled, processScan]);

  return {
    processScan,
    lastScannedCode,
    errorMessage,
    setErrorMessage,
  };
}

