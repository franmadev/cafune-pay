import { notFound, redirect } from 'next/navigation'
import { Scissors } from 'lucide-react'
import { getReceipt } from '@/lib/actions/receipts'
import { formatCurrency, formatDate } from '@/lib/utils'
import { VoucherActions } from '@/components/ui/print-button'
import { MonsteraLeaf } from '@/components/ui/monstera-leaf'
import { ReceiptQrCode } from '@/components/ui/qr-code'

const PAYMENT_LABEL: Record<string, string> = {
  cash:     'Efectivo',
  card:     'Tarjeta',
  transfer: 'Transferencia',
  mixed:    'Mixto',
}

export default async function ReceiptVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const receipt = await getReceipt(id)

  if (!receipt) notFound()
  if (receipt.status !== 'completed') redirect(`/dashboard/receipts/${id}`)

  const client     = receipt.clients as { full_name: string } | null
  const issuedBy   = (receipt.workers as { full_name: string } | null)?.full_name ?? null
  const services = receipt.receipt_services as Array<{
    id:             string
    price_charged:  number
    commission_amt: number
    commission_type:  string
    commission_value: number
    service_catalog: { name: string } | null
    workers:         { full_name: string } | null
  }>
  const products = receipt.receipt_products as Array<{
    id:            string
    quantity:      number
    unit_price:    number
    subtotal:      number
    product_catalog: { name: string } | null
  }>

  const receiptNum = id.slice(0, 8).toUpperCase()

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white flex flex-col items-center py-10 px-4 print:py-0 print:px-0 relative overflow-hidden">

      {/* Monstera decorations */}
      <div className="print:hidden absolute top-0 right-0 w-[220px] translate-x-[35%] -translate-y-[10%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="full" className="text-[#568A66] opacity-[0.13] w-full h-full" />
      </div>
      <div className="print:hidden absolute bottom-0 left-0 w-[160px] -translate-x-[30%] translate-y-[20%] pointer-events-none select-none" aria-hidden="true">
        <MonsteraLeaf variant="small" className="text-[#3D6B4F] opacity-[0.10] w-full h-full" />
      </div>

      {/* Voucher card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl print:shadow-none print:rounded-none print:max-w-none">

        {/* ── Encabezado ── */}
        <div className="text-center pt-8 pb-6 px-6 border-b border-dashed border-zinc-200">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Scissors size={18} className="text-terra-500" />
            <span className="text-2xl font-black tracking-tight text-[#3D5151]">cafuné</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            Espacio de cuidado personal
          </p>
        </div>

        {/* ── Datos de la boleta ── */}
        <div className="px-6 py-5 border-b border-dashed border-zinc-200">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 text-center mb-4">
            Comprobante de atención
          </p>
          <div className="space-y-1.5 text-sm">
            <Row label="Fecha"        value={formatDate(receipt.issued_at)} />
            <Row label="N° boleta"    value={<span className="font-mono text-xs">{receiptNum}</span>} />
            {client    && <Row label="Cliente"     value={client.full_name} />}
            {issuedBy  && <Row label="Emitida por" value={issuedBy} />}
            <Row label="Forma de pago" value={PAYMENT_LABEL[receipt.payment_method] ?? receipt.payment_method} />
          </div>
        </div>

        {/* ── Servicios ── */}
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
                  {s.workers && (
                    <p className="text-xs text-zinc-400 mt-0.5">→ {s.workers.full_name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Productos ── */}
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

        {/* ── Total ── */}
        <div className="px-6 py-5 border-b border-dashed border-zinc-200">
          <div className="flex justify-between items-center">
            <span className="text-base font-black uppercase tracking-wider text-[#3D5151]">Total</span>
            <span className="text-2xl font-black tabular-nums text-terra-500">
              {formatCurrency(receipt.total_amount)}
            </span>
          </div>
        </div>

        {/* ── QR + Pie ── */}
        <div className="flex flex-col items-center pt-4 pb-6 px-6 gap-3">
          <ReceiptQrCode receiptId={id} />
          <p className="text-xs text-zinc-400">¡Gracias por tu visita!</p>
          <p className="text-[10px] text-zinc-300">cafuné · espacio de cuidado personal</p>
        </div>
      </div>

      <VoucherActions backHref={`/dashboard/receipts/${id}`} receiptId={id} />
    </div>
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
