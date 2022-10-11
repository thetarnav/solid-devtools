import { Component, onCleanup, Show } from 'solid-js'
import { Dynamic, isServer, Portal } from 'solid-js/web'
import { Devtools, Icon } from '@solid-devtools/frontend'
import { createInternalRoot } from '@solid-devtools/debugger'
import { createController, enabled, setEnabled } from './controller'

import frontendStyles from '@solid-devtools/frontend/dist/index.css'
import overlayStyles from './styles.css'

export const DevtoolsOverlay: Component = props => {
  if (isServer) return ''

  let dispose: VoidFunction | undefined
  onCleanup(() => {
    setEnabled(false)
    dispose?.()
  })

  setTimeout(() => {
    createInternalRoot(_dispose => {
      dispose = _dispose
      return <Overlay />
    })
  })

  return ''
}

const Overlay: Component = props => {
  return (
    <Portal useShadow mount={document.documentElement}>
      <div class="overlay__container" data-open={enabled()}>
        <button class="overlay__toggle-button" onClick={() => setEnabled(p => !p)}>
          Devtools{' '}
          <Dynamic
            component={enabled() ? Icon.EyeSlash : Icon.Eye}
            class="overlay__toggle-button__icon"
          />
        </button>
        <div class="overlay__container__inner">
          <Show when={enabled()}>
            {() => {
              const controller = createController()
              return <Devtools controller={controller} />
            }}
          </Show>
        </div>
      </div>
      <style>{frontendStyles}</style>
      <style>{overlayStyles}</style>
    </Portal>
  )
}
