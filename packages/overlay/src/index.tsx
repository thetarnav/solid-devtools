/* Run setup before importing the debugger */
import * as s     from 'solid-js'
import * as store from 'solid-js/store'
import * as web   from 'solid-js/web'
import {setupSolidDevtools} from '@solid-devtools/debugger/setup'
setupSolidDevtools(s.DEV, store.DEV)

import * as num from '@nothing-but/utils/num'
import {useDebugger} from '@solid-devtools/debugger/bundled'
import {Icon, MountIcons} from '@solid-devtools/frontend'
import {useIsMobile, useIsTouch, atom} from '@solid-devtools/shared/primitives'
import {createBodyCursor} from '@solid-primitives/cursor'
import {makeEventListener} from '@solid-primitives/event-listener'
import {Devtools} from './controller.tsx'

import frontendStyles from '@solid-devtools/frontend/dist/styles.css'
import overlayStyles from './styles.css'

export type OverlayOptions = {
    defaultOpen?: boolean
    alwaysOpen?:  boolean
    noPadding?:   boolean
}

export function attachDevtoolsOverlay(props?: OverlayOptions): (() => void) {
    let dispose: (() => void) | undefined

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

const Overlay: s.Component<OverlayOptions> = ({defaultOpen, alwaysOpen, noPadding}) => {

    const debug = useDebugger()

    if (defaultOpen || alwaysOpen) {
        debug.toggleEnabled(true)
    }

    const isOpen = atom(alwaysOpen || debug.enabled())
    function toggleOpen(enabled?: boolean) {
        if (!alwaysOpen) {
            enabled ??= !isOpen()
            debug.toggleEnabled(enabled)
            isOpen.set(enabled)
        }
    }

    const isMobile = useIsMobile()
    const isTouch  = useIsTouch()

    const progress = s.createMemo(
        () => atom(isMobile() ? 0.8 : 0.5)
    )
    const dragging = atom(false)

    makeEventListener(window, 'pointermove', e => {
        if (!dragging()) return
        const vh = window.innerHeight
        progress().set(1 - num.clamp(e.y, 0, vh - 300) / vh)
    })
    makeEventListener(window, 'pointerup', () => dragging.set(false))

    createBodyCursor(() => dragging() && 'row-resize')

    return (
        <web.Portal useShadow mount={document.documentElement}>
            <div
                class="overlay__container"
                classList={{'no-padding': noPadding}}
                data-open={isOpen()}
                style={{'--progress': progress()()}}
                data-testid="solid-devtools-overlay"
            >
                <div class="overlay__container__fixed">
                    {!alwaysOpen && (
                        <button class="overlay__toggle-button" onClick={() => toggleOpen()}>
                            Devtools
                            <web.Dynamic
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
                                dragging.set(true)
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
        </web.Portal>
    )
}
