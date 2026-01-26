import { Recipe } from '@/db/schema'
import Image from 'next/image'

import { FlagIcon, FlagIconCode } from 'react-flag-kit'

import { DescriptionFullHeight } from '@/components/Book/DescriptionFulHeight'
import { RecipeSectionFullHeight } from '@/components/Book/RecipeFullHeight'
import { countriesReverseMap } from '@/utils/countries'

export const convertRecipesToHTML = (recipes: Recipe[], l: unknown) =>
  recipes?.map((recipe, index) => [
    <div className="page" key={`${index}-1`}>
      <div className="page-content">
        <div className="pokemon-container">
          <div className="pokemon-info">
            <h2 className="page-title">{`${recipe.grandmotherTitle} ${recipe.firstName} ${recipe.lastName}`}</h2>
          </div>
          <div className="flex gap-3 items-center flex-wrap justify-around w-full">
            <div className="max-w-[110px] flex flex-col items-center gap-1">
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
            <div className="relative w-[360px] md:w-[540px] lg:w-[720px] h-[270px] md:h-[450px] lg:h-[570px] 2xl:w-[1080px] 2xl:h-[270px]">
              {recipe.photo && recipe.photo.length > 0 && (
                <Image
                  src={recipe.photo[0]}
                  alt={`${recipe.firstName} ${recipe.lastName} - photo ${
                    index + 1
                  }`}
                  fill
                  style={{ objectFit: 'cover' }}
                  className="object-cover"
                />
              )}
              <div className="corner corner--big lt" />
              <div className="corner corner--big rt" />
              <div className="corner corner--big lb" />
              <div className="corner corner--big rb" />
            </div>
          </div>
          <div className="page-info">
            <DescriptionFullHeight
              title={(l as (name: string) => string)('bio')}
              text={recipe.history}
              imageUrl="/bg-1.webp"
            />
            {recipe.geo_history ? (
              <DescriptionFullHeight
                title={(l as (name: string) => string)('history')}
                text={recipe.geo_history}
                imageUrl="/bg-2.webp"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    <div className="page" key={`${index}-2`}>
      <div className="page-content">
        <div className="pokemon-container">
          <RecipeSectionFullHeight
            title={recipe.recipeTitle}
            images={recipe.recipe_image}
            ingredientsText={recipe.recipe}
            directionsText={recipe.directions}
          />

          <div className="page-info">
            {recipe.traditions ? (
              <DescriptionFullHeight
                title={(l as (name: string) => string)('traditions')}
                text={recipe.traditions}
                imageUrl="/bg-3.webp"
              />
            ) : null}
            {recipe.influences ? (
              <DescriptionFullHeight
                title={(l as (name: string) => string)('influencesShort')}
                text={recipe.influences}
                imageUrl="/bg-4.webp"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>,
  ])
