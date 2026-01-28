import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Dispatch, SetStateAction, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, XIcon } from 'lucide-react'
import Button from '../ui/Button'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'
import { Modal } from '../ui/modal'

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
          {images?.length ? (
            // <div className="relative w-[170px] h-[120px] min-w-[170px] min-h-[120px] 2xl:w-[320px] 2xl:h-[220px] mt-2 float-right ml-4 mb-2">


            <div className="relative w-[170px] h-[120px] min-w-[170px] min-h-[120px] 2xl:w-[320px] 2xl:h-[220px] mt-2 float-right ml-4 mb-2">
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
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={title}
        showCloseButton={false}
        className='p-0 m-0 gap-0 w-[70vw]  max-h-[calc(100vh-10rem)]  max-w-[1400px]! min-w-[300px]'
      >

        {images?.length ? (
          <div className="relative w-full h-[45vh] bg-black flex items-center justify-center">
            <Swiper
              modules={[Navigation, Pagination]}
              navigation
              pagination={{ clickable: true }}
              loop={images.length > 1}
              className="w-full h-full"
            >
              {images.map((image, index) => (
                <SwiperSlide key={index} className="flex items-center justify-center">
                  <Image
                    src={image}
                    alt={`${title} - photo ${index + 1}`}
                    fill
                    className="object-contain"
                    priority={index === 0}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ) : null}

        <div className=" py-5 px-5   ">

          <div className="flex-1 overflow-y-auto px-6 py-5h-[calc(100vh-10rem)]">
            <h4 className="text-federant text-brown-light text-center text-xl mb-4">
              {title}
            </h4>

            <div
              className="text-description text-description--long"
              dangerouslySetInnerHTML={{ __html: ingredientsText }}
            />

            <div
              className="text-description text-description--long mt-4"
              dangerouslySetInnerHTML={{ __html: directionsText }}
            />
          </div>
          <div className="corner corner--big lt" />
          <div className="corner corner--big rt" />
          <div className="corner corner--big lb" />
          <div className="corner corner--big rb" />
          <XIcon className='absolute top-5 right-5 cursor-pointer' onClick={closeModal} />
        </div>

      </Modal>
    </>
  )
}
