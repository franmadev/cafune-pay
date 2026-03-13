'use client'

import { useState, useTransition } from 'react'
import { Scan } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { BarcodeScanner } from '@/components/ui/barcode-scanner'
import { Spinner } from '@/components/ui/spinner'
import { createProduct } from '@/lib/actions/catalog'

export function ProductFormClient() {
  const [name,        setName]        = useState('')
  const [price,       setPrice]       = useState('')
  const [barcode,     setBarcode]     = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [isPending,   startTransition] = useTransition()

  function handleScan(code: string) {
    setBarcode(code)
    setShowScanner(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const parsedPrice = parseFloat(price)
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Nombre y precio son obligatorios')
      return
    }

    startTransition(async () => {
      const result = await createProduct({
        name:    name.trim(),
        price:   parsedPrice,
        barcode: barcode.trim() || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setName('')
        setPrice('')
        setBarcode('')
      }
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            suppressHydrationWarning
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            placeholder="Shampoo Kerastase"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Precio</label>
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
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

        {error && (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-rose-900 text-white rounded-xl text-sm font-medium hover:bg-rose-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? <><Spinner size={15} /> Guardando...</> : 'Agregar producto'}
        </button>
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
