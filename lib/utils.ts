export function formatCurrency(amount: number): string {
  return `$${new Intl.NumberFormat('es-CL').format(Math.round(amount))}`
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString))
}

export function formatDateShort(dateString: string): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short' }).format(
    new Date(dateString)
  )
}

export function todayRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { from: start.toISOString(), to: end.toISOString() }
}

export function calcCommissionAmt(
  priceCharged:    number,
  commissionType:  'percentage' | 'fixed',
  commissionValue: number
): number {
  if (commissionType === 'fixed') return commissionValue
  return Math.round(priceCharged * commissionValue / 100 * 100) / 100
}

// ─── RUT chileno ─────────────────────────────────────────────────────────────

export function validateRutCL(rut: string): boolean {
  if (!rut) return false
  const clean = rut.replace(/\./g, '').trim().toUpperCase()
  if (!/^\d{7,8}-[\dK]$/.test(clean)) return false
  const [numStr, dv] = clean.split('-')
  let n   = parseInt(numStr, 10)
  let sum = 0
  let m   = 2
  while (n > 0) {
    sum += (n % 10) * m
    n    = Math.floor(n / 10)
    m    = m === 7 ? 2 : m + 1
  }
  const rem      = 11 - (sum % 11)
  const expected = rem === 11 ? '0' : rem === 10 ? 'K' : String(rem)
  return dv === expected
}

export function formatRutCL(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length === 0) return ''
  const dv  = clean.slice(-1)
  const num = clean.slice(0, -1)
  if (num.length === 0) return dv
  const formatted = num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

// ─── Hair length ──────────────────────────────────────────────────────────────

type VariantWithHairLength = {
  id:              string
  is_active:       boolean
  sort_order:      number
  hair_length_min: number | null
  hair_length_max: number | null
}

export function suggestVariantByHairLength<T extends VariantWithHairLength>(
  variants: T[],
  hairLengthCm: number
): T | null {
  const withRange = variants
    .filter(v => v.is_active && (v.hair_length_min !== null || v.hair_length_max !== null))
    .sort((a, b) => a.sort_order - b.sort_order)
  if (withRange.length === 0) return null
  return withRange.find(v => {
    const aboveMin = v.hair_length_min === null || hairLengthCm >= v.hair_length_min
    const belowMax = v.hair_length_max === null || hairLengthCm <= v.hair_length_max
    return aboveMin && belowMax
  }) ?? null
}

export function monthRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: start.toISOString().split('T')[0],
    to:   end.toISOString().split('T')[0],
  }
}
