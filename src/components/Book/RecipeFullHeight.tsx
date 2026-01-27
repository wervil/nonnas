
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

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
  return (
    <div className="relative description-wrap cursor-pointer">
      <div className="relative overflow-hidden text-left">
        {images?.length ? (
          <div className="relative w-[340px] h-[240px] min-w-[340px] min-h-[240px] 2xl:w-[640px] 2xl:h-[440px] mt-2 float-right ml-4 mb-2">
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
          className={`text-federant text-brown-light text-center text-m xl:text-xl`}
        >
          {title}
        </h4>
        <div
          className="text-description"
          dangerouslySetInnerHTML={{ __html: ingredientsText }}
        />
        <div
          className="text-description mt-2"
          dangerouslySetInnerHTML={{ __html: directionsText }}
        />
      </div>

      <div className="corner corner--big lt" />
      <div className="corner corner--big rt" />
      <div className="corner corner--big lb" />
      <div className="corner corner--big rb" />
    </div>
  )
}
