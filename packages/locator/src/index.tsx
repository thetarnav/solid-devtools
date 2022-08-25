import {
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  on,
  mergeProps,
  getOwner,
  runWithOwner,
  Accessor,
} from "solid-js"
import { createElementBounds } from "@solid-primitives/bounds"
import { makeEventListener } from "@solid-primitives/event-listener"
import { createKeyHold, KbdKey } from "@solid-primitives/keyboard"
import { remove } from "@solid-primitives/immutable"
import { registerDebuggerPlugin, createInternalRoot } from "@solid-devtools/debugger"
import { createElementCursor } from "@solid-devtools/shared/cursor"
import { createConsumers, createDerivedSignal } from "@solid-devtools/shared/primitives"
import { Mapped } from "@solid-devtools/shared/graph"
import { clearFindComponentCache, findComponent } from "./findComponent"
import { makeHoverElementListener } from "./hoverElement"
import {
  getFullSourceCodeData,
  openSourceCode,
  SourceCodeData,
  TargetIDE,
  TargetURLFunction,
} from "./goToSource"
import { attachElementOverlay } from "./ElementOverlay"
import { onRootCleanup } from "@solid-primitives/utils"

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

export type ClickMiddleware = (e: MouseEvent, data: SourceCodeData | null) => false | void

const exports = createInternalRoot(() => {
  const [enabled, addConsumer] = createConsumers()
  const [selected, setSelectedSource] = createDerivedSignal<SelectedComponent | null>(null)
  const [targetElement, setTargetElement] = createSignal<HTMLElement | null>(null)

  registerDebuggerPlugin(({ components }) => {
    createComputed(() => {
      if (!enabled()) return
      // defferred computed inside of computed
      // this is to prevent calculating selected with old components array
      // data flow: enable inLocatorMode() -> trigger computed -> components() updated -> trigger memo
      let init = true
      let prevComponents: Mapped.Component[] = []
      setSelectedSource(
        createMemo<SelectedComponent | null>(() => {
          const [componentRefs, targetRefs] = [components(), targetElement()]
          if (init) return (init = false) || null
          if (prevComponents !== componentRefs) {
            clearFindComponentCache()
            prevComponents = componentRefs
          }
          return findComponent(componentRefs, targetRefs)
        }),
      )
    })

    return { enabled, gatherComponents: enabled }
  })

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

  const clickInterceptors: ClickMiddleware[] = []
  function runClickInterceptors(e: MouseEvent, data: SourceCodeData | null) {
    for (const interceptor of clickInterceptors) {
      const result = interceptor(e, data)
      if (result === false) return false
    }
  }

  function registerLocatorPlugin(data: { enabled: Accessor<boolean>; onClick: ClickMiddleware }): {
    selected: Accessor<SelectedComponent | null>
  } {
    const { enabled, onClick } = data
    addConsumer(enabled)
    clickInterceptors.push(onClick)
    onRootCleanup(() => remove(clickInterceptors, onClick))
    return { selected }
  }

  function useLocator(options: LocatorOptions): void {
    const { targetIDE = false, key = "Alt" } = options

    const isHoldingKey = createKeyHold(key, { preventDefault: true })
    addConsumer(isHoldingKey)

    makeHoverElementListener(setTargetElement)

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
            if (!comp) return
            const sourceCodeData = comp.location ? getFullSourceCodeData(comp.location) : null
            if (runClickInterceptors(e, sourceCodeData) === false || !sourceCodeData) return
            e.preventDefault()
            e.stopPropagation()
            openSourceCode(targetIDE, sourceCodeData)
          },
          true,
        )
      })
    }
  }

  const owner = getOwner()!
  return {
    useLocator: (opts: LocatorOptions) => runWithOwner(owner, useLocator.bind(void 0, opts)),
    registerLocatorPlugin,
  }
})
export const { useLocator, registerLocatorPlugin } = exports
