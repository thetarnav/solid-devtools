import { Component, createMemo, Show, Accessor, Index } from 'solid-js'
import { Portal } from 'solid-js/web'
import { createElementCursor } from '@solid-primitives/cursor'
import { createElementBounds } from '@solid-primitives/bounds'
import { LocatorComponent } from './findComponent'

const styles = /*css*/ `
.element-overlay {
  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  pointer-events: none;
  transition-duration: 100ms;
  transition-property: transform, width, height;
  --color: 14 116 144;
}
.border {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 2px solid rgb(var(--color) / 0.8);
  background-color: rgb(var(--color) / 0.3);
  border-radius: 0.25rem;
}
.name-container {
  position: absolute;
  z-index: 10000;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  color: white;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1rem;
}
.name-container.bottom {
  top: 100%;
}
.name-container.top {
  bottom: 100%;
}
.name-animated-container {
  position: relative;
  margin: 0.5rem auto;
  padding: 0.25rem 0.5rem;
}
.name-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgb(var(--color) / 0.8);
  border-radius: 0.25rem;
}
.name-text {
  position: absolute;
}
.name-text span {
  color: #a5f3fc;
}
.name-invisible {
  visibility: hidden;
}
`

export interface ElementOverlayProps {
  left: number | null
  top: number | null
  width: number | null
  height: number | null
  name: string | undefined
  tag: string | undefined
}

export function attachElementOverlay(selected: Accessor<LocatorComponent[]>) {
  return (
    <Portal useShadow>
      <Index each={selected()}>
        {component => {
          // set pointer cursor to selected component
          createElementCursor(() => component().element, 'pointer')
          const bounds = createElementBounds(() => component().element)
          return (
            <ElementOverlay
              {...bounds}
              tag={component().element.tagName.toLocaleLowerCase()}
              name={component().name}
            />
          )
        }}
      </Index>
    </Portal>
  )
}

const ElementOverlay: Component<ElementOverlayProps> = props => {
  const left = createMemo<number>(prev => (props.left === null ? prev : props.left), 0)
  const top = createMemo<number>(prev => (props.top === null ? prev : props.top), 0)
  const width = createMemo<number>(prev => (props.width === null ? prev : props.width), 0)
  const height = createMemo<number>(prev => (props.height === null ? prev : props.height), 0)
  const transform = createMemo(() => `translate(${Math.round(left())}px, ${Math.round(top())}px)`)
  const placeOnTop = createMemo(() => top() > window.innerHeight / 2)

  return (
    <>
      <style>{styles}</style>
      <div
        class="element-overlay"
        style={{
          transform: transform(),
          width: width() + 'px',
          height: height() + 'px',
        }}
      >
        <div class="border" />
        <Show when={!!props.name}>
          <div class={`name-container ${placeOnTop() ? 'top' : 'bottom'}`}>
            <div class="name-animated-container">
              <div class="name-background"></div>
              <div class="name-text">
                {props.name}: <span>{props.tag}</span>
              </div>
              <div class="name-invisible">
                {props.name}: {props.tag}
              </div>
            </div>
          </div>
        </Show>
      </div>
    </>
  )
}
