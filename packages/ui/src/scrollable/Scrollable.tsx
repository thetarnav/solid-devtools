import { createComputed, createSignal, ParentComponent } from "solid-js"
import { createKeyHold } from "@solid-primitives/keyboard"
import { makeEventListener } from "@solid-primitives/event-listener"
import { createBodyCursor } from "@shared/cursor"
import * as styles from "./Scrollable.css"

export const Scrollable: ParentComponent<{}> = props => {
  const [dragging, setDragging] = createSignal(false)
  const holdingSpace = createKeyHold(" ")

  createComputed(() => {
    // letting go of the spacebar should stop dragging
    if (!holdingSpace()) setDragging(false)
  })

  // TODO: implement this logic in @solid-primitives/keyboard (prevent default repeated events)
  makeEventListener(window, "keydown", e => {
    if (e.key === " " && holdingSpace()) e.preventDefault()
  })

  createBodyCursor(() => dragging() && "grabbing")

  let start = { x: 0, y: 0 }
  let startScroll = { x: 0, y: 0 }
  const onPointerDown = (e: PointerEvent) => {
    if (!holdingSpace()) return
    e.preventDefault()
    start = { x: e.x, y: e.y }
    startScroll = { x: container.scrollLeft, y: container.scrollTop }
    setDragging(true)
  }

  makeEventListener(window, "pointermove", e => {
    if (!dragging()) return
    e.preventDefault()
    const x = start.x - e.x
    const y = start.y - e.y
    container.scrollLeft = startScroll.x + x
    container.scrollTop = startScroll.y + y
  })

  makeEventListener(window, "pointerup", setDragging.bind(void 0, false))

  makeEventListener(window, "mouseout", e => {
    // if the mouse leaves the window, stop dragging
    if (!e.relatedTarget) setDragging(false)
  })

  let container!: HTMLDivElement
  return (
    <div
      ref={container}
      class={styles.container[holdingSpace() ? (dragging() ? "dragging" : "space") : "normal"]}
      onPointerDown={onPointerDown}
    >
      <div class={styles.overlay[holdingSpace() ? "space" : "normal"]}></div>
      <div class={styles.content}>{props.children}</div>
    </div>
  )
}
