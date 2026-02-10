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
import { MessageCircle, X } from 'lucide-react'

type Props = {
  recipes: Recipe[]
  tableOfContents: Record<string, Recipe[]>
  initialRecipeId?: number | null
}

export type BookHandle = {
  goToPage: (pageNumber: number) => void
  goToRecipe: (recipeId: number) => void
}

const HEADER_HEIGHT = 80 //200
const TOC_ITEM_HEIGHT = 40

// Number of pages before recipes start (cover + TOC pages)
const PAGES_BEFORE_RECIPES = 1 // Just cover page, TOC is commented out

export const Book = forwardRef<BookHandle, Props>(({ recipes, tableOfContents, initialRecipeId }, ref) => {
  const l = useTranslations('labels')
  const user = useUser()
  const [isMobile, setIsMobile] = useState(false)
  const [isSinglePage, setIsSinglePage] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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

  const checkScreenSize = useCallback(() => {
    const sidebarWidth = isSidebarOpen ? 400 : 0
    const availableWidth = window.innerWidth - sidebarWidth
    const mobile = window.innerWidth < 1024

    setIsMobile(mobile)
    // Switch to single page if it's mobile OR if available space is too narrow
    setIsSinglePage(mobile || availableWidth < 1200 || recipes.length === 0)

    setContentHeight(window.innerHeight - HEADER_HEIGHT)
    // Call layout check after screen size changes
    setTimeout(getCurrentLayout, 100)
  }, [isSidebarOpen, recipes.length])

  useEffect(() => {
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [checkScreenSize])

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

  const isPrevDisabled = currentPage === 0 || recipes.length === 0
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
  }, [initialRecipeId, recipes.length, goToRecipe]) // Added recipes.length to dependency to retry if loaded late

  // Handle updates to the recipe list (e.g. search/filter)
  useEffect(() => {
    // When the recipe list changes (search/filter), effectively "reload" the book.
    // Always reset to the cover (Page 0) and clear the active recipe.
    console.log('Book: Recipes list changed, resetting to cover')
    if (currentPage !== 0) {
      setCurrentPage(0)
    }
    setCurrentRecipeId(null)

  }, [recipes]) // Re-run whenever the recipes array reference changes (new filter)

  return (
    <div className="book-root h-[calc(100vh-80px)] overflow-hidden flex flex-row relative">
      <div
        className={`transition-all duration-300 ease-in-out h-full relative ${isSidebarOpen ? 'w-[calc(100%-400px)]' : 'w-full'
          }`}
      >
        <div className="wrap h-full">
          <div className="custom-container flex justify-center items-center h-full relative">
            <button
              className={`rotate-135 md:rotate-355 relative md:absolute md:top-1/2 md:-translate-y-1/2 left-[10px] md:left-4 z-1000 ${isPrevDisabled
                ? 'opacity-30 cursor-not-allowed pointer-events-none'
                : 'cursor-pointer hover:scale-110 transition-transform'
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
              {contentHeight > 0 && (
                <HTMLFlipBook
                  key={`${isSinglePage ? 'single' : 'double'}-${recipes.length}`}
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
                      console.log('On cover page, clearing recipe')
                      setCurrentRecipeId(null)
                    } else {
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
                      priority
                    />
                  </div>
                  {convertRecipesToPages(recipes, l, contentHeight, setImages)}
                </HTMLFlipBook>
              )}
            </div>

            <button
              className={`rotate-315 md:rotate-10 relative md:absolute md:top-1/2 md:-translate-y-1/2 button right-[10px] md:right-4 ${isNextDisabled
                ? 'opacity-30 cursor-not-allowed pointer-events-none'
                : 'cursor-pointer hover:scale-110 transition-transform'
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

        {/* Toggle Sidebar Button - Visible when sidebar is closed and we have a recipe */}
        {!isSidebarOpen && currentRecipeId && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-8 right-8 z-[100] bg-amber-600 text-white p-3 rounded-full shadow-lg hover:bg-amber-700 transition-colors border-2 border-amber-500 flex items-center gap-2"
          >
            <MessageCircle size={24} />
            <span className="font-serif">Discussions</span>
          </button>
        )}
      </div>

      {/* Sidebar - Comments Section */}
      <div
        className={`fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-2xl transition-transform duration-300 z-[1000] overflow-hidden ${isSidebarOpen ? 'translate-x-[0px]' : 'translate-x-[400px]'
          }`}
        style={{ width: '400px' }}
      >
        <div className="h-full flex flex-col relative">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={24} />
          </button>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-16">
            {/* Decorative background with vintage paper texture effect */}
            {/* <div className="absolute inset-0 bg-gradient-to-b from-[#352721]/95 via-[#2e231e]/90 to-[#241202]/95 pointer-events-none -z-10" /> */}

            <div className="relative z-10">
              {currentRecipeId ? (
                <CommentSection
                  key={currentRecipeId}
                  recipeId={currentRecipeId}
                  userId={user?.id}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 text-center p-6">
                  <h3 className="text-xl font-serif text-gray-900 mb-2">Select a Recipe</h3>
                  <p className="opacity-70">Turn the pages to view discussions for each recipe.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ImagesModal images={images} onClose={() => setImages(null)} />
    </div>
  )
})

Book.displayName = 'Book'
