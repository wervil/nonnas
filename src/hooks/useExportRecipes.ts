import { useState } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { Recipe } from '@/db/schema'

export const useExportRecipes = () => {
    const [isExporting, setIsExporting] = useState(false)

    // Helper to strip HTML tags
    const stripHtml = (html: string | null | undefined): string => {
        if (!html) return ''
        // Create a temporary DOM element to decode HTML entities and strip tags
        // This is safer and handles entities like &amp; correctly
        try {
            const doc = new DOMParser().parseFromString(html, 'text/html')
            return doc.body.textContent || ''
        } catch (e) {
            // Fallback for non-browser envs (though this hook runs in browser)
            return html.replace(/<[^>]*>?/gm, '')
        }
    }

    const exportRecipesToZip = async (recipes: Recipe[], filterName: string = 'Export') => {
        if (!recipes || recipes.length === 0) {
            alert('No recipes to export!')
            return
        }

        setIsExporting(true)
        const zip = new JSZip()

        try {
            // Process each recipe
            const promises = recipes.map(async (recipe, index) => {
                const grandmotherName = `${recipe.grandmotherTitle} ${recipe.firstName} ${recipe.lastName}`.trim()
                const folderName = `${recipe.country} - ${grandmotherName} - ${recipe.recipeTitle}`
                    .replace(/[\/\\?%*:|"<>]/g, '-') // Sanitize folder name

                const folder = zip.folder(folderName)
                if (!folder) return

                // 1. Create Text Content (Plain Text, no HTML)
                const textContent = `
Title: ${recipe.recipeTitle}
Grandmother: ${grandmotherName}
Location: ${recipe.region || ''}, ${recipe.country}

Biography:
${stripHtml(recipe.history)}

History:
${stripHtml(recipe.geo_history)}

Traditions:
${stripHtml(recipe.traditions)}

Influences:
${stripHtml(recipe.influences)}

Ingredients:
${stripHtml(recipe.recipe)}

Directions:
${stripHtml(recipe.directions)}
        `.trim()

                folder.file('Recipe.txt', textContent)

                // 2. Fetch and Add Images

                // Helper to fetch and save image
                const addImageToFolder = async (url: string, targetFolder: JSZip | null, prefix: string, index: number) => {
                    if (!url || !targetFolder) return
                    try {
                        const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
                        if (response.ok) {
                            const blob = await response.blob()
                            const ext = url.split('.').pop()?.split('?')[0] || 'jpg'
                            const safeExt = ext.length > 4 ? 'jpg' : ext
                            // Use index to prevent overwrites if names are same, or just cleaner enumeration
                            targetFolder.file(`${prefix}_${index + 1}.${safeExt}`, blob)
                        } else {
                            console.warn(`Failed to fetch image: ${url}`)
                        }
                    } catch (err) {
                        console.error(`Error fetching image: ${url}`, err)
                    }
                }

                // A. Nonnas Images (from recipe.photo)
                if (recipe.photo && recipe.photo.length > 0) {
                    const nonnaFolder = folder.folder('Nonnas Images')
                    await Promise.all(recipe.photo.map((url, i) => addImageToFolder(url, nonnaFolder, 'Nonna', i)))
                }

                // B. Recipe Images (from recipe.recipe_image AND recipe.dish_image)
                const recipeImages = [
                    ...(recipe.recipe_image || []),
                    ...(recipe.dish_image || [])
                ]

                if (recipeImages.length > 0) {
                    const recipeImgFolder = folder.folder('Recipe Images')
                    await Promise.all(recipeImages.map((url, i) => addImageToFolder(url, recipeImgFolder, 'Recipe', i)))
                }

            })

            await Promise.all(promises)

            // 3. Generate and Save ZIP
            const content = await zip.generateAsync({ type: 'blob' })
            const fileName = `Nonnas_Export_${filterName}_${new Date().toISOString().split('T')[0]}.zip`
            saveAs(content, fileName)

        } catch (error) {
            console.error('Export failed:', error)
            alert('An error occurred during export. Please check the console.')
        } finally {
            setIsExporting(false)
        }
    }

    return { isExporting, exportRecipesToZip }
}
