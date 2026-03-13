'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, Search } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/utils'

type HistoryEntry = {
  worker_id:      string
  date_from:      string
  date_to:        string
  net_amount:     number
  payment_method: string
  paid_at:        string
}

interface Props {
  history:    HistoryEntry[]
  workerId:   string
  /** Si se está viendo un período histórico, sus fechas para resaltarlo */
  activeFrom?: string
  activeTo?:   string
}

export function PayrollHistoryPanel({ history, workerId, activeFrom, activeTo }: Props) {
  const [search, setSearch] = useState('')

  const isCurrentView = !activeFrom && !activeTo

  const filtered = search.trim()
    ? history.filter(p => {
        const label = `${formatDateShort(p.date_from + 'T00:00:00')} ${formatDateShort(p.date_to + 'T23:59:59')} ${p.date_from} ${p.date_to}`.toLowerCase()
        return label.includes(search.toLowerCase())
      })
    : history

  return (
    <div className="flex flex-col bg-white rounded-3xl border-2 border-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex-shrink-0">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
          Historial de nóminas
        </p>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por fecha…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border-2 border-zinc-100 bg-zinc-50 focus:outline-none focus:border-[#76A6A5] transition-colors"
          />
        </div>
      </div>

      {/* Nómina vigente */}
      {!search.trim() && (
        <Link
          href={`/dashboard/reports/payroll?workerId=${workerId}`}
          className={`flex items-center gap-3 px-5 py-3.5 border-b border-zinc-50 hover:bg-zinc-50 transition-colors ${
            isCurrentView ? 'bg-[#F2F7F7]' : ''
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock size={11} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#3D5151]">Nómina vigente</p>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">Pendiente de pago</p>
          </div>
        </Link>
      )}

      {/* Historial pagado */}
      <div className="overflow-y-auto flex-1 max-h-[50vh] lg:max-h-[calc(100vh-22rem)] divide-y divide-zinc-50">
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-400 italic px-5 py-6 text-center">
            {history.length === 0 ? 'Aún no hay nóminas pagadas.' : 'Sin resultados.'}
          </p>
        ) : (
          filtered.map(p => (
            <Link
              key={`${p.date_from}-${p.date_to}-${p.paid_at}`}
              href={`/dashboard/reports/payroll?workerId=${workerId}&from=${p.date_from}&to=${p.date_to}`}
              className={`flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors group ${
                activeFrom === p.date_from && activeTo === p.date_to ? 'bg-[#F2F7F7]' : ''
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle size={11} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#3D5151] group-hover:text-terra-500 transition-colors">
                    {formatDateShort(p.date_from + 'T00:00:00')} – {formatDateShort(p.date_to + 'T23:59:59')}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {p.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                    {' · '}
                    {new Date(p.paid_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black tabular-nums text-zinc-500 group-hover:text-[#3D5151] transition-colors flex-shrink-0 ml-2">
                {formatCurrency(p.net_amount)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
