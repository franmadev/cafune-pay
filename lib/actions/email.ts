'use server'

import QRCode from 'qrcode'
import { revalidatePath } from 'next/cache'
import { brevo, SENDER } from '@/lib/brevo'
import { createClient } from '@/lib/supabase/server'
import { getWorkerPayrollDetail } from '@/lib/actions/reports'
import { getHonorariosRate } from '@/lib/actions/settings'
import { formatCurrency, formatDate, formatDateShort } from '@/lib/utils'

// ── Boleta ─────────────────────────────────────────────────────────────────

export async function sendReceiptEmail(receiptId: string, overrideEmail?: string) {
  const supabase = await createClient()

  const { data: receipt } = await supabase
    .from('receipts')
    .select(`
      id, issued_at, total_amount, payment_method,
      clients ( full_name, email ),
      workers ( full_name ),
      receipt_services (
        price_charged,
        service_catalog ( name ),
        workers ( full_name )
      ),
      receipt_products (
        quantity, subtotal,
        product_catalog ( name )
      )
    `)
    .eq('id', receiptId)
    .single()

  if (!receipt) return { error: 'Boleta no encontrada' }

  const client = receipt.clients as { full_name: string; email: string | null } | null
  const recipientEmail = overrideEmail?.trim() || client?.email
  if (!recipientEmail) return { error: 'Sin email' }
  const recipientName  = client?.full_name ?? 'Cliente'

  // Si se ingresó un email manualmente, guardar el cliente y vincularlo a la boleta
  if (overrideEmail?.trim()) {
    const email = overrideEmail.trim()

    // Buscar cliente existente con ese email
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    let clientId: string | null = existing?.id ?? null

    // Si no existe, crear uno nuevo
    if (!clientId) {
      const localPart = email.split('@')[0]
      const name = localPart.charAt(0).toUpperCase() + localPart.slice(1)
      const { data: created } = await supabase
        .from('clients')
        .insert({ full_name: name, email })
        .select('id')
        .single()
      clientId = created?.id ?? null
    }

    // Vincular a la boleta si aún no tiene cliente
    if (clientId) {
      await supabase
        .from('receipts')
        .update({ client_id: clientId })
        .eq('id', receiptId)
        .is('client_id', null)

      revalidatePath('/dashboard/receipts')
      revalidatePath(`/dashboard/receipts/${receiptId}`)
    }
  }

  const PAYMENT: Record<string, string> = {
    cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Mixto',
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  const receiptUrl = `${appUrl}/r/${receiptId}`
  const qrDataUrl = await QRCode.toDataURL(receiptUrl, {
    width: 140,
    margin: 1,
    color: { dark: '#3D5151', light: '#ffffff' },
  })

  const issuedByWorker = (receipt.workers as { full_name: string } | null)?.full_name ?? null
  const services = (receipt.receipt_services ?? []) as Array<{
    price_charged: number
    service_catalog: { name: string } | null
    workers: { full_name: string } | null
  }>
  const products = (receipt.receipt_products ?? []) as Array<{
    quantity: number; subtotal: number; product_catalog: { name: string } | null
  }>

  const servicesRows = services.map((s) =>
    `<tr>
      <td style="padding:6px 0 2px;color:#3D5151;">${s.service_catalog?.name ?? 'Servicio'}</td>
      <td style="padding:6px 0 2px;text-align:right;font-weight:600;">${formatCurrency(s.price_charged)}</td>
    </tr>
    ${s.workers?.full_name ? `<tr>
      <td colspan="2" style="padding:0 0 6px;font-size:11px;color:#9ca3af;">→ ${s.workers.full_name}</td>
    </tr>` : ''}`
  ).join('')

  const productsRows = products.map((p) =>
    `<tr>
      <td style="padding:6px 0;color:#3D5151;">
        ${p.product_catalog?.name ?? 'Producto'}
        ${p.quantity > 1 ? `<span style="color:#9ca3af;"> ×${p.quantity}</span>` : ''}
      </td>
      <td style="padding:6px 0;text-align:right;font-weight:600;">${formatCurrency(p.subtotal)}</td>
    </tr>`
  ).join('')

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,serif;">
  <div style="max-width:420px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

    <div style="background:#3D5151;padding:32px 24px;text-align:center;">
      <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:-0.5px;color:#fff;">cafuné</p>
      <p style="margin:6px 0 0;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#A68776;">
        Espacio de cuidado personal
      </p>
    </div>

    <div style="padding:28px 24px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;border-bottom:1px dashed #e4e4e7;padding-bottom:16px;">
        <tr>
          <td style="color:#9ca3af;padding:4px 0;">Fecha</td>
          <td style="text-align:right;font-weight:500;">${formatDate(receipt.issued_at)}</td>
        </tr>
        <tr>
          <td style="color:#9ca3af;padding:4px 0;">N° boleta</td>
          <td style="text-align:right;font-family:monospace;font-size:11px;">${receiptId.slice(0, 8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="color:#9ca3af;padding:4px 0;">Forma de pago</td>
          <td style="text-align:right;font-weight:500;">${PAYMENT[receipt.payment_method] ?? receipt.payment_method}</td>
        </tr>
        ${issuedByWorker ? `<tr>
          <td style="color:#9ca3af;padding:4px 0;">Emitida por</td>
          <td style="text-align:right;font-weight:500;">${issuedByWorker}</td>
        </tr>` : ''}
      </table>

      ${servicesRows ? `
      <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#9ca3af;">Servicios</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">${servicesRows}</table>
      ` : ''}

      ${productsRows ? `
      <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#9ca3af;">Productos</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">${productsRows}</table>
      ` : ''}

      <div style="border-top:2px solid #f4f4f5;padding-top:16px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#3D5151;">Total</span>
        <span style="font-size:24px;font-weight:900;color:#A68776;">${formatCurrency(receipt.total_amount)}</span>
      </div>
    </div>

    <div style="padding:20px 24px;text-align:center;border-top:1px dashed #e4e4e7;">
      <img src="${qrDataUrl}" width="100" height="100" alt="QR boleta"
        style="display:block;margin:0 auto 8px;border-radius:8px;" />
      <p style="margin:0 0 16px;font-size:9px;font-family:monospace;letter-spacing:0.12em;color:#d4d4d8;text-transform:uppercase;">
        ${receiptId.slice(0, 8)}
      </p>
      <a href="${receiptUrl}"
        style="display:inline-block;background:#3D5151;color:#fff;text-decoration:none;font-family:Georgia,serif;font-size:12px;font-weight:700;letter-spacing:0.06em;padding:12px 24px;border-radius:12px;">
        ↓ Ver y descargar comprobante
      </a>
    </div>

    <div style="padding:14px 24px;text-align:center;border-top:1px dashed #e4e4e7;">
      <p style="margin:0;font-size:11px;color:#d4d4d8;">¡Hasta pronto! · cafuné · espacio de cuidado personal</p>
    </div>
  </div>
</body>
</html>`

  try {
    await brevo.transactionalEmails.sendTransacEmail({
      sender:      SENDER,
      to:          [{ email: recipientEmail, name: recipientName }],
      subject:     `Tu boleta de cafuné — ${formatDate(receipt.issued_at)}`,
      htmlContent: html,
    })
    return { ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al enviar email'
    return { error: msg }
  }
}

// ── Nómina ─────────────────────────────────────────────────────────────────

export async function sendPayrollEmail(workerId: string, from: string, to: string) {
  const fromISO = `${from}T00:00:00`
  const toISO   = `${to}T23:59:59`

  const [detail, honorariosRate] = await Promise.all([
    getWorkerPayrollDetail(workerId, fromISO, toISO),
    getHonorariosRate(),
  ])
  if (!detail)              return { error: 'Trabajadora no encontrada' }
  if (!detail.worker.email) return { error: 'La trabajadora no tiene email registrado' }

  const { worker } = detail
  const descuento = Math.round(detail.total_comisiones * honorariosRate) / 100
  const neto      = Math.round((detail.total_comisiones - descuento) * 100) / 100
  const fromLabel  = formatDateShort(fromISO)
  const toLabel    = formatDateShort(toISO)

  // Agrupar servicios por día
  const byDate = new Map<string, typeof detail.services>()
  for (const svc of detail.services) {
    const receipt = svc.receipts as { issued_at: string }
    const day = receipt.issued_at.slice(0, 10)
    if (!byDate.has(day)) byDate.set(day, [])
    byDate.get(day)!.push(svc)
  }
  const dates = [...byDate.keys()].sort()

  const serviceRows = dates.map((day) => {
    const svcs = byDate.get(day)!
    const dayLabel = formatDateShort(`${day}T00:00:00`)
    const rows = svcs.map((s) => {
      const commLabel = s.commission_type === 'percentage'
        ? `${s.commission_value}%`
        : formatCurrency(s.commission_value)
      return `
        <tr>
          <td style="padding:5px 0 5px 10px;color:#3D5151;font-size:13px;border-left:2px solid #e4e4e7;">
            ${(s.service_catalog as { name: string } | null)?.name ?? 'Servicio'}
            <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Comisión ${commLabel}</div>
          </td>
          <td style="padding:5px 0;text-align:right;font-weight:600;font-size:13px;vertical-align:top;">${formatCurrency(s.price_charged)}</td>
          <td style="padding:5px 0 5px 12px;text-align:right;color:#A68776;font-weight:600;font-size:13px;vertical-align:top;">${formatCurrency(s.commission_amt)}</td>
        </tr>`
    }).join('')
    return `
      <tr>
        <td colspan="3" style="padding:12px 0 4px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#d4d4d8;">
          ${dayLabel}
        </td>
      </tr>
      ${rows}`
  }).join('')

  const noServices = detail.n_servicios === 0

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,serif;">
  <div style="max-width:460px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

    <div style="background:#3D5151;padding:32px 24px;text-align:center;">
      <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:-0.5px;color:#fff;">cafuné</p>
      <p style="margin:6px 0 0;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#A68776;">
        Espacio de cuidado personal
      </p>
    </div>

    <div style="padding:24px 24px 0;text-align:center;border-bottom:1px dashed #e4e4e7;padding-bottom:20px;">
      <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#9ca3af;">Resumen de nómina</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
        <tr>
          <td style="color:#9ca3af;padding:3px 0;">Trabajadora</td>
          <td style="text-align:right;font-weight:600;">${worker.full_name}</td>
        </tr>
        <tr>
          <td style="color:#9ca3af;padding:3px 0;">Período</td>
          <td style="text-align:right;font-weight:500;">${fromLabel} – ${toLabel}</td>
        </tr>
        <tr>
          <td style="color:#9ca3af;padding:3px 0;">Servicios</td>
          <td style="text-align:right;font-weight:500;">${detail.n_servicios}</td>
        </tr>
      </table>
    </div>

    ${noServices ? `
    <div style="padding:32px 24px;text-align:center;">
      <p style="font-size:13px;color:#9ca3af;font-style:italic;">Sin servicios en este período.</p>
    </div>
    ` : `
    <div style="padding:20px 24px;border-bottom:1px dashed #e4e4e7;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#9ca3af;">Servicios realizados</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;font-size:10px;color:#d4d4d8;font-weight:600;padding-bottom:6px;">Servicio</th>
            <th style="text-align:right;font-size:10px;color:#d4d4d8;font-weight:600;padding-bottom:6px;">Precio</th>
            <th style="text-align:right;font-size:10px;color:#d4d4d8;font-weight:600;padding-bottom:6px;padding-left:12px;">Comisión</th>
          </tr>
        </thead>
        <tbody>${serviceRows}</tbody>
      </table>
    </div>
    `}

    <div style="padding:20px 24px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#9ca3af;">Liquidación</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:14px;">
        <tr>
          <td style="color:#9ca3af;padding:3px 0;">Comisión bruta</td>
          <td style="text-align:right;font-weight:500;">${formatCurrency(detail.total_comisiones)}</td>
        </tr>
        <tr>
          <td style="color:#9ca3af;padding:3px 0;">Desc. honorarios (${honorariosRate}%)</td>
          <td style="text-align:right;font-weight:500;color:#9ca3af;">− ${formatCurrency(descuento)}</td>
        </tr>
      </table>
      <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px dashed #e4e4e7;padding-top:14px;">
        <span style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#3D5151;">Neto a recibir</span>
        <span style="font-size:26px;font-weight:900;color:#A68776;">${formatCurrency(neto)}</span>
      </div>
    </div>

    <div style="padding:16px 24px;text-align:center;border-top:1px dashed #e4e4e7;">
      <p style="margin:0;font-size:11px;color:#d4d4d8;">cafuné · espacio de cuidado personal</p>
    </div>
  </div>
</body>
</html>`

  try {
    await brevo.transactionalEmails.sendTransacEmail({
      sender:      SENDER,
      to:          [{ email: worker.email!, name: worker.full_name }],
      subject:     `Tu nómina cafuné — ${fromLabel} al ${toLabel}`,
      htmlContent: html,
    })
    return { ok: true }
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Error al enviar email'
    return { error: errMsg }
  }
}
