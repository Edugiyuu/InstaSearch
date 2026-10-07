import express, { Router } from 'express'
import * as shortsController from '../controllers/shortsController.js'
import { AUDIO_DIR } from '../services/shorts/projects.js'
import { LIBRARY_FILES_DIR } from '../services/shorts/library.js'
import { SOUND_FILES_DIR } from '../services/shorts/sounds.js'
import { CATCHPHRASE_FILES_DIR } from '../services/shorts/catchphrases.js'
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
import * as videoController from '../controllers/videoController.js'
import * as schedulerController from '../controllers/schedulerController.js'
import * as videoAnalysisController from '../controllers/videoAnalysisController.js'
import * as youtubeController from '../controllers/youtubeController.js'

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

// Videos (Upload, Merge, Publish Reels)
router.post('/videos/upload', ...videoController.uploadVideos)
router.post('/videos/merge', videoController.mergeVideos)
router.post('/videos/publish-reel', videoController.publishReel)
router.post('/videos/analyze-for-caption', videoAnalysisController.analyzeVideoForCaption)
router.delete('/videos/:filename', videoController.deleteVideo)

// Instagram Authentication
router.get('/instagram/auth-url', instagramAuthController.getAuthUrl)
router.get('/instagram/callback', instagramAuthController.handleCallback)
router.get('/instagram/account', instagramAuthController.getConnectedAccount)
router.delete('/instagram/account', instagramAuthController.disconnectAccount)
router.post('/instagram/account/refresh', instagramAuthController.refreshAccountData)
router.post('/instagram/connect-token', instagramTokenController.connectWithToken)

// YouTube (OAuth do Google + envio de Shorts)
router.get('/youtube/status', youtubeController.getStatus)
router.get('/youtube/auth-url', youtubeController.getAuthUrl)
router.get('/youtube/callback', youtubeController.handleCallback)
router.delete('/youtube/account', youtubeController.disconnect)

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

// Shorts (tema → roteiro → montagem automática → revisão)
router.get('/shorts/ai-status', shortsController.getAiStatus)
router.get('/shorts/projects', shortsController.listProjects)
router.post('/shorts/projects', shortsController.createProject)
router.get('/shorts/projects/:id', shortsController.getProject)
router.put('/shorts/projects/:id', shortsController.updateProject)
router.delete('/shorts/projects/:id', shortsController.deleteProject)
router.post('/shorts/projects/:id/assemble', shortsController.assemble)
router.post('/shorts/projects/:id/adjust', shortsController.adjust)
router.post('/shorts/projects/:id/undo', shortsController.undo)
router.put('/shorts/projects/:id/beats/:beatId/image', shortsController.setBeatImage)
router.put('/shorts/projects/:id/beats/:beatId/sfx', shortsController.setBeatSfx)
router.post('/shorts/projects/:id/auto-images', shortsController.autoImages)
router.post('/shorts/projects/:id/audio', ...shortsController.uploadAudio)
router.post('/shorts/projects/:id/transcribe', shortsController.transcribe)
router.get('/shorts/whisper', shortsController.getWhisper)
router.post('/shorts/whisper/install', shortsController.installWhisper)
router.post('/shorts/projects/:id/render', shortsController.startRender)
router.get('/shorts/projects/:id/render', shortsController.getRender)
router.get('/shorts/projects/:id/video', shortsController.downloadVideo)
router.post('/shorts/projects/:id/publish/instagram', shortsController.publishInstagram)
router.post('/shorts/projects/:id/publish/youtube', shortsController.publishYouTube)
router.use('/shorts/audio', express.static(AUDIO_DIR))

// Bordões: abertura e final dos vídeos (ADR 0016)
router.get('/catchphrases', shortsController.listCatchphrases)
router.post('/catchphrases', ...shortsController.createCatchphrase)
router.put('/catchphrases/:id', shortsController.updateCatchphrase)
router.post('/catchphrases/:id/file', ...shortsController.replaceCatchphraseFile)
router.post('/catchphrases/:id/photo/instagram', shortsController.catchphrasePhotoFromInstagram)
router.delete('/catchphrases/:id', shortsController.deleteCatchphrase)
router.use('/catchphrases/files', express.static(CATCHPHRASE_FILES_DIR, { maxAge: '7d' }))

router.get('/shorts/styles', shortsController.listStyles)
router.post('/shorts/styles', shortsController.saveStyle)
router.put('/shorts/styles/:id', shortsController.saveStyle)
router.delete('/shorts/styles/:id', shortsController.deleteStyle)
router.get('/shorts/tones', shortsController.listTones)
router.post('/shorts/tones', shortsController.saveTone)
router.post('/shorts/tones/suggest', shortsController.suggestToneHandler)
router.put('/shorts/tones/:id', shortsController.saveTone)
router.delete('/shorts/tones/:id', shortsController.deleteTone)

// Biblioteca de imagens
router.get('/library', shortsController.listImages)
router.post('/library/upload', ...shortsController.uploadImages)
router.post('/library/upload-video', ...shortsController.uploadVideo)
router.post('/library/:id/reprocess', shortsController.reprocessVideo)
router.post('/library/import-url', shortsController.importImageUrl)
router.get('/library/web-search', shortsController.webImageSearch)
router.get('/library/web-thumb', shortsController.webThumb)
router.put('/library/:id', shortsController.updateImage)
router.post('/library/:id/recatalog', shortsController.recatalogImage)
router.delete('/library/:id', shortsController.deleteImage)
router.use('/library/files', express.static(LIBRARY_FILES_DIR, { maxAge: '7d' }))

// Biblioteca de sons
router.get('/sounds', shortsController.listSounds)
router.post('/sounds/upload', ...shortsController.uploadSounds)
router.post('/sounds/import-url', shortsController.importSoundUrl)
router.put('/sounds/:id', shortsController.updateSound)
router.delete('/sounds/:id', shortsController.deleteSound)
router.use('/sounds/files', express.static(SOUND_FILES_DIR, { maxAge: '7d' }))

// Scheduler
router.get('/scheduler/status', schedulerController.getSchedulerStatus)
router.post('/scheduler/publish/:id', schedulerController.publishPostNow)
router.put('/scheduler/reschedule/:id', schedulerController.reschedulePost)
router.delete('/scheduler/cancel/:id', schedulerController.cancelScheduledPost)

export default router
