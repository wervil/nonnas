import Image from 'next/image'

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
      <div className="relative overflow-hidden">
        {images?.length ? (
          <div className="relative w-[340px] h-[240px] min-w-[340px] min-h-[240px] 2xl:w-[640px] 2xl:h-[440px] mt-2 float-right ml-4 mb-2">
            <Image
              src={images[0]}
              alt={title}
              fill
              style={{ objectFit: 'cover' }}
              className="object-cover"
            />
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
