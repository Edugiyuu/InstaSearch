import { FramingChoice, imageUrl, LibraryImage, SceneKind } from '../api/shorts'
import { framing, sceneLook } from '../video/framing'
import { ScenePick } from './ScenePick'
import './BackdropPick.css'

type Choice = 'auto' | FramingChoice
/** Como cada miniatura é desenhada (o automático vira um dos outros quatro). */
type Look = FramingChoice

const NAME: Record<FramingChoice, string> = {
  cover: 'Tela cheia',
  fit: 'Inteira',
  frame: 'Moldura no quadriculado',
  'frame-blur': 'Moldura sobre a imagem',
}
/** Versão curta, para o botão da linha da cena. */
const SHORT: Record<FramingChoice, string> = { cover: 'Tela cheia', fit: 'Inteira', frame: 'Moldura', 'frame-blur': 'Moldura desfocada' }

interface Props {
  scene: SceneKind
  choice?: FramingChoice
  image: LibraryImage
  onChange: (choice: Choice) => void
}

/**
 * Pop-up "Fundo" da cena (ADR 0022, 4A): o automático (o que a IA fez) e mais quatro jeitos, cada um com
 * uma miniatura feita com a própria imagem. A prévia de verdade é o player, que muda ao escolher.
 */
export function BackdropPick({ scene, choice, image, onChange }: Props) {
  const isClip = !!image.clip
  // o que o automático faz com esta cena: moldura nas provas; senão, tela cheia ou inteira pelo formato
  const auto: Look = sceneLook(scene, undefined, isClip) === 'frame' ? 'frame' : framing(image.width, image.height).mode
  // trecho de vídeo não vai na moldura (só imagem parada)
  const choices: Choice[] = isClip ? ['auto', 'cover', 'fit'] : ['auto', 'cover', 'fit', 'frame', 'frame-blur']
  const current: Choice = choice ?? 'auto'
  const label = current === 'auto' ? `Auto · ${SHORT[auto].toLowerCase()}` : SHORT[current]

  return (
    <ScenePick label={`▣ ${label}`} title="Fundo desta cena">
      {close => (
        <div className="bp-grid" role="radiogroup" aria-label="Fundo desta cena">
          {choices.map(c => (
            <button
              key={c}
              role="radio"
              aria-checked={c === current}
              className={`bp-opt ${c === current ? 'on' : ''}`}
              onClick={() => {
                onChange(c)
                close()
              }}
            >
              <Thumb look={c === 'auto' ? auto : c} src={imageUrl(image)} />
              <span>{c === 'auto' ? `Automático (${SHORT[auto].toLowerCase()})` : NAME[c]}</span>
            </button>
          ))}
        </div>
      )}
    </ScenePick>
  )
}

/** Miniatura em pé (9:16) com a imagem da cena, no mesmo arranjo do vídeo (ShortVideo). */
function Thumb({ look, src }: { look: Look; src: string }) {
  const blurredBack = look === 'fit' || look === 'frame-blur'
  return (
    <span className={`bp-thumb ${look === 'frame' ? 'grid' : ''}`} aria-hidden>
      {blurredBack && <img className="bp-back" src={src} alt="" />}
      <img className={`bp-img ${look}`} src={src} alt="" />
    </span>
  )
}
