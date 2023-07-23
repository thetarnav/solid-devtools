import '@solid-devtools/debugger/setup'

import { math } from '@nothing-but/utils'
import { useDebugger } from '@solid-devtools/debugger/bundled'
import { Icon, MountIcons } from '@solid-devtools/frontend'
import { useIsMobile, useIsTouch } from '@solid-devtools/shared/primitives'
import { createBodyCursor } from '@solid-primitives/cursor'
import { makeEventListener } from '@solid-primitives/event-listener'
import {
    Component,
    ComponentProps,
    Show,
    batch,
    createComputed,
    createRoot,
    createSignal,
} from 'solid-js'
import { Dynamic, Portal } from 'solid-js/web'
import { Devtools } from './controller'

import frontendStyles from '@solid-devtools/frontend/dist/index.css'
import frontendUnoStyles from '@solid-devtools/frontend/dist/uno.css'
import overlayStyles from './styles.css'

export function attachDevtoolsOverlay(props: ComponentProps<typeof Overlay> = {}): VoidFunction {
    let dispose: VoidFunction | undefined

    setTimeout(() => {
        createRoot(_dispose => {
            dispose = _dispose
            return <Overlay {...props} />
        })
    }, 500)

    return () => {
        dispose?.()
    }
}

const Overlay: Component<{
    defaultOpen?: boolean
    alwaysOpen?: boolean
    noPadding?: boolean
}> = ({ defaultOpen, alwaysOpen, noPadding }) => {
    const debug = useDebugger()
    if (defaultOpen || alwaysOpen) debug.toggleEnabled(true)
    const [isOpen, _setOpen] = createSignal(alwaysOpen || debug.enabled())
    const setOpen = alwaysOpen
        ? () => {}
        : (enabled: boolean) => {
              batch(() => {
                  debug.toggleEnabled(enabled)
                  _setOpen(enabled)
              })
          }

    const isMobile = useIsMobile()
    const isTouch = useIsTouch()

    const [progress, setProgress] = createSignal(0.5)
    const [dragging, setDragging] = createSignal(false)
    createComputed(() => setProgress(isMobile() ? 0.8 : 0.5))

    makeEventListener(window, 'pointermove', e => {
        if (!dragging()) return
        const vh = window.innerHeight
        setProgress(1 - math.clamp(e.y, 0, vh - 300) / vh)
    })
    makeEventListener(window, 'pointerup', setDragging.bind(void 0, false))

    createBodyCursor(() => dragging() && 'row-resize')

    return (
        <Portal useShadow mount={document.documentElement}>
            <div
                class="overlay__container"
                classList={{ 'no-padding': noPadding }}
                data-open={isOpen()}
                style={{ '--progress': progress() }}
            >
                <div class="overlay__container__fixed">
                    {!alwaysOpen && (
                        <button class="overlay__toggle-button" onClick={() => setOpen(!isOpen())}>
                            Devtools
                            <Dynamic
                                component={isOpen() ? Icon.EyeSlash : Icon.Eye}
                                class="overlay__toggle-button__icon"
                            />
                        </button>
                    )}
                    <Show when={!isTouch()}>
                        <div
                            class="overlay__container__resizer"
                            onPointerDown={e => {
                                e.preventDefault()
                                setDragging(true)
                            }}
                        />
                    </Show>
                    <div class="overlay__container__inner">
                        <Show when={isOpen()}>
                            <Devtools headerSubtitle="overlay" />
                        </Show>
                    </div>
                </div>
            </div>
            <MountIcons />
            <style>{frontendStyles}</style>
            <style>{frontendUnoStyles}</style>
            <style>{overlayStyles}</style>
        </Portal>
    )
}
