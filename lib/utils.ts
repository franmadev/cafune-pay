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

export function monthRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: start.toISOString().split('T')[0],
    to:   end.toISOString().split('T')[0],
  }
}
