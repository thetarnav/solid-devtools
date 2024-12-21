import {Show, lazy} from 'solid-js'
const DevtoolsOverlay = lazy(() => import('./DevtoolsOverlay.tsx'))

export function Overlay() {
    return (
        <Show when={!import.meta.env.EXT || !import.meta.env.DEV}>
            <DevtoolsOverlay defaultOpen noPadding />
        </Show>
    )
}
