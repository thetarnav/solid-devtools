import { Show, lazy } from 'solid-js'
const DevtoolsOverlay = lazy(() => import('@solid-devtools/overlay'))

export function Overlay() {
    return (
        <Show when={!process.env.EXT || process.env.BUILD}>
            <DevtoolsOverlay defaultOpen noPadding />
        </Show>
    )
}
