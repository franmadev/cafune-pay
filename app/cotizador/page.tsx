import type { Metadata } from 'next'
import { CotizadorClient } from './cotizador-client'

export const metadata: Metadata = {
  title: 'Cotizador | Cafuné — Precio estimado de servicios',
  description:
    'Consulta un precio referencial para tu servicio según el largo de tu cabello. Balayage, color global, botox capilar y alisado. Valor aproximado, diagnóstico final en salón.',
}

export default function CotizadorPage() {
  return <CotizadorClient />
}
