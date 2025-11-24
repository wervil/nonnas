import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { X } from 'lucide-react'
import './images-modal.css'

type Props = {
  onClose: () => void
  images: string[] | null
}

export const ImagesModal = ({ onClose, images }: Props) => {
  if (!images?.length) return null

  return (
    <div
      className="absolute inset-0 z-1000 flex items-center justify-center bg-[rgba(0,0,0,0.8)] top-0 left-0 right-0 bottom-0"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <button
        onClick={onClose}
        className="absolute cursor-pointer top-8 right-[12vw] text-white text-3xl font-bold z-1050"
      >
        <X size={30} />
      </button>

      <div className="relative w-[70vw] h-[90vh] max-w-[1400px] max-h-[1000px] min-w-[300px] min-h-[200px]">
        <Swiper
          modules={[Navigation, Pagination]}
          navigation
          pagination={{ clickable: true }}
          loop={images?.length > 1}
          className="w-full h-full rounded-lg cursor-pointer"
          style={
            {
              '--swiper-navigation-sides-offset': '0px',
              height: '100%',
              width: '100%',
            } as React.CSSProperties
          }
          slidesPerView={1}
          spaceBetween={0}
        >
          {images?.map((image, index) => (
            <SwiperSlide
              key={index}
              className="relative w-full h-full flex items-center justify-center"
              style={{ height: '100%', width: '100%' }}
            >
              <Image
                src={image}
                alt={`photo ${index + 1}`}
                fill
                style={{ objectFit: 'contain' }}
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 70vw"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}
