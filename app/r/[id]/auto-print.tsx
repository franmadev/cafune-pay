'use client'

import { useEffect } from 'react'

export function AutoPrint({ receiptId }: { receiptId: string }) {
  useEffect(() => {
    const prev = document.title
    document.title = `cafune-boleta-${receiptId.slice(0, 8).toUpperCase()}`
    // Pequeño delay para que el DOM esté completamente renderizado
    const t = setTimeout(() => {
      window.print()
      setTimeout(() => { document.title = prev }, 500)
    }, 400)
    return () => clearTimeout(t)
  }, [receiptId])

  return null
}
