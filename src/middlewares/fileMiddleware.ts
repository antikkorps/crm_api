import { koaBody } from 'koa-body'
import serve from 'koa-static'
import path from 'path'
import { ServerResponse } from 'http'
import { initializeUploadDirectories } from '../services/fileUploadService'

// Initialize upload directories
initializeUploadDirectories()

// Configure file upload middleware
export const fileUploadMiddleware = koaBody({
  multipart: true,
  formidable: {
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
    keepExtensions: true,
  },
})

// Configure static file serving middleware
export const staticFileMiddleware = serve(
  path.join(process.cwd(), 'uploads'),
  {
    maxage: 24 * 60 * 60 * 1000, // 1 day cache
    setHeaders: (res: ServerResponse, filePath: string) => {
      // Set appropriate headers for image files
      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg')
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png')
      } else if (filePath.endsWith('.gif')) {
        res.setHeader('Content-Type', 'image/gif')
      } else if (filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp')
      }
    }
  }
)
