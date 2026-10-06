/** Minúsculas e sem acentos, para comparar textos ("Pensativo" = "pensativo", "mão" = "mao"). */
export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
