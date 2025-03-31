import '@solid-devtools/debugger/setup'

import * as s from 'solid-js'
import * as web from 'solid-js/web'
import {createBodyCursor} from '@solid-primitives/cursor'
import {makeEventListener} from '@solid-primitives/event-listener'
import * as num from '@nothing-but/utils/num'
import {useDebugger} from '@solid-devtools/debugger/bundled'
import * as debug from '@solid-devtools/debugger/types'
import {Icon, MountIcons, createDevtools} from '@solid-devtools/frontend'
import {useIsMobile, useIsTouch, atom} from '@solid-devtools/shared/primitives'
import {msg} from '@solid-devtools/shared/utils'

import frontendStyles from '@solid-devtools/frontend/dist/styles.css'
import overlayStyles from './styles.css'

export type OverlayOptions = {
    defaultOpen?:     boolean
    alwaysOpen?:      boolean
    noPadding?:       boolean
    debuggerOptions?: debug.DebuggerOptions<any>
}

export function attachDevtoolsOverlay(props?: OverlayOptions): (() => void) {

    /*
     Only load the overlay after the page is loaded
    */
    let show = atom(false)
    setTimeout(() => {
        show.set(true)
    })

    return s.createRoot(dispose => {
        s.createEffect(() => {
            if (show()) {
                <Overlay {...props} />
            }
        })
        return dispose
    })
}

const Overlay: s.Component<OverlayOptions> = props => {

    let {alwaysOpen, debuggerOptions, defaultOpen, noPadding} = props

    const instance = useDebugger(debuggerOptions)

    if (defaultOpen || alwaysOpen) {
        instance.toggleEnabled(true)
    }

    const isOpen = atom(alwaysOpen || instance.enabled())
    function toggleOpen(enabled?: boolean) {
        if (!alwaysOpen) {
            enabled ??= !isOpen()
            instance.toggleEnabled(enabled)
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
                data-darkreader-ignore
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
                        {_ => {
                            
                            instance.emit(msg('ResetState', undefined))
                        
                            s.onCleanup(() => instance.emit(msg('InspectNode', null)))
                        
                            const devtools = createDevtools({
                                headerSubtitle: () => 'overlay',
                            })
                        
                            devtools.output.listen(e => {
                                separate(e, instance.emit)
                            })
                        
                            instance.listen(e => {
                                separate(e, devtools.input.emit)
                            })
                        
                            return <devtools.Devtools />
                        }}
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



function clone<T>(data: T): T {
    return typeof data === 'object' ? (JSON.parse(JSON.stringify(data)) as T) : data
}
function separate<T>(data: T, callback: (value: T) => void): void {
    queueMicrotask(() => {
        const v = clone(data)
        queueMicrotask(() => callback(v))
    })
}
