import {
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  on,
  createRoot,
  mergeProps,
  getOwner,
  runWithOwner,
} from "solid-js"
import { createElementBounds } from "@solid-primitives/bounds"
import { makeEventListener } from "@solid-primitives/event-listener"
import { createKeyHold, KbdKey } from "@solid-primitives/keyboard"
import { registerDebuggerPlugin } from "@solid-devtools/debugger"
import { createElementCursor } from "@solid-devtools/shared/cursor"
import { clearFindComponentCache, findComponent } from "./findComponent"
import { makeHoverElementListener } from "./hoverElement"
import { openProjectSource, SourceCodeData, TargetIDE, TargetURLFunction } from "./goToSource"
import { attachElementOverlay } from "./ElementOverlay"
import { createDerivedSignal } from "./derived"

export type SelectedComponent = {
  name: string
  element: HTMLElement
  location: Omit<SourceCodeData, "projectPath"> | null
}

export type { TargetIDE, TargetURLFunction } from "./goToSource"

export type LocatorOptions = {
  targetIDE?: false | TargetIDE | TargetURLFunction
  key?: KbdKey
}

const exports = createRoot(() => {
  const [enabled, setEnabled] = createSignal(false)
  const [selected, setSelectedSource] = createDerivedSignal<SelectedComponent | null>(null)
  const [hoverTarget, setHoverTarget] = createSignal<HTMLElement | null>(null)

  function useLocator(options: LocatorOptions): void {
    const { targetIDE = false, key = "Alt" } = options

    const isHoldingKey = createKeyHold(key, { preventDefault: true })
    createEffect(() => setEnabled(isHoldingKey()))

    makeHoverElementListener(setHoverTarget)

    if (targetIDE) {
      // set pointer cursor to selected component
      createElementCursor(() => selected()?.location?.element, "pointer")

      // go to selected component source code on click
      createEffect(() => {
        if (!enabled()) return
        makeEventListener(
          window,
          "click",
          e => {
            const comp = selected()
            if (!comp || !comp.location) return
            e.preventDefault()
            e.stopPropagation()
            openProjectSource(targetIDE, comp.location)
          },
          true,
        )
      })
    }
  }

  const highlightElement = createMemo(
    on(selected, c => (c ? c.location?.element ?? c.element : null)),
  )
  attachElementOverlay(
    mergeProps(createElementBounds(highlightElement), {
      get tag() {
        return highlightElement()?.tagName.toLocaleLowerCase()
      },
      get selected() {
        return !!selected()
      },
      get name() {
        return selected()?.name
      },
    }),
  )

  registerDebuggerPlugin(({ components }) => {
    createComputed(on(components, clearFindComponentCache))

    createComputed(() => {
      if (!enabled()) return
      // defferred computed inside of computed
      // this is to prevent calculating selected with old components array
      // data flow: enable inLocatorMode() -> trigger computed -> components() updated -> trigger memo
      let init = true
      setSelectedSource(
        createMemo<SelectedComponent | null>(() => {
          const [componentRefs, targetRefs] = [components(), hoverTarget()]
          if (init) return (init = false) || null
          return findComponent(componentRefs, targetRefs)
        }),
      )
    })

    return { enabled, gatherComponents: enabled }
  })

  const owner = getOwner()!
  return {
    useLocator: (opts: LocatorOptions) => runWithOwner(owner, useLocator.bind(void 0, opts)),
  }
})
export const { useLocator } = exports
