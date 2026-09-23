import { motion, AnimatePresence } from 'framer-motion'

export function Modal({ open, onClose, title, children, footer, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.15 }}
            className={`relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-md bg-surface p-6 shadow-lg ${wide ? 'max-w-2xl' : 'max-w-md'}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost px-2 py-1">
                ✕
              </button>
            </div>
            {children}
            {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
