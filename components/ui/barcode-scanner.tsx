'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Camera, ZapOff, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { playScan } from '@/lib/sounds'

// ── BarcodeDetector type (not in TS lib by default) ───────────────────────────
interface BarcodeResult { rawValue: string; format: string }
interface BarcodeDetectorAPI {
  new (opts?: { formats?: string[] }): {
    detect(src: CanvasImageSource): Promise<BarcodeResult[]>
  }
  getSupportedFormats(): Promise<string[]>
}

interface Props {
  onScan:  (code: string) => void
  onClose: () => void
}

const WANTED_FORMATS = [
  'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'code_128', 'code_39', 'code_93',
  'qr_code', 'data_matrix', 'itf', 'codabar',
]

export function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  type Status = 'loading' | 'scanning' | 'detected' | 'error'
  const [status,   setStatus]   = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const handleDetected = useCallback((code: string) => {
    setStatus('detected')
    playScan()
    // Brief visual confirmation before calling the parent
    setTimeout(() => onScan(code), 350)
  }, [onScan])

  useEffect(() => {
    let stopped    = false
    let stream:     MediaStream | null = null
    let frameId:    number

    // ── zxing cleanup handle ───────────────────────────────────────────────
    let zxingStop: (() => void) | null = null

    async function init() {
      try {
        // 1️⃣  Acquire camera — explicitly prefer back camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width:  { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        if (stopped) return

        const video  = videoRef.current!
        const canvas = canvasRef.current!

        video.srcObject = stream
        video.playsInline = true
        await video.play()

        // Wait until the video has real dimensions
        await new Promise<void>(resolve => {
          const check = () =>
            video.videoWidth > 0 ? resolve() : requestAnimationFrame(check)
          check()
        })
        if (stopped) return

        setStatus('scanning')

        const ctx = canvas.getContext('2d', { willReadFrequently: true })!

        // 2️⃣  Try native BarcodeDetector (Chrome 83+, Android, Chromium Edge)
        const Win = window as unknown as { BarcodeDetector?: BarcodeDetectorAPI }
        if (Win.BarcodeDetector) {
          let supported: string[] = WANTED_FORMATS
          try {
            const all = await Win.BarcodeDetector.getSupportedFormats()
            supported = WANTED_FORMATS.filter(f => all.includes(f))
            if (!supported.length) supported = all
          } catch { /* use defaults */ }

          const detector = new Win.BarcodeDetector({ formats: supported })

          const tick = async () => {
            if (stopped) return
            canvas.width  = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0)
            try {
              const [hit] = await detector.detect(canvas)
              if (hit) { handleDetected(hit.rawValue); return }
            } catch { /* no barcode in frame */ }
            frameId = requestAnimationFrame(tick)
          }
          tick()
          return
        }

        // 3️⃣  Fallback: @zxing/browser — decode canvas frame by frame
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (stopped) return
        const reader = new BrowserMultiFormatReader()

        const tick = () => {
          if (stopped) return
          canvas.width  = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0)
          try {
            const result = reader.decodeFromCanvas(canvas)
            if (result) { handleDetected(result.getText()); return }
          } catch {
            // NotFoundException fires every frame without a barcode — normal
          }
          frameId = requestAnimationFrame(tick)
        }
        tick()

        // Keep a cleanup reference (zxing doesn't own the stream here)
        zxingStop = () => { /* stream is stopped in cleanup below */ }

      } catch (err: unknown) {
        if (stopped) return
        const isDenied =
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        setErrorMsg(
          isDenied
            ? 'Permiso de cámara denegado. Habilítalo en la configuración del navegador.'
            : 'No se pudo acceder a la cámara.',
        )
        setStatus('error')
      }
    }

    init()

    return () => {
      stopped = true
      cancelAnimationFrame(frameId)
      zxingStop?.()
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [handleDetected])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-[100] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2 text-white">
          <Camera size={18} />
          <p className="text-sm font-medium">
            {status === 'loading'   && 'Iniciando cámara…'}
            {status === 'scanning'  && 'Apunta al código de barras'}
            {status === 'detected'  && '✓ Código detectado'}
            {status === 'error'     && 'Error de cámara'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X size={22} />
        </button>
      </div>

      {/* Body */}
      {status === 'error' ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-white px-8">
          <ZapOff size={52} className="text-zinc-500" />
          <p className="text-sm text-zinc-300 text-center leading-relaxed">{errorMsg}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-zinc-900 rounded-2xl text-sm font-semibold"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {/* Video feed */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          {/* Hidden canvas used for decoding */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">

              {status === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 text-white"
                >
                  <Loader2 size={40} className="animate-spin" />
                  <p className="text-sm">Iniciando cámara…</p>
                </motion.div>
              )}

              {status === 'scanning' && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-72 h-44 relative"
                >
                  {/* Corner markers */}
                  {[
                    'top-0 left-0 border-r-0 border-b-0 rounded-tl',
                    'top-0 right-0 border-l-0 border-b-0 rounded-tr',
                    'bottom-0 left-0 border-r-0 border-t-0 rounded-bl',
                    'bottom-0 right-0 border-l-0 border-t-0 rounded-br',
                  ].map((cls, i) => (
                    <span key={i} className={`absolute ${cls} w-7 h-7 border-white border-[3px]`} />
                  ))}
                  {/* Animated scan line */}
                  <motion.div
                    className="absolute left-3 right-3 h-0.5 bg-rose-400 rounded-full"
                    animate={{ top: ['8%', '92%', '8%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>
              )}

              {status === 'detected' && (
                <motion.div
                  key="detected"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                  className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl"
                >
                  <span className="text-white text-5xl leading-none">✓</span>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  )
}
