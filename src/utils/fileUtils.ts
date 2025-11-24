/**
 * Generates a unique filename by appending timestamp and random string
 * while preserving the original file extension
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const fileExtension = originalName.split('.').pop()
  const baseName = originalName.replace(/\.[^/.]+$/, '') // Remove extension
  
  return `${baseName}-${timestamp}-${random}.${fileExtension}`
}

/**
 * Creates a new File object with a unique name while preserving all other properties
 */
export function createUniqueFile(originalFile: File): File {
  const uniqueName = generateUniqueFileName(originalFile.name)
  
  return new File([originalFile], uniqueName, {
    type: originalFile.type,
    lastModified: originalFile.lastModified,
  })
}

/**
 * Creates multiple unique File objects from an array of files
 */
export function createUniqueFiles(files: File[]): File[] {
  return files.map(createUniqueFile)
}
