'use client'

import Link from 'next/link'
import { Printer, Download, ChevronLeft } from 'lucide-react'

interface Props {
  backHref:   string
  backLabel?: string
  receiptId?: string
}

function handleDownload(receiptId?: string) {
  const prev = document.title
  if (receiptId) document.title = `cafune-boleta-${receiptId.slice(0, 8).toUpperCase()}`
  window.print()
  // Restore after a tick so the print dialog has time to read the title
  setTimeout(() => { document.title = prev }, 500)
}

export function VoucherActions({ backHref, backLabel = 'Volver', receiptId }: Props) {
  return (
    <div className="flex gap-3 mt-6 print:hidden">
      <Link
        href={backHref}
        className="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-zinc-200 text-zinc-600 text-sm font-bold hover:border-zinc-300 transition-colors"
      >
        <ChevronLeft size={16} />
        {backLabel}
      </Link>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-zinc-200 text-zinc-600 text-sm font-bold hover:border-zinc-300 transition-colors"
      >
        <Printer size={16} />
        Imprimir
      </button>
      <button
        onClick={() => handleDownload(receiptId)}
        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#3D5151] text-white text-sm font-bold hover:bg-[#2e3d3d] transition-colors"
      >
        <Download size={16} />
        Descargar PDF
      </button>
    </div>
  )
}
