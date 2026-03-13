'use client'

import { Download } from 'lucide-react'

export function DownloadButton({ receiptNum }: { receiptNum: string }) {
  return (
    <button
      onClick={() => {
        document.title = `cafune-boleta-${receiptNum}`
        window.print()
      }}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3D5151] text-white text-xs font-bold hover:bg-[#2e3d3d] transition-colors flex-shrink-0"
    >
      <Download size={13} />
      Descargar PDF
    </button>
  )
}
