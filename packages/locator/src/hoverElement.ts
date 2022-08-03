import { makeEventListener } from "@solid-primitives/event-listener"

// TODO: contribute to solid-primitives

// TODO: better support touch

export function makeHoverElementListener(onHover: (el: Element | null) => void): void {
  let last: Element | null = null
  const handleHover = (e: { target: unknown }) => {
    const { target } = e
    if (target === last || (!(target instanceof Element) && target !== null)) return
    onHover((last = target))
  }
  makeEventListener(window, "pointerover", handleHover)
  makeEventListener(document, "pointerleave", handleHover.bind(void 0, { target: null }))
}
