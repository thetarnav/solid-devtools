import { createComputed, Component, createSignal, onCleanup, Show } from 'solid-js'
import { Dynamic, Portal } from 'solid-js/web'
import { makeEventListener } from '@solid-primitives/event-listener'
import { clamp } from '@solid-primitives/utils'
import { createBodyCursor } from '@solid-primitives/cursor'
import { Devtools, Icon, MountIcons } from '@solid-devtools/frontend'
import { createInternalRoot, useDebugger } from '@solid-devtools/debugger'
import { createController } from './controller'
import { useIsMobile, useIsTouch } from '@solid-devtools/shared/primitives'

import frontendStyles from '@solid-devtools/frontend/dist/index.css'
import overlayStyles from './styles.css'

interface Props {
  defaultOpen?: boolean
  alwaysOpen?: boolean
  noPadding?: boolean
}

export const DevtoolsOverlay: Component<Props> = props => {
  let dispose: VoidFunction | undefined
  onCleanup(() => dispose?.())

  setTimeout(() => {
    createInternalRoot(_dispose => {
      dispose = _dispose
      return <Overlay {...props} />
    })
  })

  return ''
}

const Overlay: Component<Props> = ({ defaultOpen, alwaysOpen, noPadding }) => {
  const [isOpen, setOpen] = (() => {
    if (alwaysOpen) return [() => true, () => {}] as const
    const [isOpen, setOpen] = createSignal(defaultOpen ?? false)
    onCleanup(() => setOpen(false))
    return [isOpen, setOpen] as const
  })()
  useDebugger().setUserEnabledSignal(isOpen)

  const isMobile = useIsMobile()
  const isTouch = useIsTouch()

  const [progress, setProgress] = createSignal(0.5)
  const [dragging, setDragging] = createSignal(false)
  createComputed(() => setProgress(isMobile() ? 0.8 : 0.5))

  makeEventListener(window, 'pointermove', e => {
    if (!dragging()) return
    const vh = window.innerHeight
    setProgress(1 - clamp(e.y, 0, vh - 300) / vh)
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
            <button class="overlay__toggle-button" onClick={() => setOpen(p => !p)}>
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
              {() => {
                const controller = createController()
                return <Devtools controller={controller} />
              }}
            </Show>
          </div>
        </div>
      </div>
      <MountIcons />
      <style>{frontendStyles}</style>
      <style>{overlayStyles}</style>
    </Portal>
  )
}
