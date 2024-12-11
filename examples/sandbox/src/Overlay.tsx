import {Show, lazy} from 'solid-js'
const DevtoolsOverlay = lazy(() => import('./DevtoolsOverlay.tsx'))

export function Overlay() {
    return (
        <Show when={!process.env.EXT || process.env.BUILD}>
            <DevtoolsOverlay defaultOpen noPadding />
        </Show>
    )
}
