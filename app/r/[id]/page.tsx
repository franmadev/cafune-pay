import { notFound } from 'next/navigation'
import { Scissors } from 'lucide-react'
import { getPublicReceipt } from '@/lib/actions/public-receipts'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AutoPrint } from './auto-print'
import { DownloadButton } from './download-button'

export const dynamic = 'force-dynamic'

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Mixto',
}

export default async function PublicVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const receipt = await getPublicReceipt(id)
  if (!receipt) notFound()

  const client    = (receipt.clients  as { full_name: string } | null)?.full_name ?? null
  const issuedBy  = (receipt.workers  as { full_name: string } | null)?.full_name ?? null
  const services  = receipt.receipt_services as Array<{
    id: string; price_charged: number
    service_catalog: { name: string } | null
    workers: { full_name: string } | null
  }>
  const products  = receipt.receipt_products as Array<{
    id: string; quantity: number; unit_price: number; subtotal: number
    product_catalog: { name: string } | null
  }>
  const receiptNum = id.slice(0, 8).toUpperCase()

  return (
    <>
      {/* Auto-trigger print/save dialog on load */}
      <AutoPrint receiptId={id} />

      <div className="min-h-screen bg-zinc-100 print:bg-white flex flex-col items-center py-10 px-4 print:py-0 print:px-0">

        {/* Download hint — visible on screen, hidden when printing */}
        <div className="print:hidden w-full max-w-sm mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-400">
            El diálogo de descarga se abrirá automáticamente.
          </p>
          <DownloadButton receiptNum={receiptNum} />
        </div>

        {/* Voucher card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl print:shadow-none print:rounded-none print:max-w-none">

          {/* Header */}
          <div className="text-center pt-8 pb-6 px-6 border-b border-dashed border-zinc-200">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Scissors size={18} className="text-[#A68776]" />
              <span className="text-2xl font-black tracking-tight text-[#3D5151]">cafuné</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Espacio de cuidado personal
            </p>
          </div>

          {/* Receipt info */}
          <div className="px-6 py-5 border-b border-dashed border-zinc-200">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 text-center mb-4">
              Comprobante de atención
            </p>
            <div className="space-y-1.5 text-sm">
              <Row label="Fecha"        value={formatDate(receipt.issued_at)} />
              <Row label="N° boleta"    value={<span className="font-mono text-xs">{receiptNum}</span>} />
              {client   && <Row label="Cliente"     value={client} />}
              {issuedBy && <Row label="Emitida por" value={issuedBy} />}
              <Row label="Forma de pago" value={PAYMENT_LABEL[receipt.payment_method] ?? receipt.payment_method} />
            </div>
          </div>

          {/* Services */}
          {services.length > 0 && (
            <div className="px-6 py-5 border-b border-dashed border-zinc-200">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">Servicios</p>
              <div className="space-y-3">
                {services.map((s) => (
                  <div key={s.id}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-[#3D5151]">{s.service_catalog?.name}</span>
                      <span className="tabular-nums font-semibold">{formatCurrency(s.price_charged)}</span>
                    </div>
                    {s.workers?.full_name && (
                      <p className="text-xs text-zinc-400 mt-0.5">→ {s.workers.full_name}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {products.length > 0 && (
            <div className="px-6 py-5 border-b border-dashed border-zinc-200">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">Productos</p>
              <div className="space-y-2">
                {products.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="font-medium text-[#3D5151]">
                      {p.product_catalog?.name}
                      {p.quantity > 1 && <span className="text-zinc-400 ml-1">×{p.quantity}</span>}
                    </span>
                    <span className="tabular-nums font-semibold">{formatCurrency(p.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="px-6 py-5 border-b border-dashed border-zinc-200">
            <div className="flex justify-between items-center">
              <span className="text-base font-black uppercase tracking-wider text-[#3D5151]">Total</span>
              <span className="text-2xl font-black tabular-nums text-[#A68776]">
                {formatCurrency(receipt.total_amount)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 text-center">
            <p className="text-xs text-zinc-400 mb-1">¡Gracias por tu visita!</p>
            <p className="text-[10px] text-zinc-300">cafuné · espacio de cuidado personal</p>
          </div>
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-zinc-400 flex-shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
