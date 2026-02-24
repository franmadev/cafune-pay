'use client'

import { useState, useRef } from 'react'
import { Scan } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { BarcodeScanner } from '@/components/ui/barcode-scanner'
import { SubmitButton } from '@/components/ui/submit-button'

interface Props {
  action: (formData: FormData) => Promise<void>
}

export function ProductFormClient({ action }: Props) {
  const [barcode, setBarcode]       = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function handleScan(code: string) {
    setBarcode(code)
    setShowScanner(false)
  }

  return (
    <>
      <form ref={formRef} action={action} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre</label>
          <input
            name="name"
            required
            suppressHydrationWarning
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            placeholder="Shampoo Kerastase"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Precio</label>
          <input
            name="price"
            type="number"
            min="0"
            required
            suppressHydrationWarning
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Código de barras (opcional)</label>
          <div className="flex gap-2">
            <input
              name="barcode"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              suppressHydrationWarning
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              placeholder="Escribe o escanea"
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 text-sm text-zinc-600 hover:border-rose-400 hover:text-rose-600 transition-colors"
            >
              <Scan size={16} />
              Escanear
            </button>
          </div>
        </div>
        <SubmitButton
          pendingText="Guardando..."
          className="w-full py-2.5 bg-rose-900 text-white rounded-xl text-sm font-medium hover:bg-rose-800 transition-colors"
        >
          Agregar producto
        </SubmitButton>
      </form>

      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
