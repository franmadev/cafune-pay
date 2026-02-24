'use client'

import { motion } from 'framer-motion'

interface Props {
  message:   string
  className?: string
  children:  React.ReactNode
}

/**
 * A <button type="submit"> that shows a native confirm() dialog before submitting.
 * Use inside a Server Component form — the event handler lives here in the client.
 */
export function ConfirmSubmitButton({ message, className, children }: Props) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!confirm(message)) e.preventDefault()
  }

  return (
    <motion.button
      type="submit"
      onClick={handleClick}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 600, damping: 28 }}
      className={className}
    >
      {children}
    </motion.button>
  )
}
