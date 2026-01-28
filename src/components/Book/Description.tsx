import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import { usePathname } from "next/navigation"
import { useState } from 'react'
import Button from '../ui/Button'
import { Modal } from '../ui/modal'

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

  const handleModal = () => {
    setIsOpen(!isOpen)
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
        onClick={handleModal}
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


      <Modal
        title='Recipe'
        isOpen={isOpen}
        onClose={handleModal}
        style={{
          backgroundImage: popupImageUrl
            ? `url(${popupImageUrl})`
            : "url('/bg-6.webp')",
        }}
        className='!m-0 p-0 gap-0   '

      >
        <div
          className=" "

        >
          <h4
            className={`text-federant text-brown-light pt-5 text-center text-m xl:text-xl`}
          >
            {title}
          </h4>
          <div
            className="text-description pb-5 px-3"
            dangerouslySetInnerHTML={{ __html: text }}
          />

          <div className="corner corner--small lt" />
          <div className="corner corner--small rt" />
          <div className="corner corner--small lb" />
          <div className="corner corner--small rb" />
        </div>

      </Modal>
    </>
  )
}
