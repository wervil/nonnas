'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useEffect, useState } from 'react'

type Props = {
  src: string // e.g. "/lottie/earth-lottie.json" (even if extension is wrong)
  size?: number
  className?: string
  loop?: boolean
  autoplay?: boolean
}

export default function DotLottieGlobe({
  src,
  size = 30,
  className = '',
  loop = true,
  autoplay = true,
}: Props) {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  return (
    <div
      className={className}
      style={{ width: size, height: size, display: 'block' }}
      aria-hidden="true"
    >
      <DotLottieReact
        src={src}
        loop={loop && !reduceMotion}
        autoplay={autoplay && !reduceMotion}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}
