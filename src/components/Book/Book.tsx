'use client'

import './Book.css'
import HTMLFlipBook from 'react-pageflip'

import { Recipe } from '@/db/schema'
import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react'
import { convertRecipesToPages } from '@/utils/convertRecipesToPages'
import { useTranslations } from 'next-intl'
import { ImagesModal } from '../ui/ImagesModal'
import Image from 'next/image'
// import { generateTOCpages } from '@/utils/generateTOCpages'
// import { Typography } from '../ui/Typography'
import { useUser } from '@stackframe/stack'
import CommentSection from '../Comments/CommentSection'

type Props = {
  recipes: Recipe[]
  tableOfContents: Record<string, Recipe[]>
  initialRecipeId?: number | null
}

export type BookHandle = {
  goToPage: (pageNumber: number) => void
  goToRecipe: (recipeId: number) => void
}

const HEADER_HEIGHT = 200
const TOC_ITEM_HEIGHT = 40

// Number of pages before recipes start (cover + TOC pages)
const PAGES_BEFORE_RECIPES = 1 // Just cover page, TOC is commented out

export const Book = forwardRef<BookHandle, Props>(({ recipes, tableOfContents, initialRecipeId }, ref) => {
  const l = useTranslations('labels')
  const user = useUser()
  const [isMobile, setIsMobile] = useState(false)
  const [isSinglePage, setIsSinglePage] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)

  const [images, setImages] = useState<string[] | null>(null)
  // const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [currentRecipeId, setCurrentRecipeId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = 1 + (recipes.length * 2)

  const getCurrentLayout = () => {
    if (flipbookRef.current) {
      // setOrientation(
      //   flipbookRef.current.pageFlip()?.getOrientation() || 'landscape'
      // )
    }
  }

  useEffect(() => {
    const recipesQuantity = Object.entries(tableOfContents).reduce(
      (acc, entry) => ({
        ...acc,
        [entry[0]]: (entry[1] as Recipe[]).length * 2,
      }),
      {}
    )
    const countriesQuantity = Object.keys(recipesQuantity).length
    const maxRecipesPerPage = Math.floor((contentHeight - 52) / TOC_ITEM_HEIGHT)
    // setRecipesPerPage(maxRecipesPerPage)
    let contentsPages = Math.ceil(countriesQuantity / maxRecipesPerPage)
    if (contentsPages % 2 !== 0) {
      contentsPages++
    }

    // Create page ranges for each country
    const pageRanges: Record<string, string> = {}
    let currentPage = contentsPages + 3
    for (const [country, pages] of Object.entries(recipesQuantity)) {
      const numPages = Number(pages)
      const startPage = currentPage
      const endPage = currentPage + numPages - 1
      pageRanges[country] = `${startPage}-${endPage}`
      currentPage = endPage + 1
    }
    // setPageRanges(pageRanges)
  }, [contentHeight, tableOfContents])

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setIsSinglePage(mobile)
      setContentHeight(window.innerHeight - HEADER_HEIGHT)
      // Call layout check after screen size changes
      setTimeout(getCurrentLayout, 100)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  useEffect(() => {
    getCurrentLayout()
    const bookContainer = document.querySelector('.book-container')
    if (!bookContainer) return

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(getCurrentLayout, 100)
    })

    resizeObserver.observe(bookContainer)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const flipbookRef = useRef<{
    pageFlip: () => {
      flipNext: () => void
      flipPrev: () => void
      flip: (pageNumber: number) => void
      getOrientation: () => 'landscape' | 'portrait'
    }
  } | null>(null)
  const lastPageRef = useRef(0)
  useEffect(() => {
    lastPageRef.current = currentPage
  }, [currentPage])

  const nextPage = () => {
    if (isNextDisabled) return
    flipbookRef.current?.pageFlip()?.flipNext()
  }

  const prevPage = () => {
    flipbookRef.current?.pageFlip()?.flipPrev()
  }

  const isPrevDisabled = currentPage === 0
  // Use ref (updated in onFlip) so double-page mode gets correct page immediately
  const pageForDisable = lastPageRef.current
  const isNextDisabled =
    totalPages <= 1 ||
    (isSinglePage
      ? pageForDisable >= totalPages - 1
      : pageForDisable >= totalPages - 2)

  const goToPage = (pageNumber: number) => {
    if (flipbookRef.current) {
      flipbookRef.current.pageFlip()?.flip(pageNumber)
    }
  }

  // Find the page number for a specific recipe ID
  const getPageNumberForRecipe = useCallback((recipeId: number): number => {
    const recipeIndex = recipes.findIndex((r) => r.id === recipeId)
    if (recipeIndex === -1) return 0
    // Each recipe takes 2 pages, and there's a cover page at the start
    return PAGES_BEFORE_RECIPES + (recipeIndex * 2)
  }, [recipes])

  const goToRecipe = useCallback((recipeId: number) => {
    console.log('Book: goToRecipe called for ID:', recipeId)
    const pageNumber = getPageNumberForRecipe(recipeId)
    console.log('Book: Calculated page number:', pageNumber)
    goToPage(pageNumber)
  }, [getPageNumberForRecipe, goToPage])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    goToPage,
    goToRecipe,
  }))

  // Handle initial recipe navigation
  useEffect(() => {
    if (initialRecipeId && recipes.length > 0) {
      // Set the current recipe ID when navigating to a specific recipe
      setCurrentRecipeId(initialRecipeId)
      // Small delay to ensure flipbook is fully initialized
      const timer = setTimeout(() => {
        goToRecipe(initialRecipeId)
      }, 500)
      return () => clearTimeout(timer)
    }
    // Don't set initial recipe - let user open the book first
  }, [initialRecipeId, recipes, goToRecipe])

  return (
    <div className="book-root">
      <div className="wrap">
        <div className="custom-container flex">
          <button
            className={`rotate-135 md:rotate-355 relative md:absolute md:top-1/2 md:-translate-y-1/2 left-[10px] md:left-0 z-1000 ${isPrevDisabled
              ? 'opacity-30 cursor-not-allowed pointer-events-none'
              : 'cursor-pointer'
              }`}
            onClick={prevPage}
            disabled={isPrevDisabled}
            style={{ color: 'white', fontSize: 20 }}
          >
            {window.innerWidth > 768 ? (
              <Image
                src="/prev.png"
                width={window.innerWidth < 1500 ? 120 : 180}
                height={window.innerWidth < 1500 ? 80 : 100}
                alt="Prev"
              />
            ) : (
              <div className="navigation-arrow" />
            )}
          </button>
          <div
            className="book-container"
            style={{
              transition: 'transform 1000ms ease',
              transform: !isSinglePage && currentPage === 0 ? 'translateX(-25%)' : 'translateX(0)',
            }}
          >
            {/* {orientation == 'landscape' ? (
              <div className="page-first cover page-first--desktop">
                <div className="info-wrap">
                  <Typography size="h6" weight="bold" color="white">
                    {l('infoTitle')}
                  </Typography>
                  <Typography size="body" color="white" className="mt-4">
                    {l('infoDescr')}
                  </Typography>
                </div>
              </div>
            ) : null} */}

            <HTMLFlipBook
              key={isSinglePage ? 'single' : 'double'}
              width={isMobile ? 300 : contentHeight * 0.75}
              height={isMobile ? 550 : contentHeight}
              minHeight={isMobile ? 550 : contentHeight}
              maxShadowOpacity={0.5}
              drawShadow={true}
              showCover={true}
              size="fixed"
              useMouseEvents={false}
              ref={flipbookRef}
              className=""
              startPage={0}
              minWidth={isSinglePage ? (isMobile ? 300 : contentHeight * 0.75) : contentHeight * 1.5}
              maxWidth={isSinglePage ? (isMobile ? 440 : contentHeight * 0.75) : contentHeight * 1.5}
              maxHeight={isMobile ? 550 : contentHeight}
              flippingTime={1000}
              usePortrait={isSinglePage}
              startZIndex={0}
              autoSize={true}
              swipeDistance={30}
              showPageCorners={true}
              disableFlipByClick={false}
              onFlip={(e) => {
                const currentPageNum = e.data
                lastPageRef.current = currentPageNum
                setCurrentPage(currentPageNum)

                if (currentPageNum < PAGES_BEFORE_RECIPES) {
                  // On cover page, clear current recipe
                  console.log('On cover page, clearing recipe')
                  setCurrentRecipeId(null)
                } else {
                  // Calculate which recipe is currently displayed
                  // Each recipe has 2 pages, and there's 1 cover page before recipes
                  // If currentPage is 1 (left page of first recipe), index should be 0
                  // If currentPage is 2 (right page of first recipe), index should be 0
                  const recipeIndex = Math.floor((currentPageNum - PAGES_BEFORE_RECIPES) / 2)
                  console.log('Recipe index:', recipeIndex, 'Total recipes:', recipes.length)

                  if (recipeIndex >= 0 && recipeIndex < recipes.length) {
                    const recipeId = recipes[recipeIndex].id
                    console.log('Setting recipe ID to:', recipeId)
                    setCurrentRecipeId(recipeId)
                  } else {
                    console.log('Recipe index out of bounds')
                    setCurrentRecipeId(null)
                  }
                }
              }}
              mobileScrollSupport={false}
              style={{}}
              clickEventForward={true}
            >
              <div className="cover" key="cover">
                <Image
                  src={
                    window.innerWidth > 768
                      ? '/cover.webp'
                      : '/cover-mobile.webp'
                  }
                  alt="Title"
                  layout="fill"
                  objectFit="contain"
                />
              </div>

              {/* {generateTOCpages({
                tableOfContents: pageRanges,
                contentHeight,
                recipesPerPage,
                goToPage,
              })} */}
              {convertRecipesToPages(recipes, l, contentHeight, setImages)}
            </HTMLFlipBook>
          </div>
          <button
            className={`rotate-315 md:rotate-10 relative md:absolute md:top-1/2 md:-translate-y-1/2 button right-[10px] md:right-0 ${isNextDisabled
              ? 'opacity-30 cursor-not-allowed pointer-events-none'
              : 'cursor-pointer'
              }`}
            onClick={nextPage}
            disabled={isNextDisabled}
            style={{ color: 'white', fontSize: 20 }}
          >
            {window.innerWidth > 768 ? (
              <Image
                src="/next.png"
                width={window.innerWidth < 1500 ? 120 : 180}
                height={window.innerWidth < 1500 ? 80 : 100}
                alt="Next"
              />
            ) : (
              <div className="navigation-arrow" />
            )}
          </button>
        </div>
      </div>

      {/* Comments Section - appears below flipbook */}
      {currentRecipeId && (
        <div className="w-full max-w-3xl sm:mt-10 mx-auto px-4 py-6 mb-8 relative z-[100]">
          {/* Decorative background with vintage paper texture effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#352721]/95 via-[#2e231e]/90 to-[#241202]/95 rounded-xl pointer-events-none" />

          <div className="absolute top-0 left-8 right-8 h-[2px] bg-linear-to-r from-transparent via-(--color-primary-border to-transparent opacity-40 pointer-events-none" />

          {/* Corner ornaments */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[var(--color-primary-border)]/40 rounded-tl-lg pointer-events-none" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[var(--color-primary-border)]/40 rounded-tr-lg pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[var(--color-primary-border)]/40 rounded-bl-lg pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[var(--color-primary-border)]/40 rounded-br-lg pointer-events-none" />

          <div className="relative z-10 p-6">
            <CommentSection
              key={currentRecipeId}
              recipeId={currentRecipeId}
              userId={user?.id}
            />
          </div>
        </div>
      )}

      <ImagesModal images={images} onClose={() => setImages(null)} />
    </div>
  )
})

Book.displayName = 'Book'
