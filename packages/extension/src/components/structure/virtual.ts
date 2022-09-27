export const remToPx = (rem: number): number =>
  rem * parseFloat(getComputedStyle(document.documentElement).fontSize)

export function getVirtualVars(
  listLength: number,
  scroll: number,
  containerHeight: number,
  rowHeight: number,
): { start: number; end: number; length: number } {
  let start = Math.floor(scroll / rowHeight)
  let length = Math.ceil(containerHeight / rowHeight + 1)
  let end = start + length
  if (end > listLength) {
    end = listLength
    start = end - length
    length = Math.min(length, listLength)
    if (start < 0) start = 0
  }
  return { start, end, length }
}
