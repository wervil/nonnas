import { Recipe } from '@/db/schema'

import { Description } from '@/components/Book/Description'
import { RecipeSection } from '@/components/Book/RecipeSection'
import { ClickableHoverCard } from '@/components/ClickableHoverCard'
import Image from 'next/image'
import { Dispatch, SetStateAction } from 'react'
import { FlagIcon, FlagIconCode } from 'react-flag-kit'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Navigation, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import { countriesReverseMap } from './countries'

const getLeftSizeDescriptionHeight = (
  hasGeoHistory: boolean,
  contentHeight: number
) => {
  const imageHeight = window.innerWidth < 1536 ? 180 : 220
  const titleHeight = window.innerWidth < 1536 ? 28 : 44
  const height =
    contentHeight -
    32 -
    titleHeight -
    16 -
    imageHeight -
    16 -
    (hasGeoHistory ? 16 : 0)
  return hasGeoHistory ? height / 2 : height
}

const getRightSizeDescriptionHeight = (
  hasInfluences: boolean,
  contentHeight: number,
  isMobile: boolean
) => {
  const height = contentHeight - 48 - (hasInfluences ? (isMobile ? 32 : 16) : 0)
  return height / 3.5
}

export const convertRecipesToPages = (
  recipes: Recipe[],
  l: unknown,
  contentHeight: number,
  setImages: Dispatch<SetStateAction<string[] | null>>
) =>
  recipes?.map((recipe, index) => [
    <div className="page" key={`${index}-1`}>
      <div className="page-content relative">
        <div className="pokemon-container h-full">
          <div className="pokemon-info w-full h-[5%] mb-4">
            <ClickableHoverCard
              trigger={
                <h2 className="page-title max-w-full overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer capitalize">
                  {`${recipe.grandmotherTitle} ${recipe.firstName} ${recipe.lastName}`}
                </h2>
              }
              content={`${recipe.grandmotherTitle} ${recipe.firstName} ${recipe.lastName}`}
            />
          </div>
          <div className="relative w-full h-[35%] min-h-0 overflow-hidden">
            {recipe.photo && recipe.photo.length > 0 ? (
              <Swiper
                modules={[Navigation, Pagination]}
                navigation
                pagination={{ clickable: true }}
                loop={recipe.photo.length > 1}
                className="w-full h-full cursor-pointer [--swiper-navigation-size:20px] md:[--swiper-navigation-size:30px]"
                style={
                  {
                    '--swiper-navigation-sides-offset': '0px',
                  } as React.CSSProperties
                }
              >
                {recipe.photo.map((image, index) => (
                  <SwiperSlide key={index}>
                    <Image
                      src={image}
                      alt={`${recipe.firstName} ${recipe.lastName} - photo ${index + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="object-cover"
                      onClick={() => {
                        if (!recipe.photo || recipe.photo.length === 0) return
                        const newImages = [...recipe.photo]
                        const [clickedImage] = newImages.splice(index, 1)
                        newImages.unshift(clickedImage)
                        setImages(newImages)
                      }}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <div className="text-gray-500 text-center">
                  <p>No photo available</p>
                </div>
              </div>
            )}
            <div className="corner corner--big lt" />
            <div className="corner corner--big rt" />
            <div className="corner corner--big lb" />
            <div className="corner corner--big rb" />

            {/* Country info tile in bottom right */}
            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 bg-[#E9E2D2] rounded-full px-4 py-2 md:px-5 md:py-2 shadow-lg flex items-center gap-2.5 md:gap-3 z-10">
              <FlagIcon
                code={
                  countriesReverseMap[
                    recipe.country
                  ]?.countryShortCode.toUpperCase() as FlagIconCode
                }
                size={28}
                className="md:w-8 md:h-8"
              />
              <span className="text-[#1a1a1a] text-base md:text-lg font-medium whitespace-nowrap">
                {recipe.country}
              </span>
            </div>
          </div>
          <div className="page-info flex-1 min-h-0">
            <Description
              title={(l as (name: string) => string)('bio')}
              text={recipe.history}
              height={getLeftSizeDescriptionHeight(
                !!recipe.geo_history,
                contentHeight
              )}
              imageUrl="/bg-1.webp"
              popupImageUrl="/bg-1.webp"
              type="intro"
            />
            {recipe.geo_history ? (
              <Description
                title={(l as (name: string) => string)('history')}
                text={recipe.geo_history}
                imageUrl="/bg-2.webp"
                popupImageUrl="/bg-2.webp"
                height={getLeftSizeDescriptionHeight(
                  !!recipe.geo_history,
                  contentHeight
                )}
                type="intro"
              />
            ) : null}
          </div>
        </div>
        <div className="absolute bottom-6 left-8 text-federant text-grey text-2xl font-bold z-50 ">
          {1 + index * 2}
        </div>
      </div>
    </div>,
    <div className="page" key={`${index}-2`}>
      <div className="page-content relative">
        <div className="pokemon-container h-full">
          {/* <div className='h-[50%]'>  */}
          <RecipeSection
            title={recipe.recipeTitle}
            images={recipe.recipe_image}
            ingredientsText={recipe.recipe}
            directionsText={recipe.directions}
            setImages={setImages}
          />
          {/* </div> */}

          <div className="page-info flex-1 min-h-0">
            {recipe.traditions ? (
              <Description
                title={(l as (name: string) => string)('traditions')}
                text={recipe.traditions}
                imageUrl="/bg-3.webp"
                popupImageUrl="/bg-3.webp"
                maxWidth="90%"
                height={getRightSizeDescriptionHeight(
                  !!recipe.influences,
                  contentHeight,
                  window.innerWidth < 768
                )}
              />
            ) : null}
            {recipe.influences ? (
              <Description
                title={(l as (name: string) => string)('influencesShort')}
                text={recipe.influences}
                imageUrl="/bg-4.webp"
                popupImageUrl="/bg-4.webp"
                maxWidth="90%"
                height={getRightSizeDescriptionHeight(
                  !!recipe.influences,
                  contentHeight,
                  window.innerWidth < 768
                )}
              />
            ) : null}
          </div>
        </div>
        <div className="absolute bottom-6 right-8 text-federant text-grey text-2xl font-bold z-50 ">
          {1 + index * 2 + 1}
        </div>
      </div>
    </div>,
  ])
