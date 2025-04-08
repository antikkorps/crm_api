import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Base directory for file uploads, outside of version control
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

// Ensure upload directories exist
export const initializeUploadDirectories = (): void => {
  const directories = [
    UPLOAD_DIR, 
    path.join(UPLOAD_DIR, 'avatars'),
    path.join(UPLOAD_DIR, 'temp')
  ]
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`Created directory: ${dir}`)
    }
  }
}

/**
 * Save a file from a buffer to the filesystem
 */
export const saveFile = async (
  buffer: Buffer, 
  filename: string,
  directory: string = 'temp'
): Promise<{ path: string; filename: string }> => {
  // Generate unique filename to prevent collisions
  const extension = path.extname(filename)
  const newFilename = `${uuidv4()}${extension}`
  
  // Create full path
  const uploadPath = path.join(UPLOAD_DIR, directory, newFilename)
  
  // Write file
  await fs.promises.writeFile(uploadPath, buffer)
  
  // Return path info
  return {
    path: `/${directory}/${newFilename}`,
    filename: newFilename
  }
}

/**
 * Delete a file from the filesystem
 */
export const deleteFile = async (filepath: string): Promise<boolean> => {
  try {
    const fullPath = path.join(UPLOAD_DIR, filepath.replace(/^\//, ''))
    
    // Check if file exists
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath)
      return true
    }
    return false
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

/**
 * Get the full filesystem path for a relative URL path
 */
export const getFullPath = (relativePath: string): string => {
  return path.join(UPLOAD_DIR, relativePath.replace(/^\//, ''))
}

/**
 * Check if a file exists
 */
export const fileExists = (relativePath: string): boolean => {
  const fullPath = getFullPath(relativePath)
  return fs.existsSync(fullPath)
}

/**
 * Convert a filesystem path to a URL path
 */
export const getUrlPath = (filepath: string): string => {
  // Create a URL-friendly path
  const relativePath = filepath.replace(UPLOAD_DIR, '').replace(/\\/g, '/')
  return relativePath.startsWith('/') ? relativePath : `/${relativePath}`
}
