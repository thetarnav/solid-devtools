import { animate } from "motion"
import { Component, createComputed, createMemo, Show, on, createEffect } from "solid-js"
import { clsx } from "clsx"
import { Portal } from "solid-js/web"

const styles = /*css*/ `
.element-overlay {
  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  pointer-events: none;
  transition-duration: 100ms;
  transition-property: transform, opacity, width, height;
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
  margin: 0.75rem auto;
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
  selected: boolean
}

export function attachElementOverlay(props: ElementOverlayProps) {
  return (
    <Portal useShadow>
      <ElementOverlay {...props} />
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
          width: width() + "px",
          height: height() + "px",
          opacity: props.selected ? 1 : 0,
        }}
      >
        <div class="border" />
        <Show when={!!props.name}>
          <div class={clsx("name-container", placeOnTop() ? "top" : "bottom")}>
            <div
              class="name-animated-container"
              ref={el => {
                let prevY = 0
                createComputed(
                  on(placeOnTop, () => (prevY = el.getBoundingClientRect().top), { defer: true }),
                )
                createEffect(
                  on(
                    placeOnTop,
                    () => {
                      const currY = el.getBoundingClientRect().top
                      animate(el, { y: [prevY - currY, 0] }, { duration: 0.15 })
                    },
                    { defer: true },
                  ),
                )
              }}
            >
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
