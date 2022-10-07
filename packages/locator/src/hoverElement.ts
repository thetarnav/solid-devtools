import { makeEventListener } from '@solid-primitives/event-listener'

// TODO: contribute to solid-primitives

// TODO: better support touch

export function makeHoverElementListener(onHover: (el: HTMLElement | null) => void): void {
  let last: HTMLElement | null = null
  const handleHover = (e: { target: unknown }) => {
    const { target } = e
    if (target === last || (!(target instanceof HTMLElement) && target !== null)) return
    onHover((last = target))
  }
  makeEventListener(window, 'mouseover', handleHover)
  makeEventListener(document, 'mouseleave', handleHover.bind(void 0, { target: null }))
}
