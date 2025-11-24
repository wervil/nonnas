import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Dispatch, SetStateAction, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Button from '../ui/Button'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'

interface Props {
  title: string
  images: string[] | null
  ingredientsText: string
  directionsText: string
  hasInfluences: boolean
  contentHeight: number
  setImages: Dispatch<SetStateAction<string[] | null>>
}

const TEXT_LINE_HEIGHT = 22.4

const getHeight = (
  hasInfluences: boolean,
  contentHeight: number,
  isMobile: boolean
) => {
  const height = contentHeight - 60 - (hasInfluences ? (isMobile ? 30 : 20) : 0)
  const baseHeight = hasInfluences ? height / 2 : height * 0.65
  const contHeight = Math.floor((baseHeight - 28 - 24 - 8) / TEXT_LINE_HEIGHT)
  return contHeight * TEXT_LINE_HEIGHT + 28 + 24
}

export const RecipeSection = ({
  title,
  images,
  ingredientsText,
  directionsText,
  hasInfluences,
  contentHeight,
  setImages,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const b = useTranslations('buttons')

  const openModal = () => {
    document.body.style.overflow = 'hidden'
    setIsOpen(true)
  }

  const closeModal = () => {
    document.body.style.overflow = 'auto'
    setIsOpen(false)
  }

  return (
    <>
      <div
        className="relative description-wrap cursor-pointer"
        style={{
          height: getHeight(
            hasInfluences,
            contentHeight,
            window.innerWidth < 768
          ),
        }}
        onClick={openModal}
        onMouseEnter={() => setShowButton(true)}
        onMouseLeave={() => setShowButton(false)}
      >
        <div className="relative overflow-hidden">
          {images?.length ? (
            <div className="relative w-[170px] h-[120px] min-w-[170px] min-h-[120px] 2xl:w-[320px] 2xl:h-[220px] mt-2 float-right ml-4 mb-2">
              <Swiper
                modules={[Navigation, Pagination]}
                navigation
                pagination={{ clickable: true }}
                loop={images?.length > 1}
                className="w-full h-full rounded-lg cursor-pointer"
                style={
                  {
                    '--swiper-navigation-sides-offset': '0px',
                  } as React.CSSProperties
                }
              >
                {images?.map((image, index) => (
                  <SwiperSlide key={index}>
                    <Image
                      src={image}
                      alt={`${title} - photo ${index + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="object-cover"
                      onClick={(e) => {
                        e.stopPropagation()
                        setImages(images)
                      }}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          ) : null}
          <h4
            className={`text-federant text-brown-light text-center text-m xl:text-xl`}
          >
            {title}
          </h4>
          <div
            className={clsx(
              'text-description text-description--long',
              showButton ? 'opacity-30' : 'opacity-100'
            )}
            style={{ overflow: 'visible' }}
            dangerouslySetInnerHTML={{ __html: ingredientsText }}
          />
          <div
            className={clsx(
              'text-description text-description--long mt-2',
              showButton ? 'opacity-30' : 'opacity-100'
            )}
            style={{ overflow: 'visible' }}
            dangerouslySetInnerHTML={{ __html: directionsText }}
          />
        </div>

        <div className="corner corner--big lt" />
        <div className="corner corner--big rt" />
        <div className="corner corner--big lb" />
        <div className="corner corner--big rb" />
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
                className="absolute cursor-pointer top-8 right-[12vw] text-white text-3xl font-bold z-1050"
              >
                <X size={30} />
              </button>
              <div className="relative description-wrap description-wrap--vertical cursor-pointer w-[70vw]! h-[90vh] max-w-[1400px]! max-h-[1000px] min-w-[300px] min-h-[200px]">
                <div className="relative overflow-auto">
                  {images?.length ? (
                    <div className="relative w-[170px] h-[120px] min-w-[170px] min-h-[120px] lg:w-[320px] lg:h-[220px] mt-2 float-right ml-4 mb-2">
                      <Swiper
                        modules={[Navigation, Pagination]}
                        navigation
                        pagination={{ clickable: true }}
                        loop={images?.length > 1}
                        className="w-full h-full rounded-lg cursor-pointer"
                        style={
                          {
                            '--swiper-navigation-sides-offset': '0px',
                          } as React.CSSProperties
                        }
                      >
                        {images?.map((image, index) => (
                          <SwiperSlide key={index}>
                            <Image
                              src={image}
                              alt={`${title} - photo ${index + 1}`}
                              fill
                              style={{ objectFit: 'cover' }}
                              className="object-cover"
                            />
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                  ) : null}
                  <h4
                    className={`text-federant text-brown-light text-center text-m xl:text-xl`}
                  >
                    {title}
                  </h4>
                  <div
                    className="text-description text-description--long"
                    style={{ overflow: 'visible' }}
                    dangerouslySetInnerHTML={{ __html: ingredientsText }}
                  />
                  <div
                    className="text-description text-description--long mt-2"
                    style={{ overflow: 'visible' }}
                    dangerouslySetInnerHTML={{ __html: directionsText }}
                  />
                </div>

                <div className="corner corner--big lt" />
                <div className="corner corner--big rt" />
                <div className="corner corner--big lb" />
                <div className="corner corner--big rb" />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
