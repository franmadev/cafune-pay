'use client'

import QRCode from 'react-qr-code'

const BASE = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')

interface Props {
  receiptId: string
  size?:     number
  className?: string
}

export function ReceiptQrCode({ receiptId, size = 110, className = '' }: Props) {
  const url = `${BASE}/r/${receiptId}`
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="p-2 bg-white rounded-lg border border-zinc-100">
        <QRCode value={url} size={size} level="M" />
      </div>
      <p className="text-[9px] font-mono tracking-widest text-zinc-300 uppercase">
        {receiptId.slice(0, 8)}
      </p>
    </div>
  )
}
