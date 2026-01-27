import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../ui/Button'
import clsx from 'clsx'
import { usePathname } from "next/navigation";

interface Props {
  title: string
  text: string
  height: number
  imageUrl?: string
  popupImageUrl?: string
  maxWidth?: string
  type?: 'intro' | 'normal'
}

const getLineClamp = (height: number) => Math.floor(height / 26) - (window.innerWidth < 1536 ? 1 : 3)

export const Description = ({
  title,
  text,
  imageUrl,
  popupImageUrl,
  maxWidth,
  height,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const b = useTranslations('buttons')


const pathname = usePathname();

  const openModal = () => {
    document.body.style.overflow = 'hidden'
    setIsOpen(true)
  }

  const closeModal = () => {
    document.body.style.overflow = 'auto'
    setIsOpen(false)
    setShowButton(false)
  }

  return (
    <>
      <div
        className={`description-wrap  h-[40%] sm:h-[50%] ${(pathname === ('/') ? 'cursor-pointer' : '')}`}
        style={{
          backgroundImage: imageUrl
            ? `url(${imageUrl})`
            : "url('/bg-6.webp')",
          maxWidth: maxWidth || '100%',
          // height: `${height}px`,
        }}
        onClick={openModal}
        onMouseEnter={() => setShowButton(true)}
        onMouseLeave={() => setShowButton(false)}
      >
        <h4
          className={`text-federant text-brown-light text-center text-m xl:text-xl`}
        >
          {title}
        </h4>
        <div
          className={clsx(
            'text-description line-clamp',
            showButton ? 'opacity-30' : 'opacity-100'
            
          )}
          style={{
            WebkitLineClamp: getLineClamp(height),
          }}
          dangerouslySetInnerHTML={{ __html: text }}
        />
        <div className="corner corner--small lt" />
        <div className="corner corner--small rt" />
        <div className="corner corner--small lb" />
        <div className="corner corner--small rb" />

        <Button
          size="shrink"
          className={clsx(
            'absolute bottom-4 right-4 z-20 text-blue-700',
            showButton ? 'opacity-100' : 'opacity-0'
          )}
        >
          {b('seeMore')}
        </Button>
      </div>
      {isOpen
        ? createPortal(
            <div className="fixed inset-0 z-1000 flex items-center justify-center bg-[rgba(0,0,0,0.8)]">
              <button
                onClick={closeModal}
                className={"absolute  top-8 right-[12vw] text-white text-3xl font-bold z-1050 "}
              >
                <X size={30} />
              </button>

              <div
                className="description-wrap w-[70vw]! h-[90vh] max-w-[1400px]! max-h-[1000px] min-w-[300px] min-h-[200px]"
                style={{
                  backgroundImage: popupImageUrl
                    ? `url(${popupImageUrl})`
                    : "url('/bg-6.webp')",
                }}
              >
                <h4
                  className={`text-federant text-brown-light text-center text-m xl:text-xl`}
                >
                  {title}
                </h4>
                <div
                  className="text-description"
                  dangerouslySetInnerHTML={{ __html: text }}
                />
                <div className="corner corner--small lt" />
                <div className="corner corner--small rt" />
                <div className="corner corner--small lb" />
                <div className="corner corner--small rb" />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
