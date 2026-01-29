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
  setImages: Dispatch<SetStateAction<string[] | null>>
}

export const RecipeSection = ({
  title,
  images,
  ingredientsText,
  directionsText,
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
        className="relative description-wrap cursor-pointer h-[49%]"
        // style={{
        //   height: getHeight(
        //     hasInfluences,
        //     contentHeight,
        //     window.innerWidth < 768
        //   ),
        // }}
        onClick={openModal}
        onMouseEnter={() => setShowButton(true)}
        onMouseLeave={() => setShowButton(false)}
      >
        <div className="relative overflow-hidden text-left">
          <h4
            className={`text-federant text-brown-light text-center text-m xl:text-xl`}
          >
            {title}
          </h4>
          {images?.length ? (
            <div className="relative w-[140px] max-w-[85vw] h-[100px] mx-auto mb-3 mt-2 lg:float-right xl:ml-4 xl:mr-0 xl:mb-2 xl:w-[170px] xl:h-[120px] xl:max-w-none xl:mx-0 2xl:w-[220px] 2xl:h-[200px]">
              <Swiper
                modules={[Navigation, Pagination]}
                navigation
                pagination={{ clickable: true }}
                loop={images?.length > 1}
                className="w-full h-full rounded-lg cursor-pointer [--swiper-navigation-size:20px] md:[--swiper-navigation-size:30px]"
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


          <div className="min-w-0 break-words">
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
          <div
            onClick={closeModal}
            className="fixed inset-0 z-1000 flex items-center justify-center bg-[rgba(0,0,0,0.8)]">
            <button
              onClick={closeModal}
              className="fixed cursor-pointer top-4 right-12  text-white text-3xl font-bold z-1050"
            >
              <X size={30} />
            </button>
            <div
              onClick={(e) => {
                e.stopPropagation()
              }}
              className="relative description-wrap description-wrap--vertical cursor-pointer w-[70vw]! h-[90vh] max-w-[1400px]! max-h-[1000px] min-w-[300px] min-h-[200px]">
              <div className="relative overflow-auto">
                {images?.length ? (
                  <div className="relative w-[140px] max-w-[85vw] h-[100px] mx-auto mb-3 mt-2 xl:float-right xl:ml-4 xl:mr-0 xl:mb-2 xl:w-[170px] xl:h-[120px] lg:w-[250px] lg:h-[220px] xl:max-w-none xl:mx-0">
                    <Swiper
                      modules={[Navigation, Pagination]}
                      navigation
                      pagination={{ clickable: true }}
                      loop={images?.length > 1}
                      className="w-full h-full rounded-lg cursor-pointer [--swiper-navigation-size:20px] md:[--swiper-navigation-size:30px]"
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
                <div className="min-w-0 break-words">
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
