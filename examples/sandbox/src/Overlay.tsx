import { Show, lazy } from 'solid-js'
const DevtoolsOverlay = lazy(() => import('./DevtoolsOverlay'))

export function Overlay() {
    return (
        <Show when={!process.env.EXT || process.env.BUILD}>
            <DevtoolsOverlay defaultOpen noPadding />
        </Show>
    )
}
