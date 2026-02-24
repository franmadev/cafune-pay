'use client'

import { useFormStatus } from 'react-dom'
import { motion } from 'framer-motion'
import { Spinner } from './spinner'

interface Props {
  children:     React.ReactNode
  className?:   string
  pendingText?: string
  pendingIcon?: React.ReactNode
}

/**
 * Drop-in replacement for <button type="submit"> inside Server Component forms.
 * Shows instant whileTap feedback + spinner while the server action runs.
 */
export function SubmitButton({ children, className, pendingText, pendingIcon }: Props) {
  const { pending } = useFormStatus()

  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 600, damping: 28 }}
      className={className}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          {pendingIcon ?? <Spinner size={18} />}
          {pendingText ?? children}
        </span>
      ) : children}
    </motion.button>
  )
}
