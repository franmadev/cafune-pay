interface Props {
  className?: string
  /** Which variant to render */
  variant?: 'full' | 'small' | 'young'
}

/**
 * Decorative Monstera deliciosa (swiss cheese plant) leaf SVG.
 * Use as background/ambient decoration — not interactive.
 */
export function MonsteraLeaf({ className, variant = 'full' }: Props) {
  if (variant === 'young') {
    // Heart-shaped young leaf without fenestrations
    return (
      <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
        <path
          d="M40 6C52 2 68 12 73 28C78 44 72 64 58 76C48 86 30 88 18 80C6 72 1 56 4 40C8 24 20 8 40 6Z"
          fill="currentColor"
        />
        {/* Center vein */}
        <path d="M40 8C39 40 37 72 36 84" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
        {/* Side veins */}
        <path d="M39 28C34 36 22 40 14 38" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />
        <path d="M39 28C44 36 56 40 64 38" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />
        <path d="M38 50C32 58 20 60 12 58" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />
        <path d="M38 50C44 58 56 60 64 58" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />
        {/* Stem */}
        <path d="M37 86C36 94 32 100 28 108" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  if (variant === 'small') {
    return (
      <svg viewBox="0 0 90 110" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
        {/* Main leaf */}
        <path
          d="M45 6C58 2 74 14 79 30C84 46 78 68 64 80C52 90 34 92 20 84C6 76 1 58 5 40C10 22 26 8 45 6Z"
          fill="currentColor"
        />
        {/* Left notch */}
        <path d="M22 36C14 32 8 40 10 50C18 44 26 46 28 38Z" fill="white" />
        {/* Right notch */}
        <path d="M66 34C74 30 80 38 78 48C70 42 62 44 60 36Z" fill="white" />
        {/* Left lower notch */}
        <path d="M16 62C8 62 6 72 10 80C18 72 24 72 24 64Z" fill="white" />
        {/* Right lower notch */}
        <path d="M72 60C80 60 82 70 78 78C70 70 64 70 64 62Z" fill="white" />
        {/* Center vein */}
        <path d="M45 8C44 42 42 74 40 86" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
        {/* Stem */}
        <path d="M41 88C40 96 36 104 32 112" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  // Full adult monstera leaf
  return (
    <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Main leaf body */}
      <path
        d="M60 8C78 2 100 16 108 38C116 60 108 90 88 106C72 120 50 124 30 114C10 104 2 80 6 56C10 32 28 10 60 8Z"
        fill="currentColor"
      />

      {/* Upper-left fenestration */}
      <path d="M28 40C18 35 10 45 13 58C22 50 32 53 34 44Z" fill="white" />
      {/* Upper-right fenestration */}
      <path d="M90 37C100 32 108 42 105 55C96 47 86 50 84 41Z" fill="white" />
      {/* Mid-left fenestration */}
      <path d="M18 68C8 66 6 78 12 88C20 78 28 78 28 68Z" fill="white" />
      {/* Mid-right fenestration */}
      <path d="M100 65C110 63 112 75 106 85C98 75 90 75 90 65Z" fill="white" />
      {/* Lower-left fenestration */}
      <path d="M22 96C12 96 10 108 17 116C24 106 32 106 30 97Z" fill="white" />
      {/* Lower-right fenestration */}
      <path d="M95 92C105 92 107 104 100 112C93 102 85 102 85 93Z" fill="white" />

      {/* Center (midrib) vein */}
      <path d="M60 10C58 55 55 96 53 112" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Side veins */}
      <path d="M58 32C50 44 36 50 22 46" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.2" />
      <path d="M59 32C67 44 82 50 96 46" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.2" />
      <path d="M56 60C46 70 30 74 16 70" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.2" />
      <path d="M57 60C67 70 82 74 96 70" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.2" />
      <path d="M54 88C44 98 30 100 18 96" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.2" />
      <path d="M55 88C65 98 80 100 92 96" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.2" />

      {/* Petiole (stem) */}
      <path d="M53 114C52 124 46 136 40 148" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
