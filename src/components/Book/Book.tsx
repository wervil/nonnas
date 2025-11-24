'use client'

import './Book.css'
import HTMLFlipBook from 'react-pageflip'

import { Recipe } from '@/db/schema'
import { useEffect, useRef, useState } from 'react'
import { convertRecipesToPages } from '@/utils/convertRecipesToPages'
import { useTranslations } from 'next-intl'
import { ImagesModal } from '../ui/ImagesModal'
import Image from 'next/image'
// import { generateTOCpages } from '@/utils/generateTOCpages'
import { Typography } from '../ui/Typography'

type Props = {
  recipes: Recipe[]
  tableOfContents: Record<string, Recipe[]>
}

const HEADER_HEIGHT = 100
const TOC_ITEM_HEIGHT = 40

export const Book = ({ recipes, tableOfContents }: Props) => {
  const l = useTranslations('labels')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [contentHeight, setContentHeight] = useState(
    window.innerHeight - HEADER_HEIGHT
  )
  const [images, setImages] = useState<string[] | null>(null)
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(
    'landscape'
  )
  // const [pageRanges, setPageRanges] = useState<Record<string, string>>({})
  // const [recipesPerPage, setRecipesPerPage] = useState(14)

  const getCurrentLayout = () => {
    if (flipbookRef.current) {
      setOrientation(
        flipbookRef.current.pageFlip()?.getOrientation() || 'landscape'
      )
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
      setIsMobile(window.innerWidth < 768)
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

  const nextPage = () => {
    flipbookRef.current?.pageFlip()?.flipNext()
  }

  const prevPage = () => {
    flipbookRef.current?.pageFlip()?.flipPrev()
  }

  // const goToPage = (pageNumber: number) => {
  //   if (flipbookRef.current) {
  //     flipbookRef.current.pageFlip()?.flip(pageNumber)
  //   }
  // }

  return (
    <>
      <div className="wrap">
        <div className="custom-container flex">
          <button
            className="cursor-pointer rotate-135 md:rotate-355 relative md:top-[15svh] left-[10px] md:left-0 z-1000"
            onClick={prevPage}
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
          <div className="book-container">
            {orientation == 'landscape' ? (
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
            ) : null}

            <HTMLFlipBook
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
              minWidth={isMobile ? 300 : contentHeight * 1.5}
              maxWidth={isMobile ? 440 : contentHeight * 1.5}
              maxHeight={isMobile ? 550 : contentHeight}
              flippingTime={1000}
              usePortrait={true}
              startZIndex={0}
              autoSize={true}
              swipeDistance={30}
              showPageCorners={true}
              disableFlipByClick={false}
              onFlip={() => {}}
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
            className="cursor-pointer rotate-315 md:rotate-10 relative md:top-[15svh] button right-[10px] md:right-0"
            onClick={nextPage}
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
      <ImagesModal images={images} onClose={() => setImages(null)} />
    </>
  )
}
