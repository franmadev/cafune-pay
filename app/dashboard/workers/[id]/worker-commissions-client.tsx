'use client'

import { useState, useTransition } from 'react'
import { Percent, DollarSign, RotateCcw, Check } from 'lucide-react'
import { upsertWorkerCommission, removeWorkerCommission } from '@/lib/actions/worker-commissions'
import { formatCurrency } from '@/lib/utils'
import type { CommissionType } from '@/lib/supabase/types'

type Commission = {
  service_id:     string
  service_name:   string
  default_type:   CommissionType
  default_value:  number
  override_type:  CommissionType | null
  override_value: number | null
  has_override:   boolean
}

interface Props {
  workerId:           string
  initialCommissions: Commission[]
}

function fmtCommission(type: CommissionType, value: number) {
  return type === 'percentage' ? `${value}%` : formatCurrency(value)
}

export function WorkerCommissionsClient({ workerId, initialCommissions }: Props) {
  const [commissions, setCommissions] = useState(initialCommissions)

  if (commissions.length === 0) {
    return (
      <div className="bg-white border-2 border-zinc-100 rounded-3xl px-6 py-8 text-center">
        <p className="text-sm text-zinc-400">No hay servicios activos en el catálogo.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-zinc-100 rounded-3xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <Percent size={15} className="text-[#76A6A5]" />
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
            Comisiones por servicio
          </p>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Sin override = usa el valor por defecto del servicio. Puede ser % o monto fijo.
        </p>
      </div>

      <div className="divide-y divide-zinc-50">
        {commissions.map(c => (
          <CommissionRow
            key={c.service_id}
            commission={c}
            workerId={workerId}
            onChange={updated =>
              setCommissions(prev =>
                prev.map(x => x.service_id === updated.service_id ? updated : x)
              )
            }
          />
        ))}
      </div>
    </div>
  )
}

function CommissionRow({
  commission: c,
  workerId,
  onChange,
}: {
  commission: Commission
  workerId:   string
  onChange:   (updated: Commission) => void
}) {
  const effectiveType  = c.has_override ? c.override_type!  : c.default_type
  const effectiveValue = c.has_override ? c.override_value! : c.default_value

  const [editing, setEditing]        = useState(false)
  const [selType, setSelType]        = useState<CommissionType>(effectiveType)
  const [selValue, setSelValue]      = useState(String(effectiveValue))
  const [saved, setSaved]            = useState(false)
  const [isPending, startTransition] = useTransition()

  const openEdit = () => {
    setSelType(effectiveType)
    setSelValue(String(effectiveValue))
    setEditing(true)
  }

  const handleSave = () => {
    const val = parseFloat(selValue)
    if (isNaN(val) || val < 0) return
    if (selType === 'percentage' && val > 100) return
    startTransition(async () => {
      await upsertWorkerCommission(workerId, c.service_id, selType, val)
      onChange({ ...c, override_type: selType, override_value: val, has_override: true })
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleReset = () => {
    startTransition(async () => {
      await removeWorkerCommission(workerId, c.service_id)
      onChange({ ...c, override_type: null, override_value: null, has_override: false })
    })
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">

        {/* Service name + default */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#3D5151] truncate">{c.service_name}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Default:{' '}
            <span className="font-medium">
              {fmtCommission(c.default_type, c.default_value)}
            </span>
          </p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Current value badge — click to edit */}
          {!editing && (
            <button
              onClick={openEdit}
              className={`flex items-center gap-1.5 text-sm font-bold tabular-nums px-3 py-1.5 rounded-xl transition-colors ${
                c.has_override
                  ? 'bg-[#F2F7F7] text-[#3D5151] hover:bg-[#E8F0F0]'
                  : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
              }`}
            >
              {saved && <Check size={13} className="text-emerald-500" />}
              {fmtCommission(effectiveType, effectiveValue)}
            </button>
          )}

          {/* Inline edit form */}
          {editing && (
            <div className="flex items-center gap-2">
              {/* Type toggle */}
              <div className="flex rounded-xl overflow-hidden border-2 border-zinc-100">
                <button
                  type="button"
                  onClick={() => setSelType('percentage')}
                  className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${
                    selType === 'percentage'
                      ? 'bg-[#3D5151] text-white'
                      : 'bg-white text-zinc-400 hover:bg-zinc-50'
                  }`}
                >
                  <Percent size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelType('fixed')}
                  className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${
                    selType === 'fixed'
                      ? 'bg-[#3D5151] text-white'
                      : 'bg-white text-zinc-400 hover:bg-zinc-50'
                  }`}
                >
                  <DollarSign size={12} />
                </button>
              </div>

              {/* Value input */}
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={selType === 'percentage' ? 100 : undefined}
                  step={selType === 'percentage' ? '0.5' : '100'}
                  value={selValue}
                  onChange={e => setSelValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                  autoFocus
                  className="w-24 pr-5 pl-3 py-1.5 bg-zinc-50 border-2 border-[#76A6A5] rounded-xl text-sm font-bold text-[#3D5151] focus:outline-none tabular-nums"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 pointer-events-none">
                  {selType === 'percentage' ? '%' : '$'}
                </span>
              </div>

              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-3 py-1.5 bg-[#3D5151] text-white text-xs font-bold rounded-xl hover:bg-[#2d3d3d] disabled:opacity-50 transition-colors"
              >
                {isPending ? '…' : 'OK'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600 px-1.5 py-1.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Reset to default */}
          {c.has_override && !editing && (
            <button
              onClick={handleReset}
              disabled={isPending}
              title="Volver al default del servicio"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-rose-400 hover:bg-rose-50 transition-colors disabled:opacity-40"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
