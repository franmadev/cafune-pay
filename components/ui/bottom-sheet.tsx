'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open:     boolean
  onClose:  () => void
  title?:   string
  children: React.ReactNode
  /** Extra height cap, defaults to 85vh */
  maxHeight?: string
}

export function BottomSheet({ open, onClose, title, children, maxHeight = '85vh' }: Props) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-[2px]"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }}
            style={{ maxHeight }}
            className="fixed bottom-0 inset-x-0 bg-white rounded-t-[28px] z-50 flex flex-col shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-300" />
            </div>

            {/* Title */}
            {title && (
              <div className="px-5 pt-2 pb-3 flex-shrink-0">
                <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
