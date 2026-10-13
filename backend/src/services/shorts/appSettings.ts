// Preferências do app inteiro, da tela Configurações. Um arquivo só: data/app_settings/app.json.

import { FileStorage } from '../storage/FileStorage.js'

export interface AppSettings {
  id: 'app'
  /**
   * Imagens sugestivas nas sugestões da web (fanservice, roupa curta, pose ousada). Desligado = Bing no
   * rígido e Danbooru só "geral"; ligado = Bing moderado e Danbooru também "sensível". Nudez nunca.
   */
  suggestiveImages: boolean
}

const DEFAULTS: AppSettings = { id: 'app', suggestiveImages: false }

const storage = new FileStorage<AppSettings>('app_settings')

/** Sem o arquivo (app novo), valem os padrões; um campo novo também começa no padrão. */
export async function getAppSettings(): Promise<AppSettings> {
  return { ...DEFAULTS, ...(await storage.findById('app')), id: 'app' }
}

/** Só os campos conhecidos, e só com o tipo certo: o corpo do pedido vem de fora. */
export async function updateAppSettings(changes: Partial<AppSettings>) {
  const current = await getAppSettings()
  if (typeof changes.suggestiveImages === 'boolean') current.suggestiveImages = changes.suggestiveImages
  return storage.save(current)
}
