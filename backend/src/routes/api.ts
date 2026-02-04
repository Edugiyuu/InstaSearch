import { Router } from 'express'
import * as profileController from '../controllers/profileController.js'
import * as analysisController from '../controllers/analysisController.js'
import * as contentController from '../controllers/contentController.js'
import * as postController from '../controllers/postController.js'
import * as dashboardController from '../controllers/dashboardController.js'
import * as instagramAuthController from '../controllers/instagramAuthController.js'
import * as instagramTokenController from '../controllers/instagramTokenController.js'
import * as instagramDataController from '../controllers/instagramDataController.js'
import * as aiController from '../controllers/aiController.js'
import * as videoPromptController from '../controllers/videoPromptController.js'

const router = Router()

// Health check
router.get('/health', dashboardController.healthCheck)

// Dashboard
router.get('/dashboard/overview', dashboardController.getDashboardOverview)

// AI Services
router.post('/ai/analyze-profile', aiController.analyzeInstagramProfile)
router.post('/ai/generate-content', aiController.generateContentSuggestions)
router.post('/ai/generate-caption', aiController.generateCaption)
router.post('/ai/analyze-hashtags', aiController.analyzeHashtags)
router.get('/ai/health', aiController.checkAIHealth)

// Video Prompts (AI)
router.post('/video-prompts/generate', videoPromptController.generateVideoPrompt)
router.get('/video-prompts/styles', videoPromptController.getAvailableStyles)

// Instagram Authentication
router.get('/instagram/auth-url', instagramAuthController.getAuthUrl)
router.get('/instagram/callback', instagramAuthController.handleCallback)
router.get('/instagram/account', instagramAuthController.getConnectedAccount)
router.delete('/instagram/account', instagramAuthController.disconnectAccount)
router.post('/instagram/account/refresh', instagramAuthController.refreshAccountData)
router.post('/instagram/connect-token', instagramTokenController.connectWithToken)

// Instagram Data (Graph API)
router.get('/instagram/data/profile', instagramDataController.getInstagramProfile)
router.get('/instagram/data/media', instagramDataController.getInstagramMedia)
router.get('/instagram/data/reels', instagramDataController.getInstagramReels)
router.get('/instagram/data/media/:mediaId', instagramDataController.getInstagramMediaById)
router.get('/instagram/data/media/:mediaId/insights', instagramDataController.getInstagramMediaInsights)
router.get('/instagram/data/media/:mediaId/comments', instagramDataController.getInstagramMediaComments)
router.get('/instagram/data/media/:mediaId/hashtags', instagramDataController.getInstagramMediaHashtags)
router.get('/instagram/data/insights', instagramDataController.getInstagramAccountInsights)

// Profiles
router.get('/profiles', profileController.getProfiles)
router.get('/profiles/stats', profileController.getProfileStats)
router.get('/profiles/:id', profileController.getProfileById)
router.post('/profiles', profileController.createProfile)
router.delete('/profiles/:id', profileController.deleteProfile)
router.post('/profiles/:id/refresh', profileController.refreshProfile)

// Analysis
router.post('/analysis/start', analysisController.startAnalysis)
router.get('/analysis', analysisController.getAnalyses)
router.get('/analysis/stats', analysisController.getAnalysisStats)
router.get('/analysis/profile/:profileId', analysisController.getAnalysesByProfile)
router.get('/analysis/:id', analysisController.getAnalysisById)

// Content
router.post('/content/generate', contentController.generateContent)
router.get('/content', contentController.getContent)
router.get('/content/stats', contentController.getContentStats)
router.get('/content/:id', contentController.getContentById)
router.put('/content/:id', contentController.updateContent)
router.post('/content/:id/approve', contentController.approveContent)
router.delete('/content/:id', contentController.deleteContent)

// Posts
router.post('/posts/schedule', postController.schedulePost)
router.get('/posts', postController.getPosts)
router.get('/posts/upcoming', postController.getUpcomingPosts)
router.get('/posts/:id', postController.getPostById)
router.get('/posts/:id/stats', postController.getPostStats)
router.put('/posts/:id', postController.updatePost)
router.delete('/posts/:id', postController.deletePost)

export default router
