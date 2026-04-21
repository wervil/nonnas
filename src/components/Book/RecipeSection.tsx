import clsx from 'clsx'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Navigation, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import Button from '../ui/Button'

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
  const [blockClose, setBlockClose] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const b = useTranslations('buttons')
  const isVideoUrl = (url: string) => /\.(mp4|webm|mov|m4v|ogg)$/i.test(url.split('?')[0])
  const hasVideo = Boolean(images?.some((image) => isVideoUrl(image)))

  const openModal = () => {
    document.body.style.overflow = 'hidden'
    setIsOpen(true)
  }

  const closeModal = () => {
    if (document.fullscreenElement) return
    document.body.style.overflow = 'auto'
    setIsOpen(false)
  }

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasVideo) return
    const target = e.target as HTMLElement
    if (
      target.closest('video')
      || target.closest('.swiper-button-next')
      || target.closest('.swiper-button-prev')
      || target.closest('.swiper-pagination')
      || target.closest('.swiper-pagination-bullet')
    ) {
      return
    }
    openModal()
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setBlockClose(true)
      } else {
        // small delay prevents instant close on exit
        setTimeout(() => setBlockClose(false), 300)
      }
    }
  
    document.addEventListener('fullscreenchange', handleFullscreenChange)
  
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return (
    <>
      <div
        className={`relative description-wrap cursor-pointer ${hasVideo ? 'min-h-[49%] h-auto' : 'h-[49%]'}`}
        style={hasVideo ? { overflow: 'visible', flex: 'unset' } : undefined}
        // style={{
        //   height: getHeight(
        //     hasInfluences,
        //     contentHeight,
        //     window.innerWidth < 768
        //   ),
        // }}
        onClick={hasVideo ? undefined : handleCardClick}
        onMouseEnter={() => {
          if (!hasVideo) setShowButton(true)
        }}
        onMouseLeave={() => {
          if (!hasVideo) setShowButton(false)
        }}
      >
        <div className={`relative text-left ${hasVideo ? 'overflow-visible' : 'overflow-hidden'}`}>
          {!hasVideo && (
            <h4
              className={`text-federant text-brown-light text-center text-m xl:text-xl`}
            >
              {title}
            </h4>
          )}
          {images?.length && hasVideo ? (
            <div className="relative w-full h-[170px] md:h-[220px] mx-auto mb-3 mt-2 overflow-hidden rounded-lg">
              <Swiper
                modules={[Navigation, Pagination]}
                navigation
                pagination={{ clickable: true }}
                loop={images?.length > 1}
                className="w-full h-full rounded-lg [--swiper-navigation-size:20px] md:[--swiper-navigation-size:30px]"
                style={
                  {
                    '--swiper-navigation-sides-offset': '0px',
                  } as React.CSSProperties
                }
              >
                {images?.map((image, index) => (
                  <SwiperSlide key={index}>
                    <video
                      src={image}
                      controls
                      controlsList="nofullscreen"
                      disablePictureInPicture
                      preload="metadata"
                      className="w-full h-full object-cover"
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          ) : null}
          {images?.length && !hasVideo ? (
            <div className="relative w-[140px] max-w-[85vw] h-[100px] mx-auto mb-3 mt-2 lg:float-right xl:ml-4 xl:mr-0 xl:mb-2 xl:w-[170px] xl:h-[120px] xl:max-w-none xl:mx-0 2xl:w-[220px] 2xl:h-[200px] ">
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
          {hasVideo && (
            <h4
              className={`text-federant text-brown-light text-center text-m xl:text-xl mt-2`}
            >
              {title}
            </h4>
          )}


          <div className={`min-w-0 break-words !text-[12px] xl:!text-[16px] ${hasVideo ? 'text-center' : ''}`}>
            <div
              className={clsx(
                'text-description text-description--long !text-[12px] xl:!text-[16px]',
                showButton ? 'opacity-30' : 'opacity-100'
              )}
              style={{ overflow: 'visible' }}
              dangerouslySetInnerHTML={{ __html: ingredientsText }}
            />
            <div
              className={clsx(
                'text-description text-description--long mt-2 !text-[12px] xl:!text-[16px]',
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
          variant="primary"
          size="shrink"
          onClick={(e) => {
            e.stopPropagation()
            openModal()
          }}
          className={clsx(
            'absolute bottom-4 right-4 z-20 text-[#6D2924] font-semibold rounded-lg px-3 py-1.5 text-xs hover:bg-[#FFB5B0] transition-colors',
            hasVideo ? 'opacity-100' : (showButton ? 'opacity-100' : 'opacity-0')
          )}
        >
          {b('seeMore')}
        </Button>
      </div>
      {isOpen
        ? createPortal(
          <div
          onClick={() => {
            if (blockClose) return
            closeModal()
          }}
          className={`fixed mx-auto inset-0 z-1000 flex items-start md:items-center justify-center bg-[rgba(0,0,0,0.8)] p-4 ${
            hasVideo ? 'overflow-hidden' : 'overflow-y-auto'
          }`}>
            <button
              onClick={closeModal}
              className="fixed  top-4 right-12  text-white text-3xl font-bold z-1050"
            >
              <X size={30} />
            </button>
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}            
              className="relative description-wrap description-wrap--vertical w-[70vw]! h-[90vh] max-w-[85vw]! max-h-[1000px] min-w-[300px] min-h-[200px] my-4">
              <div className={`relative ${hasVideo ? '' : 'overflow-y-auto max-h-[calc(100vh-5rem)]'}`}>
                {images?.length && hasVideo ? (
                  <div className="relative w-full h-[260px] md:h-[340px] mx-auto mb-4 mt-2">
                    <Swiper
                      modules={[Navigation, Pagination]}
                      navigation
                      pagination={{ clickable: true }}
                      loop={images?.length > 1}
                      className="w-full h-full rounded-lg [--swiper-navigation-size:20px] md:[--swiper-navigation-size:30px]"
                      style={
                        {
                          '--swiper-navigation-sides-offset': '0px',
                        } as React.CSSProperties
                      }
                    >
                      {images?.map((image, index) => (
                        <SwiperSlide key={index}>
                          <video
                            src={image}
                            controls
                            preload="metadata"
                            className="w-full h-full object-cover"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                          />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </div>
                ) : null}
                {images?.length && !hasVideo ? (
                  <div className="relative w-[140px] max-w-[85vw] h-[100px] mx-auto mb-3 mt-2 xl:float-right xl:ml-4 xl:mr-0 xl:mb-2 xl:w-[170px] xl:h-[120px] lg:w-[250px] lg:h-[220px] xl:max-w-none xl:mx-0">
                    <Swiper
                      modules={[Navigation, Pagination]}
                      navigation
                      pagination={{ clickable: true }}
                      loop={images?.length > 1}
                      className="w-full h-full rounded-lg  [--swiper-navigation-size:20px] md:[--swiper-navigation-size:30px]"
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
                  className={`text-federant text-brown-light text-center text-m xl:text-xl ${hasVideo ? 'mt-1' : ''}`}
                >
                  {title}
                </h4>
                <div className={`min-w-0 break-words ${hasVideo ? 'text-center' : ''}`}>
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
