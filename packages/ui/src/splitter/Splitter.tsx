import { children, createEffect, createSignal, JSX } from "solid-js"
import { makeEventListener } from "@solid-primitives/event-listener"
import { clamp } from "@solid-primitives/utils"
import { useWindowSize } from "@solid-primitives/resize-observer"
import { assignInlineVars } from "@vanilla-extract/dynamic"
import { createBodyCursor } from "@shared/cursor"
import * as styles from "./Splitter.css"

export function Splitter(props: {
  children: JSX.Element
  side?: JSX.Element
  onToggle: (newState: boolean) => void
}): JSX.Element {
  const sideResolved = children(() => props.side)

  let containerWidth = window.innerWidth
  const vSize = useWindowSize()
  createEffect(() => {
    // update the width of the container when the window is resized
    vSize.width
    containerWidth = container.getBoundingClientRect().width
  })

  const [progress, setProgress] = createSignal(0.5)
  const [dragging, setDragging] = createSignal(false)

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault()
    setDragging(true)
  }
  makeEventListener(window, "pointermove", e => {
    if (!dragging()) return
    setProgress(clamp(e.x / containerWidth, 0, 1))
  })
  makeEventListener(window, "pointerup", setDragging.bind(void 0, false))

  createBodyCursor(() => dragging() && "col-resize")

  let container!: HTMLDivElement
  return (
    <div
      class={styles.container[sideResolved() ? "open" : "closed"]}
      style={assignInlineVars({
        [styles.progress]: progress() * 100 + "%",
      })}
      ref={container}
    >
      {props.children}
      <div class={styles.split}>
        <button class={styles.toggle} onClick={() => props.onToggle(!sideResolved())}>
          {sideResolved() ? "X" : "O"}
        </button>
        <div class={styles.splitHandle} onPointerDown={onPointerDown}></div>
      </div>
      {sideResolved()}
    </div>
  )
}
