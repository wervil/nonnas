
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { usePathname } from 'next/navigation'

interface Props {
  title: string
  images: string[] | null
  ingredientsText: string
  directionsText: string
}

export const RecipeSectionFullHeight = ({
  title,
  images,
  ingredientsText,
  directionsText,
}: Props) => {


  const pathname = usePathname();
  const isVideoUrl = (url: string) => /\.(mp4|webm|mov|m4v|ogg)$/i.test(url.split('?')[0])
  const hasVideo = Boolean(images?.some((img) => isVideoUrl(img)))
  return (
    <div className={`relative description-wrap ${(pathname === ('/') ? 'cursor-pointer' : '')}`}>
      <div className="relative overflow-hidden text-left">
        {images?.length && hasVideo ? (
          <div className="relative w-full h-[260px] md:h-[320px] mx-auto mb-3 mt-2">
            <Swiper
              modules={[Navigation, Pagination]}
              navigation
              pagination={{ clickable: true }}
              loop={images.length > 1}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            >
              {images.map((img, index) => (
                <SwiperSlide key={index}>
                  <video
                    src={img}
                    controls
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ) : null}
        {images?.length && !hasVideo ? (
          <div className="relative w-[160px] max-w-[85vw] h-[120px] mx-auto mb-3 mt-2 xl:float-right xl:ml-4 xl:mr-0 xl:mb-2 xl:w-[280px] xl:h-[200px] xl:max-w-none xl:mx-0 2xl:w-[340px] 2xl:h-[240px]">
            <Swiper
              modules={[Navigation, Pagination]}
              navigation
              pagination={{ clickable: true }}
              loop={images.length > 1}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            >
              {images.map((img, index) => (
                <SwiperSlide key={index}>
                  <Image
                    src={img}
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
            className="text-description"
            dangerouslySetInnerHTML={{ __html: ingredientsText }}
          />
          <div
            className="text-description mt-2"
            dangerouslySetInnerHTML={{ __html: directionsText }}
          />
        </div>
      </div>

      <div className="corner corner--big lt" />
      <div className="corner corner--big rt" />
      <div className="corner corner--big lb" />
      <div className="corner corner--big rb" />
    </div>
  )
}
