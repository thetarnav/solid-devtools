import '@solid-devtools/debugger/setup'

import {num} from '@nothing-but/utils'
import {useDebugger} from '@solid-devtools/debugger/bundled'
import {Icon, MountIcons} from '@solid-devtools/frontend'
import {useIsMobile, useIsTouch} from '@solid-devtools/shared/primitives'
import {createBodyCursor} from '@solid-primitives/cursor'
import {makeEventListener} from '@solid-primitives/event-listener'
import * as s from 'solid-js'
import {Dynamic, Portal} from 'solid-js/web'
import {Devtools} from './controller.tsx'

import frontendStyles from '@solid-devtools/frontend/dist/styles.css'
import overlayStyles from './styles.css'

export function attachDevtoolsOverlay(props: s.ComponentProps<typeof Overlay> = {}): VoidFunction {
    let dispose: VoidFunction | undefined

    setTimeout(() => {
        s.createRoot(_dispose => {
            dispose = _dispose
            return <Overlay {...props} />
        })
    }, 500)

    return () => {
        dispose?.()
    }
}

const Overlay: s.Component<{
    defaultOpen?: boolean
    alwaysOpen?: boolean
    noPadding?: boolean
}> = ({defaultOpen, alwaysOpen, noPadding}) => {
    const debug = useDebugger()
    if (defaultOpen || alwaysOpen) debug.toggleEnabled(true)
    const [isOpen, _setOpen] = s.createSignal(alwaysOpen || debug.enabled())
    const setOpen = alwaysOpen
        ? () => {
              /**/
          }
        : (enabled: boolean) => {
              s.batch(() => {
                  debug.toggleEnabled(enabled)
                  _setOpen(enabled)
              })
          }

    const isMobile = useIsMobile()
    const isTouch = useIsTouch()

    const [progress, setProgress] = s.createSignal(0.5)
    const [dragging, setDragging] = s.createSignal(false)
    s.createComputed(() => setProgress(isMobile() ? 0.8 : 0.5))

    makeEventListener(window, 'pointermove', e => {
        if (!dragging()) return
        const vh = window.innerHeight
        setProgress(1 - num.clamp(e.y, 0, vh - 300) / vh)
    })
    makeEventListener(window, 'pointerup', setDragging.bind(void 0, false))

    createBodyCursor(() => dragging() && 'row-resize')

    return (
        <Portal useShadow mount={document.documentElement}>
            <div
                class="overlay__container"
                classList={{'no-padding': noPadding}}
                data-open={isOpen()}
                style={{'--progress': progress()}}
                data-testid="solid-devtools-overlay"
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
                    <s.Show when={!isTouch()}>
                        <div
                            class="overlay__container__resizer"
                            onPointerDown={e => {
                                e.preventDefault()
                                setDragging(true)
                            }}
                        />
                    </s.Show>
                    <div class="overlay__container__inner">
                        <s.Show when={isOpen()}>
                            <Devtools headerSubtitle="overlay" />
                        </s.Show>
                    </div>
                </div>
            </div>
            <MountIcons />
            <style>{frontendStyles}</style>
            <style>{overlayStyles}</style>
        </Portal>
    )
}
