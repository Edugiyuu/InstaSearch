import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './utils/logger.js'

// Load environment variables FIRST before any other imports
dotenv.config()

console.log('ENV LOADED:', {
  CLIENT_ID: process.env.INSTAGRAM_CLIENT_ID,
  HAS_SECRET: !!process.env.INSTAGRAM_CLIENT_SECRET
})

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// Import routes AFTER env is loaded
const { default: apiRoutes } = await import('./routes/api.js')
app.use('/api', apiRoutes)

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'InstaSearch API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      dashboard: '/api/dashboard/overview',
      profiles: '/api/profiles',
      analysis: '/api/analysis',
      content: '/api/content',
      posts: '/api/posts',
    },
  })
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      path: req.path,
    },
  })
})

// Error handler (must be last)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`)
  logger.info(`📝 API documentation: http://localhost:${PORT}`)
  logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`)
})

export default app
