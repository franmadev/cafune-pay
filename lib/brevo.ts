import { BrevoClient } from '@getbrevo/brevo'

export const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! })

export const SENDER = {
  name:  'cafuné',
  email: 'fnmarambio@gmail.com'
}
