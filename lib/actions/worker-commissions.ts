'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CommissionType } from '@/lib/supabase/types'

// ─── Mapa global para el POS: { workerId → { serviceId → {type, value} } } ───

export async function getWorkerCommissionMap(): Promise<
  Record<string, Record<string, { type: CommissionType; value: number }>>
> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('commission_rules')
    .select('worker_id, service_id, commission_type, commission_value')
    .not('worker_id', 'is', null)
    .is('valid_until', null)

  const map: Record<string, Record<string, { type: CommissionType; value: number }>> = {}
  for (const r of data ?? []) {
    if (!r.worker_id) continue
    if (!map[r.worker_id]) map[r.worker_id] = {}
    // Si hay duplicados, el más reciente gana (la consulta no está ordenada, así que usamos el último)
    map[r.worker_id][r.service_id] = {
      type:  r.commission_type as CommissionType,
      value: r.commission_value,
    }
  }
  return map
}

// ─── Leer comisiones efectivas de una trabajadora ────────────────────────────

export async function getWorkerCommissions(workerId: string) {
  const supabase = await createClient()

  const [servicesResult, rulesResult] = await Promise.all([
    supabase
      .from('service_catalog')
      .select('id, name, commission_type, commission_value')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('commission_rules')
      .select('service_id, commission_type, commission_value')
      .eq('worker_id', workerId)
      .is('valid_until', null),
  ])

  const ruleMap = new Map<string, { type: CommissionType; value: number }>()
  for (const r of rulesResult.data ?? []) {
    ruleMap.set(r.service_id, {
      type:  r.commission_type as CommissionType,
      value: r.commission_value,
    })
  }

  return (servicesResult.data ?? []).map(svc => ({
    service_id:      svc.id,
    service_name:    svc.name,
    default_type:    svc.commission_type as CommissionType,
    default_value:   svc.commission_value,
    override_type:   ruleMap.get(svc.id)?.type  ?? null,
    override_value:  ruleMap.get(svc.id)?.value ?? null,
    has_override:    ruleMap.has(svc.id),
  }))
}

// ─── Establecer override de comisión para una trabajadora ────────────────────

export async function upsertWorkerCommission(
  workerId:        string,
  serviceId:       string,
  commissionType:  CommissionType,
  commissionValue: number,
) {
  if (commissionValue < 0) return { error: 'Valor inválido' }
  if (commissionType === 'percentage' && commissionValue > 100)
    return { error: 'El porcentaje no puede superar 100' }

  const supabase = await createClient()

  // Eliminar TODAS las reglas anteriores para este par (evita conflicto UNIQUE con valid_from)
  await supabase
    .from('commission_rules')
    .delete()
    .eq('worker_id', workerId)
    .eq('service_id', serviceId)

  const { error } = await supabase
    .from('commission_rules')
    .insert({
      worker_id:        workerId,
      service_id:       serviceId,
      commission_type:  commissionType,
      commission_value: commissionValue,
      valid_until:      null,
    })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/workers/${workerId}`)
  return { ok: true }
}

// ─── Eliminar override (vuelve al default del servicio) ──────────────────────

export async function removeWorkerCommission(workerId: string, serviceId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('commission_rules')
    .delete()
    .eq('worker_id', workerId)
    .eq('service_id', serviceId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/workers/${workerId}`)
  return { ok: true }
}
