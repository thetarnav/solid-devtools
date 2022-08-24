import { createComputed, createEffect, createMemo, createSignal, on, onCleanup } from "solid-js"
import { Portal } from "solid-js/web"
import { createElementBounds } from "@solid-primitives/bounds"
import {
  makeEventListener,
  stopPropagation,
  preventDefault,
} from "@solid-primitives/event-listener"
import { createKeyHold, KbdKey } from "@solid-primitives/keyboard"
import { registerDebuggerPlugin } from "@solid-devtools/debugger"
import { WINDOW_PROJECTPATH_PROPERTY } from "@solid-devtools/shared/variables"
import { createElementCursor } from "@solid-devtools/shared/cursor"
import { clearFindComponentCache, findComponent } from "./findComponent"
import { makeHoverElementListener } from "./hoverElement"
import { openCodeSource, SourceCodeData, TargetIDE, TargetURLFunction } from "./goToSource"
import { ElementOverlay } from "./ElementOverlay"

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

const [selected, setSelected] = createSignal<SelectedComponent | null>(null)

function openSelectedComponentSource(target: TargetIDE | TargetURLFunction): void {
  const comp = selected()
  if (!comp || !comp.location) return
  // project path comes from a babel plugin injecting hte value to the window object
  const projectPath = (window as any)[WINDOW_PROJECTPATH_PROPERTY]
  openCodeSource(target, { ...comp.location, projectPath })
}

export function useLocatorPlugin({ targetIDE, key = "Alt" }: LocatorOptions): void {
  registerDebuggerPlugin(({ components }) => {
    const [inLocatorMode, setInLocatorMode] = createSignal(false)
    const [hoverTarget, setHoverTarget] = createSignal<HTMLElement | null>(null)

    const isHoldingKey = createKeyHold(key, { preventDefault: true })
    createEffect(() => setInLocatorMode(isHoldingKey()))

    onCleanup(setHoverTarget.bind(void 0, null))
    onCleanup(setSelected.bind(void 0, null))

    attachLocator()

    makeHoverElementListener(setHoverTarget)

    createComputed(on(components, clearFindComponentCache))

    createComputed(() => {
      if (!inLocatorMode()) setSelected(null)
      else {
        // defferred computed inside of computed
        // this is to prevent calculating selected with old components array
        // data flow: enable inLocatorMode() -> trigger outer computed -> components() updated -> trigger defferred computed
        createComputed(
          on([components, hoverTarget], inputs => setSelected(findComponent(...inputs)), {
            defer: true,
          }),
        )
      }
    })

    if (targetIDE) {
      // set pointer cursor to selected component
      createElementCursor(() => selected()?.location?.element, "pointer")

      // go to selected component source code on click
      createEffect(() => {
        if (!inLocatorMode()) return
        makeEventListener(
          window,
          "click",
          preventDefault(stopPropagation(openSelectedComponentSource.bind(null, targetIDE))),
          true,
        )
      })
    }
    return { enabled: inLocatorMode, gatherComponents: inLocatorMode }
  })
}

function attachLocator() {
  const highlightElement = createMemo(
    on(selected, c => (c ? c.location?.element ?? c.element : null)),
  )
  const bounds = createElementBounds(highlightElement)

  return (
    <Portal useShadow>
      <ElementOverlay
        tag={highlightElement()?.tagName.toLocaleLowerCase()}
        selected={!!selected()}
        name={selected()?.name}
        {...bounds}
      />
    </Portal>
  )
}
