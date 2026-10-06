// Entrada do Remotion para o render em MP4 (scripts/render.mjs).
// A composição é a mesma da prévia; a duração chega junto com as props.
import { Composition, continueRender, delayRender, registerRoot } from 'remotion'
import { ShortVideo } from './ShortVideo'
import { FPS, HEIGHT, ShortVideoProps, WIDTH } from './timeline'

type RenderProps = ShortVideoProps & { durationInFrames: number }

// A mesma fonte da prévia (no app ela vem do index.html). O render espera a fonte carregar;
// sem internet, segue com a fonte reserva em vez de travar.
const fontHandle = delayRender('Carregando a fonte Inter')
const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=block'
link.onload = () =>
  Promise.all([400, 600, 800, 900].map(w => document.fonts.load(`${w} 64px Inter`)))
    .catch(() => undefined)
    .then(() => continueRender(fontHandle))
link.onerror = () => continueRender(fontHandle)
document.head.appendChild(link)

function Root() {
  return (
    <Composition
      id="Short"
      component={ShortVideo as unknown as React.FC<RenderProps>}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={FPS}
      defaultProps={{ beats: [], settings: {} as RenderProps['settings'], durationInFrames: FPS }}
      calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames })}
    />
  )
}

registerRoot(Root)
