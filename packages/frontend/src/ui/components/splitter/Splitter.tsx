import { createComputed, children, createSignal, JSX, Show } from 'solid-js'
import { makeEventListener } from '@solid-primitives/event-listener'
import { clamp } from '@solid-primitives/utils'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { createBodyCursor } from '@solid-primitives/cursor'
import { createMediaQuery } from '@solid-primitives/media'
import { scheduleIdle } from '@solid-primitives/scheduled'
import { getPositionInElement } from '@solid-primitives/mouse'
import * as styles from './Splitter.css'

export function Splitter(props: {
  children: JSX.Element
  side?: JSX.Element
  onToggle: (newState: boolean) => void
}): JSX.Element {
  const sideResolved = children(() => props.side)

  const [progress, setProgress] = createSignal(0.6)
  const [dragging, setDragging] = createSignal(false)

  const isMobile = createMediaQuery('(max-width: 640px)')
  const isTouch = createMediaQuery('(hover: none)')
  createComputed(() => setProgress(isTouch() ? 0.5 : 0.6))

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault()
    setDragging(!isTouch())
  }

  makeEventListener(
    window,
    'pointermove',
    scheduleIdle((e: PointerEvent) => {
      if (!dragging()) return
      const toEl = getPositionInElement(e.pageX, e.pageY, container)
      setProgress(clamp(isMobile() ? toEl.y / toEl.height : toEl.x / toEl.width, 0, 1))
    }),
  )
  makeEventListener(window, 'pointerup', setDragging.bind(void 0, false))

  createBodyCursor(() => dragging() && (isMobile() ? 'row-resize' : 'col-resize'))

  let container!: HTMLDivElement
  return (
    <div
      class={styles.container}
      data-open={!!sideResolved()}
      style={assignInlineVars({
        [styles.progress]: progress() * 100 + '%',
      })}
      ref={container}
    >
      <div class={styles.content}>{props.children}</div>
      <Show when={sideResolved()}>
        <div class={styles.split}>
          <div
            class={styles.splitHandle}
            data-dragging={dragging()}
            onPointerDown={onPointerDown}
          ></div>
        </div>
        <div class={styles.content}>{sideResolved()}</div>
      </Show>
    </div>
  )
}
