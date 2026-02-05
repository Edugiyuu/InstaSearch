/**
 * VideoController - Upload, merge e publicação de vídeos/reels
 * 
 * Endpoints:
 * - POST /api/videos/upload - Upload de 1-3 vídeos
 * - POST /api/videos/merge - Juntar vídeos (se múltiplos)
 * - POST /api/videos/publish-reel - Publicar reel no Instagram
 * - DELETE /api/videos/:filename - Deletar arquivo temporário
 */

import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import { VideoService } from '../services/videoService.js';
import { InstagramAccountStorage } from '../services/storage/InstagramAccountStorage.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const videoService = new VideoService();
const accountStorage = new InstagramAccountStorage();

// Configurar multer para upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'data', 'videos', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1E9)}`;
    cb(null, `video_${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 3 // Máximo 3 vídeos
  },
  fileFilter: (_req, file, cb) => {
    const allowedFormats = ['.mp4', '.mov', '.avi', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Formato não suportado: ${ext}. Use: ${allowedFormats.join(', ')}`));
    }
  }
});

/**
 * POST /api/videos/upload
 * Upload de 1-3 vídeos
 */
export const uploadVideos = [
  upload.array('videos', 3),
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new AppError('Nenhum vídeo enviado', 400);
    }

    logger.info(`📤 ${files.length} vídeo(s) recebido(s)`);

    // Validar cada vídeo
    const validatedVideos = [];
    for (const file of files) {
      const validation = await videoService.validateVideo(file.path);
      
      if (!validation.valid) {
        // Deletar arquivo inválido
        await videoService.deleteFile(file.path);
        throw new AppError(`Erro no vídeo ${file.originalname}: ${validation.error}`, 400);
      }

      validatedVideos.push({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        duration: validation.duration
      });
    }

    logger.info(`✅ ${validatedVideos.length} vídeo(s) validado(s) com sucesso`);

    res.json({
      success: true,
      data: {
        videos: validatedVideos,
        count: validatedVideos.length,
        totalDuration: validatedVideos.reduce((acc, v) => acc + (v.duration || 0), 0)
      }
    });
  })
];

/**
 * POST /api/videos/merge
 * Juntar múltiplos vídeos em um só
 * 
 * Body:
 * - filenames: string[] - Nomes dos arquivos a juntar (na ordem)
 */
export const mergeVideos = asyncHandler(
  async (req: Request, res: Response) => {
    const { filenames } = req.body;

    if (!filenames || !Array.isArray(filenames) || filenames.length < 2) {
      throw new AppError('Envie pelo menos 2 vídeos para juntar', 400);
    }

    if (filenames.length > 3) {
      throw new AppError('Máximo de 3 vídeos permitidos', 400);
    }

    // Construir caminhos completos
    const tempDir = path.join(process.cwd(), 'data', 'videos', 'temp');
    const videoPaths = filenames.map(f => path.join(tempDir, f));

    // Verificar se todos os arquivos existem
    for (const videoPath of videoPaths) {
      if (!fs.existsSync(videoPath)) {
        throw new AppError(`Vídeo não encontrado: ${path.basename(videoPath)}`, 404);
      }
    }

    // Fazer merge
    const outputFilename = `merged_${Date.now()}.mp4`;
    const outputPath = await videoService.mergeVideos(videoPaths, outputFilename);

    logger.info(`✅ Merge concluído: ${outputFilename}`);

    // Deletar arquivos originais
    for (const videoPath of videoPaths) {
      await videoService.deleteFile(videoPath);
    }

    res.json({
      success: true,
      data: {
        filename: outputFilename,
        path: outputPath
      }
    });
  }
);

/**
 * POST /api/videos/publish-reel
 * Publicar reel no Instagram
 * 
 * Body:
 * - filename: string - Nome do arquivo (temp ou merged)
 * - caption: string - Legenda do reel
 * - hashtags?: string - Hashtags separadas por espaço
 */
export const publishReel = asyncHandler(
  async (req: Request, res: Response) => {
    const { filename, caption, hashtags } = req.body;

    if (!filename) {
      throw new AppError('Nome do arquivo é obrigatório', 400);
    }

    if (!caption) {
      throw new AppError('Caption é obrigatória', 400);
    }

    // Buscar conta do Instagram conectada
    const accounts = await accountStorage.findAll();
    if (accounts.length === 0) {
      throw new AppError('Nenhuma conta do Instagram conectada', 400);
    }

    const account = accounts[0];
    const { accountId, accessToken } = account;

    // Construir caption final
    let fullCaption = caption.trim();
    if (hashtags) {
      const hashtagsFormatted = hashtags
        .split(/\s+/)
        .filter(Boolean)
        .map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ');
      
      fullCaption += `\n\n${hashtagsFormatted}`;
    }

    // Encontrar arquivo (verificar temp e output)
    const tempPath = path.join(process.cwd(), 'data', 'videos', 'temp', filename);
    const outputPath = path.join(process.cwd(), 'data', 'videos', 'output', filename);
    
    let videoPath = '';
    if (fs.existsSync(tempPath)) {
      videoPath = tempPath;
    } else if (fs.existsSync(outputPath)) {
      videoPath = outputPath;
    } else {
      throw new AppError('Vídeo não encontrado', 404);
    }

    logger.info(`📱 Publicando reel no Instagram...`);
    logger.info(`Caption: ${fullCaption}`);

    try {
      // Etapa 1: Criar container de mídia (upload do vídeo)
      const videoUrl = await uploadVideoToPublicURL(videoPath);
      
      const containerResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${accountId}/media`,
        {
          media_type: 'REELS',
          video_url: videoUrl,
          caption: fullCaption,
          share_to_feed: true
        },
        {
          params: { access_token: accessToken }
        }
      );

      const creationId = containerResponse.data.id;
      logger.info(`Container criado: ${creationId}`);

      // Etapa 2: Aguardar processamento (polling)
      await waitForVideoProcessing(accountId, creationId, accessToken);

      // Etapa 3: Publicar reel
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${accountId}/media_publish`,
        {
          creation_id: creationId
        },
        {
          params: { access_token: accessToken }
        }
      );

      const mediaId = publishResponse.data.id;
      logger.info(`✅ Reel publicado com sucesso! ID: ${mediaId}`);

      // Deletar arquivo local
      await videoService.deleteFile(videoPath);

      res.json({
        success: true,
        data: {
          mediaId,
          message: 'Reel publicado com sucesso!'
        }
      });

    } catch (error: any) {
      logger.error('❌ Erro ao publicar reel:', error.response?.data || error.message);
      throw new AppError(
        `Erro ao publicar no Instagram: ${error.response?.data?.error?.message || error.message}`,
        500
      );
    }
  }
);

/**
 * Função auxiliar: Upload de vídeo para URL público via Cloudinary
 */
async function uploadVideoToPublicURL(videoPath: string): Promise<string> {
  try {
    logger.info(`☁️ Fazendo upload do vídeo para Cloudinary...`);
    
    const result = await cloudinary.uploader.upload(videoPath, {
      resource_type: 'video',
      folder: 'instagram-reels',
      format: 'mp4',
      transformation: [
        { width: 1080, height: 1920, crop: 'fill' },
        { quality: 'auto:good' }
      ]
    });

    logger.info(`✅ Upload concluído: ${result.secure_url}`);
    return result.secure_url;
    
  } catch (error: any) {
    logger.error('❌ Erro no upload para Cloudinary:', error.message);
    throw new AppError(`Erro ao fazer upload do vídeo: ${error.message}`, 500);
  }
}

/**
 * Função auxiliar: Aguardar processamento do vídeo
 */
async function waitForVideoProcessing(
  _accountId: string,
  creationId: string,
  accessToken: string,
  maxAttempts: number = 30
): Promise<void> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const statusResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${creationId}`,
      {
        params: {
          fields: 'status_code',
          access_token: accessToken
        }
      }
    );

    const statusCode = statusResponse.data.status_code;
    logger.info(`Status do vídeo: ${statusCode}`);

    if (statusCode === 'FINISHED') {
      return;
    } else if (statusCode === 'ERROR') {
      throw new Error('Erro no processamento do vídeo');
    }

    // Aguardar 2 segundos antes de verificar novamente
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error('Timeout: vídeo não foi processado a tempo');
}

/**
 * DELETE /api/videos/:filename
 * Deletar arquivo temporário
 */
export const deleteVideo = asyncHandler(
  async (req: Request, res: Response) => {
    const { filename } = req.params;

    const tempPath = path.join(process.cwd(), 'data', 'videos', 'temp', filename);
    const outputPath = path.join(process.cwd(), 'data', 'videos', 'output', filename);

    if (fs.existsSync(tempPath)) {
      await videoService.deleteFile(tempPath);
    } else if (fs.existsSync(outputPath)) {
      await videoService.deleteFile(outputPath);
    } else {
      throw new AppError('Arquivo não encontrado', 404);
    }

    res.json({
      success: true,
      message: 'Arquivo deletado com sucesso'
    });
  }
);
