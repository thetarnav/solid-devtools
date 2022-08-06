import { Accessor, createEffect } from "solid-js"
import { access, FalsyValue, MaybeAccessor } from "@solid-primitives/utils"

export function log(...args: any[]) {
  console.log("%csolid-devtools", "color: #fff; background: #2c4f7c; padding: 1px 4px;", ...args)
}

export function callArrayProp<
  K extends PropertyKey,
  T extends (...args: Args) => void,
  Args extends unknown[],
>(object: { [_ in K]?: T[] }, key: K, ...args: Args): void {
  const arr = object[key]
  if (arr) for (const cb of arr as T[]) cb(...args)
}

export function pushToArrayProp<K extends PropertyKey, T>(
  object: { [_ in K]?: T[] },
  key: K,
  value: T,
): T[] {
  let arr = object[key]
  if (arr) arr.push(value)
  else arr = object[key] = [value]
  return arr
}

export function mutateFilter<T, S extends T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => value is S,
): void
export function mutateFilter<T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => unknown,
): void
export function mutateFilter<T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => unknown,
): void {
  const temp = array.filter(predicate)
  array.length = 0
  array.push.apply(array, temp)
}

export function mutateRemove<T>(array: T[], item: T): void {
  array.splice(array.indexOf(item), 1)
}

export const dedupeArray = <T>(array: readonly T[]) => Array.from(new Set(array))

/** Checks if both arrays contain the same values. Order doesn't matter. */
export const arrayRefEquals = <T>(a: readonly T[], b: readonly T[]) =>
  a === b || (a.length === b.length && a.every(e => b.includes(e)))

/** function that trims too long string */
export function trimString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + "…"
}

export type CursorProperty =
  | "-moz-grab"
  | "-webkit-grab"
  | "alias"
  | "all-scroll"
  | "auto"
  | "cell"
  | "col-resize"
  | "context-menu"
  | "copy"
  | "crosshair"
  | "default"
  | "e-resize"
  | "ew-resize"
  | "grab"
  | "grabbing"
  | "help"
  | "move"
  | "n-resize"
  | "ne-resize"
  | "nesw-resize"
  | "no-drop"
  | "none"
  | "not-allowed"
  | "ns-resize"
  | "nw-resize"
  | "nwse-resize"
  | "pointer"
  | "progress"
  | "row-resize"
  | "s-resize"
  | "se-resize"
  | "sw-resize"
  | "text"
  | "vertical-text"
  | "w-resize"
  | "wait"
  | "zoom-in"
  | "zoom-out"
  | (string & {})

// TODO: contribute to @solid-primitives/cursor

/**
 * Set selected {@link cursor} to {@link target} styles.
 *
 * @param target
 * @param cursor
 */
export function createElementCursor(
  target: Accessor<HTMLElement | FalsyValue> | HTMLElement,
  cursor: MaybeAccessor<CursorProperty>,
): void {
  createEffect<{ el: HTMLElement | FalsyValue; cursor: CursorProperty }>(
    prev => {
      const el = access(target)
      const cursorValue = access(cursor)
      if (prev.el === el && prev.cursor === cursorValue) return prev
      if (prev.el) prev.el.style.cursor = prev.cursor
      if (el) {
        const newPrevCursor = el.style.cursor
        el.style.cursor = cursorValue
        return { el, cursor: newPrevCursor }
      }
      return { el, cursor: "" }
    },
    {
      el: undefined,
      cursor: "",
    },
  )
}

export function createBodyCursor(cursor: Accessor<CursorProperty | FalsyValue>): void {
  let overwritten: string
  createEffect((prev: CursorProperty | FalsyValue) => {
    const cursorValue = cursor()
    if (prev === cursorValue) return prev
    if (cursorValue) {
      overwritten = document.body.style.cursor
      document.body.style.cursor = cursorValue
    } else {
      document.body.style.cursor = overwritten
    }
    return cursorValue
  })
}
