'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Receipt, ScanLine } from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'
import { BarcodeScanner } from '@/components/ui/barcode-scanner'
import { formatCurrency, formatDate } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  open: 'Abierta', completed: 'Completada', voided: 'Anulada',
}
const STATUS_DOT: Record<string, string> = {
  open: 'bg-amber-400', completed: 'bg-emerald-400', voided: 'bg-zinc-300',
}
const STATUS_BADGE: Record<string, string> = {
  open:      'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  voided:    'bg-zinc-100 text-zinc-500',
}

type ReceiptRow = {
  id:             string
  status:         string
  payment_method: string
  issued_at:      string
  total_amount:   number
  clients:        { full_name: string } | null
}

interface Props {
  receipts:    ReceiptRow[]
  activeStatus?: string
}

// UUID v4 pattern — matches receipt IDs
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function ReceiptsListClient({ receipts, activeStatus }: Props) {
  const router = useRouter()
  const [query,       setQuery]       = useState('')
  const [showScanner, setShowScanner] = useState(false)

  function handleScan(code: string) {
    const id = code.trim()
    if (UUID_RE.test(id)) {
      router.push(`/dashboard/receipts/${id}`)
    }
    setShowScanner(false)
  }

  const filtered = receipts.filter(r => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      (r.clients?.full_name ?? '').toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      String(r.total_amount).includes(q) ||
      STATUS_LABEL[r.status]?.toLowerCase().includes(q)
    )
  })

  if (!receipts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
        <Receipt size={52} strokeWidth={1} className="mb-4 text-zinc-300" />
        <p className="text-base font-medium">
          No hay boletas {activeStatus ? `"${STATUS_LABEL[activeStatus]}"` : 'aún'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search + QR scan row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por cliente, monto o estado…"
          />
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center justify-center w-12 h-12 rounded-2xl border-2 border-zinc-200 bg-white text-zinc-500 hover:border-[#3D5151] hover:text-[#3D5151] transition-colors flex-shrink-0"
          title="Escanear QR de boleta"
        >
          <ScanLine size={20} />
        </button>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-400 italic text-center py-8">
          Sin resultados para &ldquo;{query}&rdquo;
        </p>
      ) : (
        filtered.map((r) => (
          <Link
            key={r.id}
            href={`/dashboard/receipts/${r.id}`}
            className="flex items-center justify-between bg-white border-2 border-zinc-100 rounded-2xl px-5 py-4 md:px-6 md:py-5 hover:border-rose-200 hover:shadow-sm active:scale-[0.99] transition-all min-h-[72px]"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_DOT[r.status]}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${STATUS_BADGE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  <span className="text-sm text-zinc-400">{formatDate(r.issued_at)}</span>
                </div>
                <p className="text-sm font-medium text-zinc-600 truncate">
                  {r.clients?.full_name ?? 'Sin cliente'}
                </p>
              </div>
            </div>
            <p className="text-xl md:text-2xl font-black text-zinc-900 tabular-nums ml-4 flex-shrink-0">
              {formatCurrency(r.total_amount)}
            </p>
          </Link>
        ))
      )}
    </div>
  )
}
