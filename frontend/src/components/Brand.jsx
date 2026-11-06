// Shared brand mark for "LearnLoop", styled with a modern cyan/blue gradient loop
// icon inspired by modern educational platforms.

const SIZES = {
  sm: 'text-sm gap-1.5',
  md: 'text-lg gap-2',
  lg: 'text-2xl gap-2.5',
}

const ICON_SIZES = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-8 h-8',
}

export function Brand({ size = 'md', className = '' }) {
  return (
    <span
      className={`group inline-flex items-center font-display font-semibold tracking-tight text-slate-800 transition-colors ${SIZES[size]} ${className}`}
    >
      <span className={`inline-flex items-center justify-center shrink-0 ${ICON_SIZES[size]}`}>
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
          <path
            d="M18 4C10.268 4 4 10.268 4 18C4 22.15 5.807 25.88 8.686 28.44C9.28 28.97 10.18 28.84 10.62 28.21C11.02 27.64 10.87 26.85 10.33 26.41C7.94 24.46 6.4 21.41 6.4 18C6.4 11.6 11.6 6.4 18 6.4C24.4 6.4 29.6 11.6 29.6 18C29.6 21.36 28.16 24.34 25.88 26.34C25.35 26.8 25.23 27.6 25.66 28.15C26.13 28.75 27.02 28.85 27.59 28.32C30.29 25.79 32 22.1 32 18C32 10.268 25.732 4 18 4Z"
            fill="url(#loop-grad-1)"
          />
          <path
            d="M18 10C13.58 10 10 13.58 10 18C10 20.35 11.02 22.46 12.65 23.9C13.2 24.38 14.04 24.28 14.47 23.7C14.86 23.18 14.73 22.44 14.25 22.01C13.06 20.95 12.3 19.41 12.3 18C12.3 14.85 14.85 12.3 18 12.3C21.15 12.3 23.7 14.85 23.7 18C23.7 19.42 22.92 20.98 21.72 22.04C21.24 22.46 21.12 23.21 21.52 23.73C21.96 24.3 22.8 24.39 23.35 23.9C24.97 22.45 26 20.34 26 18C26 13.58 22.42 10 18 10Z"
            fill="url(#loop-grad-2)"
          />
          <circle cx="18" cy="18" r="3.2" fill="url(#loop-grad-3)" />
          <defs>
            <linearGradient id="loop-grad-1" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06B6D4" />
              <stop offset="1" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="loop-grad-2" x1="10" y1="10" x2="26" y2="26" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="1" stopColor="#6366F1" />
            </linearGradient>
            <linearGradient id="loop-grad-3" x1="15" y1="15" x2="21" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06B6D4" />
              <stop offset="1" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      <span>
        Learn<span className="text-blue-600 transition-colors group-hover:text-blue-700">Loop</span>
      </span>
    </span>
  )
}
