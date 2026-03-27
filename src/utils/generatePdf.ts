import { jsPDF } from 'jspdf'
import { Recipe } from '@/db/schema'

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<\/?(p|br|div|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 20
const CONTENT_W = PAGE_W - MARGIN * 2
const LINE_H = 5.5
const SECTION_GAP = 4
const BRAND_COLOR: [number, number, number] = [107, 41, 36]
const TEXT_COLOR: [number, number, number] = [40, 40, 40]
const LIGHT_COLOR: [number, number, number] = [120, 120, 120]

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage()
    return MARGIN
  }
  return y
}

function drawWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const paragraphs = text.split('\n')
  let curY = y

  for (const para of paragraphs) {
    if (!para.trim()) {
      curY += lineHeight * 0.6
      continue
    }
    const wrapped = doc.splitTextToSize(para, maxWidth) as string[]
    for (const line of wrapped) {
      curY = ensureSpace(doc, curY, lineHeight)
      doc.text(line, x, curY)
      curY += lineHeight
    }
  }
  return curY
}

function drawSectionLabel(doc: jsPDF, label: string, y: number): number {
  let curY = ensureSpace(doc, y, LINE_H * 2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BRAND_COLOR)
  doc.text(label, MARGIN, curY)
  curY += LINE_H + 1
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_COLOR)
  return curY
}

function drawSection(doc: jsPDF, label: string, content: string | null | undefined, y: number): number {
  if (!content) return y
  const clean = stripHtml(content)
  if (!clean) return y
  let curY = drawSectionLabel(doc, label, y)
  curY = drawWrappedText(doc, clean, MARGIN, curY, CONTENT_W, LINE_H)
  return curY + SECTION_GAP
}

async function addImages(
  doc: jsPDF,
  urls: string[],
  y: number,
  label: string,
): Promise<number> {
  if (!urls.length) return y

  let curY = drawSectionLabel(doc, label, y)

  const imgW = 80
  const imgH = 60
  let col = 0
  const colGap = 5

  for (const url of urls) {
    const dataUrl = await fetchImageAsDataUrl(url)
    if (!dataUrl) continue

    const xPos = MARGIN + col * (imgW + colGap)
    curY = ensureSpace(doc, curY, imgH + 6)

    try {
      doc.addImage(dataUrl, 'JPEG', xPos, curY, imgW, imgH)
    } catch {
      continue
    }

    col++
    if (col >= 2) {
      col = 0
      curY += imgH + 4
    }
  }

  if (col !== 0) curY += imgH + 4
  return curY + SECTION_GAP
}

export async function exportRecipesToPdf(
  recipes: Recipe[],
  filename: string,
  countryLabel?: string,
  onProgress?: (current: number, total: number) => void,
) {
  if (!recipes.length) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const totalRecipes = recipes.length

  // --- Title page ---
  doc.setFontSize(28)
  doc.setTextColor(...BRAND_COLOR)
  doc.setFont('helvetica', 'bold')
  const title = countryLabel
    ? `Nonna's Recipes`
    : `Nonna's Recipes`
  doc.text(title, PAGE_W / 2, 80, { align: 'center' })

  if (countryLabel) {
    doc.setFontSize(18)
    doc.setTextColor(...LIGHT_COLOR)
    doc.text(countryLabel, PAGE_W / 2, 95, { align: 'center' })
  }

  doc.setFontSize(12)
  doc.setTextColor(...LIGHT_COLOR)
  doc.setFont('helvetica', 'normal')
  doc.text(`${totalRecipes} recipes`, PAGE_W / 2, countryLabel ? 108 : 95, { align: 'center' })

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.setFontSize(10)
  doc.text(dateStr, PAGE_W / 2, PAGE_H - 40, { align: 'center' })

  // --- Recipe pages ---
  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i]
    onProgress?.(i + 1, totalRecipes)

    doc.addPage()
    let y = MARGIN

    // Recipe number + grandmother name header
    const grandmother = r.grandmotherTitle || ''
    const fullName = [grandmother, r.firstName, r.lastName].filter(Boolean).join(' ')

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_COLOR)
    doc.text(`${i + 1}.  ${fullName}`, MARGIN, y)
    y += 8

    // Location
    const location = [r.country, r.region, r.city].filter(Boolean).join(', ')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...LIGHT_COLOR)
    doc.text(location, MARGIN, y)
    y += 10

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 6

    doc.setTextColor(...TEXT_COLOR)

    // Nonna photos
    const nonnaPhotos = r.photo?.filter(Boolean) || []
    if (nonnaPhotos.length > 0) {
      y = await addImages(doc, nonnaPhotos, y, 'Nonna Photos')
    }

    // Bio
    y = drawSection(doc, 'Bio', r.history, y)

    // History
    y = drawSection(doc, 'History', r.geo_history, y)

    // Recipe title
    if (r.recipeTitle) {
      y = ensureSpace(doc, y, LINE_H * 3)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(...BRAND_COLOR)
      doc.text(`Recipe: ${r.recipeTitle}`, MARGIN, y)
      y += LINE_H + SECTION_GAP
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...TEXT_COLOR)
    }

    // Recipe images
    const recipeImages = [
      ...(r.recipe_image?.filter(Boolean) || []),
      ...(r.dish_image?.filter(Boolean) || []),
    ]
    if (recipeImages.length > 0) {
      y = await addImages(doc, recipeImages, y, 'Recipe Photos')
    }

    // Ingredients
    y = drawSection(doc, 'Ingredients', r.recipe, y)

    // Directions
    y = drawSection(doc, 'Directions', r.directions, y)

    // Traditions
    y = drawSection(doc, 'Traditions', r.traditions, y)

    // Influences
    y = drawSection(doc, 'Influences', r.influences, y)
  }

  doc.save(filename)
}
