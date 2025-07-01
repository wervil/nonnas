'use client'

import './Book.css'
import HTMLFlipBook from 'react-pageflip'
import Link from 'next/link'
import Button from '@/components/ui/Button'

import { Recipe } from '@/db/schema'
import { useRef } from 'react'
import { convertRecipesToPages } from '@/utils/convertRecipesToPages'
import { useTranslations } from 'next-intl'

type Props = {
  recipes: Recipe[]
}

export const Book = ({ recipes }: Props) => {
  const b = useTranslations('buttons')

  const flipbookRef = useRef<{
    pageFlip: () => { flipNext: () => void; flipPrev: () => void }
  } | null>(null)

  const nextPage = () => {
    flipbookRef.current?.pageFlip()?.flipNext()
  }

  const prevPage = () => {
    flipbookRef.current?.pageFlip()?.flipPrev()
  }

  return (
    <div className="wrap">
      <div className="container">
        <div className="book-container">
          <HTMLFlipBook
            width={370}
            height={500}
            maxShadowOpacity={0.5}
            drawShadow={true}
            showCover={false}
            size="fixed"
            useMouseEvents={false}
            ref={flipbookRef}
            startPage={0}
            className="flipbook"
            minWidth={315}
            maxWidth={1000}
            minHeight={420}
            maxHeight={1536}
            flippingTime={1000}
            usePortrait={true}
            startZIndex={0}
            autoSize={true}
            swipeDistance={30}
            showPageCorners={true}
            disableFlipByClick={true}
            onFlip={() => {}}
            mobileScrollSupport={true}
            style={{}}
            clickEventForward={true}
          >
            {convertRecipesToPages(recipes)}
          </HTMLFlipBook>
          <div className="navigation">
            <button onClick={prevPage}>{b('prevPage')}</button>
            <button onClick={nextPage}>{b('nextPage')}</button>
          </div>
          <div className="flex justify-center items-center mb-8">
            <Link href="/add-recipe">
              <Button variant="secondary">{b('addRecipe')}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
