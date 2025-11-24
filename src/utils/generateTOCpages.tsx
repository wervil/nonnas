import { TocPage } from '@/components/Book/TocPage'

export const generateTOCpages = ({
  tableOfContents,
  contentHeight,
  recipesPerPage,
  goToPage,
}: {
  tableOfContents: Record<string, string>
  contentHeight: number
  recipesPerPage: number
  goToPage: (pageNumber: number) => void
}) => {
  const countriesQuantity = Object.keys(tableOfContents).length
  let contentsPages = Math.ceil(countriesQuantity / recipesPerPage)
  if (contentsPages % 2 !== 0) {
    contentsPages++
  }
  const pages = new Array(contentsPages).fill(null)
  return pages.map((_, pageIndex) => {
    const startCountryIndex = pageIndex * recipesPerPage
    const endCountryIndex = startCountryIndex + recipesPerPage
    const countriesOnPage = Object.entries(tableOfContents).slice(
      startCountryIndex,
      endCountryIndex
    )

    return (
      <div className="page" key={`toc-page-${pageIndex}`}>
        <div className="page-content">
          <TocPage
            height={contentHeight - 40}
            countries={countriesOnPage}
            goToPage={goToPage}
          />
        </div>
      </div>
    )
  })
}
