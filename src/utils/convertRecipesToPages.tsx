import { Recipe } from '@/db/schema'
import Image from 'next/image'

export const convertRecipesToPages = (recipes: Recipe[]) =>
  recipes?.map((recipe) => [
    <div className="page" key={`${recipe.id}-1`}>
      <div className="page-content">
        <div className="pokemon-container">
          <div className="pokemon-info">
            <h2 className="pokemon-name">{recipe.fullName}</h2>
          </div>
          <div className="relative w-[150px] h-[150px]">
            {' '}
            {recipe.photo?.map((image, index) => (
              <Image src={image} alt={recipe.fullName} key={index} fill />
            ))}
          </div>
          <div className="pokemon-info">
            {/* <div>
                        {pokemon.types.map((type) => (
                            <span
                                key={type}
                                className={`pokemon-type type-${type.toLowerCase()}`}
                            >
                                {type}
                            </span>
                        ))}
                    </div> */}
            <div
              className="pokemon-description"
              dangerouslySetInnerHTML={{ __html: recipe.history || '' }}
            ></div>
            <div
              className="pokemon-description"
              dangerouslySetInnerHTML={{ __html: recipe.geo_history || '' }}
            ></div>
          </div>
        </div>
      </div>
    </div>,
    <div className="page" key={`${recipe.id}-2`}>
      <div className="page-content">
        <div className="pokemon-container">
          {recipe.dish_image?.length ? (
            <div className="relative w-[150px] h-[150px]">
              {' '}
              {recipe.dish_image?.map((image, index) => (
                <Image src={image} alt={recipe.fullName} key={index} fill />
              ))}
            </div>
          ) : null}
          <div className="pokemon-info">
            <div
              className="pokemon-description"
              dangerouslySetInnerHTML={{ __html: recipe.recipe || '' }}
            ></div>
            <div
              className="pokemon-description"
              dangerouslySetInnerHTML={{ __html: recipe.influences || '' }}
            ></div>
          </div>
        </div>
      </div>
    </div>,
  ])
