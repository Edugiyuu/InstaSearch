3333333333333333333333333/**
 * VideoService - Processamento e merge de vídeos
 * 
 * Funcionalidades:
 * - Upload de vídeos (1-3 arquivos)
 * - Merge de múltiplos vídeos em um só
 * - Validação de formato e duração
 * - Otimização para Instagram Reels (1080x1920)
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';

const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Diretórios de armazenamento
const TEMP_DIR = path.join(process.cwd(), 'data', 'videos', 'temp');
const OUTPUT_DIR = path.join(process.cwd(), 'data', 'videos', 'output');

// Garantir que diretórios existem
async function ensureDirectories() {
  try {
    await mkdir(TEMP_DIR, { recursive: true });
    await mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    logger.error('Erro ao criar diretórios:', error);
  }
}

ensureDirectories();

interface VideoMetadata {
  id: string;
  filename: string;
  path: string;
  duration: number;
  size: number;
}

class VideoService {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_DURATION = 30; // 30 segundos
  private readonly ALLOWED_FORMATS = ['.mp4', '.mov', '.avi', '.mkv'];

  /**
   * Valida um arquivo de vídeo
   */
  async validateVideo(filePath: string): Promise<{ valid: boolean; error?: string; duration?: number }> {
    try {
      // Verificar tamanho do arquivo
      const stats = fs.statSync(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `Arquivo muito grande. Máximo: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
        };
      }

      // Verificar extensão
      const ext = path.extname(filePath).toLowerCase();
      if (!this.ALLOWED_FORMATS.includes(ext)) {
        return {
          valid: false,
          error: `Formato não suportado. Use: ${this.ALLOWED_FORMATS.join(', ')}`
        };
      }

      // Obter duração do vídeo
      const duration = await this.getVideoDuration(filePath);
      
      if (duration > this.MAX_DURATION) {
        return {
          valid: false,
          error: `Vídeo muito longo. Máximo: ${this.MAX_DURATION}s (atual: ${duration.toFixed(1)}s)`
        };
      }

      return { valid: true, duration };

    } catch (error: any) {
      logger.error('Erro ao validar vídeo:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Obtém a duração de um vídeo em segundos
   */
  private getVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          resolve(duration);
        }
      });
    });
  }

  /**
   * Faz merge de múltiplos vídeos em um só
   * Otimizado para Instagram Reels (1080x1920, 30fps)
   */
  async mergeVideos(videoPaths: string[], outputFilename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(OUTPUT_DIR, outputFilename);
      
      logger.info(`🎬 Iniciando merge de ${videoPaths.length} vídeos...`);

      // Criar arquivo de lista para concatenação
      const listPath = path.join(TEMP_DIR, `list_${Date.now()}.txt`);
      const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
      fs.writeFileSync(listPath, listContent);

      ffmpeg()
        .input(listPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c:v libx264',           // Codec de vídeo
          '-preset fast',           // Velocidade de encoding
          '-crf 23',                // Qualidade (18-28, menor = melhor)
          '-vf scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920', // Resize e crop para 9:16 SEM bordas
          '-r 30',                  // 30 FPS
          '-c:a aac',               // Codec de áudio
          '-b:a 128k',              // Bitrate de áudio
          '-movflags +faststart'    // Otimização para streaming
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.info('Comando FFmpeg:', commandLine);
        })
        .on('progress', (progress) => {
          logger.info(`Progresso: ${progress.percent?.toFixed(1)}%`);
        })
        .on('end', async () => {
          logger.info('✅ Merge concluído!');
          
          // Limpar arquivo de lista
          try {
            await unlink(listPath);
          } catch (error) {
            logger.warn('Erro ao deletar arquivo de lista:', error);
          }

          resolve(outputPath);
        })
        .on('error', async (err) => {
          logger.error('❌ Erro no merge:', err);
          
          // Limpar arquivo de lista
          try {
            await unlink(listPath);
          } catch (error) {
            logger.warn('Erro ao deletar arquivo de lista:', error);
          }

          reject(err);
        })
        .run();
    });
  }

  /**
   * Otimiza um único vídeo para Instagram Reels
   */
  async optimizeVideo(inputPath: string, outputFilename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(OUTPUT_DIR, outputFilename);
      
      logger.info('🎬 Otimizando vídeo para Instagram Reels...');

      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-vf scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920', // Resize e crop para 9:16 SEM bordas
          '-r 30',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('end', () => {
          logger.info('✅ Otimização concluída!');
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('❌ Erro na otimização:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Limpa arquivos temporários antigos (mais de 1 hora)
   */
  async cleanupOldFiles(): Promise<void> {
    try {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      // Limpar TEMP_DIR
      const tempFiles = fs.readdirSync(TEMP_DIR);
      for (const file of tempFiles) {
        const filePath = path.join(TEMP_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > oneHour) {
          await unlink(filePath);
          logger.info(`🗑️ Removido arquivo temporário: ${file}`);
        }
      }

      // Limpar OUTPUT_DIR
      const outputFiles = fs.readdirSync(OUTPUT_DIR);
      for (const file of outputFiles) {
        const filePath = path.join(OUTPUT_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > oneHour) {
          await unlink(filePath);
          logger.info(`🗑️ Removido arquivo de saída: ${file}`);
        }
      }

    } catch (error: any) {
      logger.error('Erro ao limpar arquivos antigos:', error);
    }
  }

  /**
   * Deleta um arquivo específico
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
        logger.info(`🗑️ Arquivo deletado: ${filePath}`);
      }
    } catch (error: any) {
      logger.error('Erro ao deletar arquivo:', error);
    }
  }
}

export { VideoService };
export default VideoService;
