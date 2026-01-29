import { Recipe } from '@/db/schema'

import Image from 'next/image'
import { countriesReverseMap } from './countries'
import { Description } from '@/components/Book/Description'
import { RecipeSection } from '@/components/Book/RecipeSection'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { FlagIcon, FlagIconCode } from 'react-flag-kit'
import { Dispatch, SetStateAction } from 'react'
import { ClickableHoverCard } from '@/components/ClickableHoverCard'

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
      <div className="page-content">
        <div className="pokemon-container h-[100%]">
          <div className="pokemon-info w-full h-[5%]">
            <ClickableHoverCard
              trigger={
                <h2 className="page-title max-w-full overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer capitalize">
                  {`${recipe.grandmotherTitle} ${recipe.firstName} ${recipe.lastName}`}
                </h2>
              }
              content={`${recipe.grandmotherTitle} ${recipe.firstName} ${recipe.lastName}`}
            />
          </div>
          <div className="flex flex-row gap-3 items-center flex-wrap whitespace-nowrap justify-around w-full h-[35%]">
            {/* <div className="max-w-[110px] flex flex-col items-center gap-1"> */}
            <div className="max-w-[38%] flex flex-col items-center gap-1">
              <FlagIcon
                code={
                  countriesReverseMap[
                    recipe.country
                  ]?.countryShortCode.toUpperCase() as FlagIconCode
                }
                size={window.innerWidth < 768 ? 50 : 70}
              />
              <h3 className={`text-federant text-yellow-light text-center`}>
                {recipe.country}
              </h3>
              <p className={`text-federant text-yellow-light text-center`}>
                ({recipe.region})
              </p>
            </div>
            {/* <div className="relative w-[120px] md:w-[180px] lg:w-[240px] h-[90px] md:h-[150px] lg:h-[190px] 2xl:w-[360px] 2xl:h-[240px]"> */}
            <div className="relative w-[57%] h-[100%]">
              {recipe.photo && recipe.photo.length > 0 && (
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
              )}
              <div className="corner corner--big lt" />
              <div className="corner corner--big rt" />
              <div className="corner corner--big lb" />
              <div className="corner corner--big rb" />
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
      </div>
    </div>,
    <div className="page" key={`${index}-2`}>
      <div className="page-content">
        <div className="pokemon-container h-[100%]">
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
      </div>
    </div>,
  ])
