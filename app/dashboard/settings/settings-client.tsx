'use client'

import { useState, useTransition } from 'react'
import { Percent, Save, CheckCircle } from 'lucide-react'
import { updateHonorariosRate } from '@/lib/actions/settings'

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

function PreviewExample({ rate }: { rate: number }) {
  const bruto     = 100000
  const descuento = Math.round(bruto * rate) / 100
  const neto      = bruto - descuento
  return (
    <div className="mt-5 bg-zinc-50 rounded-2xl px-4 py-3 text-xs text-zinc-500 space-y-1">
      <p className="font-bold text-zinc-400 uppercase tracking-wider mb-2">Ejemplo — comisión {fmt(bruto)}</p>
      <div className="flex justify-between">
        <span>Comisión bruta</span>
        <span className="tabular-nums font-medium">{fmt(bruto)}</span>
      </div>
      <div className="flex justify-between">
        <span>Retención {rate.toFixed(2)}%</span>
        <span className="tabular-nums font-medium text-zinc-400">− {fmt(descuento)}</span>
      </div>
      <div className="flex justify-between font-bold text-[#3D5151] border-t border-zinc-200 pt-1 mt-1">
        <span>Neto a recibir</span>
        <span className="tabular-nums">{fmt(neto)}</span>
      </div>
    </div>
  )
}

interface Props {
  honorariosRate: number
}

export function SettingsClient({ honorariosRate: initial }: Props) {
  const [rate, setRate]         = useState(String(initial))
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    const pct = parseFloat(rate)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setError('Ingresa un porcentaje válido entre 0 y 100.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await updateHonorariosRate(pct)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-terra-400 mb-1">Dashboard</p>
        <h1 className="text-2xl md:text-3xl font-black text-[#3D5151]">Configuración</h1>
      </div>

      {/* Honorarios section */}
      <div className="bg-white border-2 border-zinc-100 rounded-3xl px-6 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Percent size={16} className="text-[#76A6A5]" />
          <h2 className="text-sm font-black text-[#3D5151] uppercase tracking-wider">Retención de honorarios</h2>
        </div>
        <p className="text-xs text-zinc-400 mb-5 ml-6">
          Porcentaje que se descuenta de la comisión bruta al calcular el neto a pagar a cada trabajadora.
          En Chile el valor vigente para 2026 es <strong>15.25%</strong>.
        </p>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-zinc-500 mb-1.5">
              Tasa de retención (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={rate}
                onChange={e => { setRate(e.target.value); setSaved(false); setError(null) }}
                className="w-full pr-8 pl-4 py-3 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-sm font-bold text-[#3D5151] focus:outline-none focus:border-[#76A6A5] transition-colors tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm pointer-events-none">%</span>
            </div>
            {error && (
              <p className="text-xs text-rose-500 mt-1.5">{error}</p>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50
              bg-[#3D5151] text-white hover:bg-[#2d3d3d] active:scale-[0.97]"
          >
            {saved ? (
              <>
                <CheckCircle size={16} className="text-emerald-400" />
                Guardado
              </>
            ) : (
              <>
                <Save size={16} />
                {isPending ? 'Guardando…' : 'Guardar'}
              </>
            )}
          </button>
        </div>

        {/* Preview */}
        {!isNaN(parseFloat(rate)) && parseFloat(rate) >= 0 && (
          <PreviewExample rate={parseFloat(rate)} />
        )}
      </div>
    </div>
  )
}
