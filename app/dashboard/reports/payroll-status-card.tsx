'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { FileText, History, Banknote, ArrowLeftRight, Check, RotateCcw, ChevronDown } from 'lucide-react'
import { markPayrollPaid, unmarkPayrollPaid } from '@/lib/actions/payroll-payments'
import { formatCurrency } from '@/lib/utils'

type PaymentInfo = {
  worker_id:      string
  net_amount:     number
  payment_method: 'cash' | 'transfer'
  paid_at:        string
} | null

interface Props {
  worker: {
    worker_id:        string
    full_name:        string
    total_ingresos:   number
    total_comisiones: number
    ingreso_salon:    number
    n_servicios:      number
  }
  netAmount:       number
  from:            string
  to:              string
  initialPayment:  PaymentInfo
}

const METHOD_LABELS = {
  cash:     'Efectivo',
  transfer: 'Transferencia',
}

export function PayrollStatusCard({ worker: w, netAmount, from, to, initialPayment }: Props) {
  const [payment, setPayment]     = useState<PaymentInfo>(initialPayment)
  const [showMenu, setShowMenu]   = useState(false)
  const [isPending, startTransition] = useTransition()

  const handlePay = (method: 'cash' | 'transfer') => {
    setShowMenu(false)
    startTransition(async () => {
      const result = await markPayrollPaid(w.worker_id, from, to, netAmount, method)
      if (!result.error) {
        setPayment({
          worker_id:      w.worker_id,
          net_amount:     netAmount,
          payment_method: method,
          paid_at:        new Date().toISOString(),
        })
      }
    })
  }

  const handleUnpay = () => {
    startTransition(async () => {
      const result = await unmarkPayrollPaid(w.worker_id, from, to)
      if (!result.error) setPayment(null)
    })
  }

  return (
    <div className={`bg-white border rounded-xl px-4 py-3 transition-colors ${
      payment ? 'border-emerald-200 bg-emerald-50/30' : 'border-zinc-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-900">{w.full_name}</p>
          {/* Payment badge */}
          {payment && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
              <Check size={10} strokeWidth={3} />
              {METHOD_LABELS[payment.payment_method]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{w.n_servicios} servicio{w.n_servicios !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/reports/payroll/history/${w.worker_id}`}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              title="Ver historial"
            >
              <History size={13} />
            </Link>
            <Link
              href={`/dashboard/reports/payroll?workerId=${w.worker_id}&from=${from}&to=${to}`}
              className="flex items-center gap-1 text-xs text-rose-600 font-bold hover:text-rose-700 transition-colors"
            >
              <FileText size={13} />
              Nómina
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div>
          <p className="text-zinc-400">Vendió</p>
          <p className="font-semibold text-zinc-800">{formatCurrency(w.total_ingresos)}</p>
        </div>
        <div>
          <p className="text-zinc-400">Comisión</p>
          <p className="font-semibold text-terra-500">{formatCurrency(w.total_comisiones)}</p>
        </div>
        <div>
          <p className="text-zinc-400">Neto a pagar</p>
          <p className="font-semibold text-[#3D5151]">{formatCurrency(netAmount)}</p>
        </div>
      </div>

      {/* Payment action */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
        {payment ? (
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <p className="text-[11px] text-zinc-400 flex-shrink-0">
                Pagado el {new Date(payment.paid_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
              </p>
              <Link
                href={`/dashboard/reports/payroll/history/${w.worker_id}`}
                className="text-[11px] font-bold text-[#76A6A5] hover:text-[#3D5151] transition-colors flex-shrink-0"
              >
                Nueva nómina →
              </Link>
            </div>
            <button
              onClick={handleUnpay}
              disabled={isPending}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-500 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <RotateCcw size={11} />
              Deshacer
            </button>
          </div>
        ) : (
          <div className="relative w-full flex justify-end">
            <button
              onClick={() => setShowMenu(v => !v)}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Guardando…' : 'Registrar pago'}
              <ChevronDown size={12} />
            </button>

            {showMenu && (
              <div className="absolute bottom-full right-0 mb-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-10 min-w-[160px]">
                <button
                  onClick={() => handlePay('cash')}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <Banknote size={15} className="text-emerald-500" />
                  Efectivo
                </button>
                <button
                  onClick={() => handlePay('transfer')}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
                >
                  <ArrowLeftRight size={15} className="text-blue-500" />
                  Transferencia
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
