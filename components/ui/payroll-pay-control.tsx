'use client'

import { useState, useTransition } from 'react'
import { Banknote, ArrowLeftRight, Check, RotateCcw, ChevronDown } from 'lucide-react'
import { markPayrollPaid, unmarkPayrollPaid } from '@/lib/actions/payroll-payments'
import { formatCurrency } from '@/lib/utils'

type PaymentInfo = {
  worker_id:      string
  date_from:      string
  date_to:        string
  net_amount:     number
  payment_method: 'cash' | 'transfer'
  paid_at:        string
} | null

interface Props {
  workerId:       string
  netAmount:      number
  initialPayment: PaymentInfo
  /** 'inline' = fila horizontal dentro de tarjeta, 'block' = bloque prominente */
  variant?:       'inline' | 'block'
  readOnly?:      boolean
  /** Si false y hay pago, muestra solo el estado (sin botón deshacer ni modificar) */
  canUndo?:       boolean
}

const METHOD_LABELS = { cash: 'Efectivo', transfer: 'Transferencia' }

export function PayrollPayControl({
  workerId, netAmount, initialPayment, variant = 'inline', readOnly = false, canUndo,
}: Props) {
  const [payment, setPayment]        = useState<PaymentInfo>(initialPayment)
  const [showMenu, setShowMenu]      = useState(false)
  const [isPending, startTransition] = useTransition()

  const handlePay = (method: 'cash' | 'transfer') => {
    setShowMenu(false)
    startTransition(async () => {
      const result = await markPayrollPaid(workerId, netAmount, method)
      if (result.error) return
      if ('dateFrom' in result) {
        setPayment({
          worker_id:      workerId,
          date_from:      result.dateFrom,
          date_to:        result.dateTo,
          net_amount:     netAmount,
          payment_method: method,
          paid_at:        result.paidAt,
        })
      }
    })
  }

  const handleUnpay = () => {
    if (!payment) return
    startTransition(async () => {
      const result = await unmarkPayrollPaid(workerId, payment.date_from, payment.date_to)
      if (!result.error) setPayment(null)
    })
  }

  if (variant === 'block') {
    return (
      <div className={`rounded-2xl border-2 px-5 py-4 transition-colors ${
        payment ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-100 bg-zinc-50'
      }`}>
        {payment ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check size={14} className="text-emerald-600" strokeWidth={3} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-700">
                  Pagado · {METHOD_LABELS[payment.payment_method]}
                </p>
                <p className="text-[11px] text-emerald-600">
                  {new Date(payment.paid_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                  {' · '}{formatCurrency(payment.net_amount)}
                </p>
              </div>
            </div>
            {!readOnly && canUndo && (
              <button
                onClick={handleUnpay}
                disabled={isPending}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-500 transition-colors disabled:opacity-40"
              >
                <RotateCcw size={12} />
                Deshacer
              </button>
            )}
          </div>
        ) : readOnly ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center">
              <Check size={14} className="text-zinc-400" strokeWidth={3} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-500">Pago pendiente</p>
              <p className="text-xs text-zinc-400 mt-0.5">Neto: <span className="font-bold text-[#3D5151]">{formatCurrency(netAmount)}</span></p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-500">Estado del pago</p>
              <p className="text-xs text-zinc-400 mt-0.5">Neto a pagar: <span className="font-bold text-[#3D5151]">{formatCurrency(netAmount)}</span></p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Guardando…' : 'Registrar pago'}
                <ChevronDown size={13} />
              </button>
              {showMenu && (
                <div className="absolute bottom-full right-0 mb-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-10 min-w-[170px]">
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
          </div>
        )}
      </div>
    )
  }

  // variant === 'inline'
  return (
    <div className="flex items-center justify-between">
      {payment ? (
        <>
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <Check size={12} strokeWidth={3} />
            {METHOD_LABELS[payment.payment_method]}
          </span>
          {(canUndo ?? true) && (
            <button
              onClick={handleUnpay}
              disabled={isPending}
              className="text-[11px] text-zinc-400 hover:text-rose-500 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              <RotateCcw size={10} />
              Deshacer
            </button>
          )}
        </>
      ) : (
        <div className="relative w-full flex justify-end">
          <button
            onClick={() => setShowMenu(v => !v)}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Guardando…' : 'Registrar pago'}
            <ChevronDown size={11} />
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
  )
}
