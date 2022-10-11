import { Component, onCleanup, Show } from 'solid-js'
import { Dynamic, isServer, Portal } from 'solid-js/web'
import { Devtools, Icon } from '@solid-devtools/frontend'
import { createInternalRoot } from '@solid-devtools/debugger'
import { createController, enabled, setEnabled } from './controller'

import frontendStyles from '@solid-devtools/frontend/dist/index.css'

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
        <Show when={enabled()}>
          {() => {
            const controller = createController()
            return <Devtools controller={controller} />
          }}
        </Show>
      </div>
      <style>{frontendStyles}</style>
      <style>
        {
          /* css */ `
          .overlay__container {
            position: fixed;
            inset: 100% 0 0 0;
            z-index: 999999;
          }
          .overlay__container[data-open='true'] {
            inset: 50% 0 0 0;
          }

          .overlay__toggle-button {
            position: absolute;
            bottom: 100%;
            right: 0;
            margin: 0.5rem;
            height: 1.2rem;
            padding: 0 0.3rem;
            font-size: 0.7rem;
            background: rgb(6 33 68 / 0.9);
            border: 1px solid #89b6ff;
            color: #89b6ff;
            border-radius: 0.4rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            column-gap: 0.2rem;
          }
          .overlay__toggle-button:hover {
            background: rgb(12 55 113 / 0.9);
          }
          .overlay__toggle-button:active {
            background: rgb(10 47 96 / 0.9);
          }

          .overlay__toggle-button__icon {
            width: 0.9rem;
            height: 0.9rem;
          }
        `
        }
      </style>
    </Portal>
  )
}
