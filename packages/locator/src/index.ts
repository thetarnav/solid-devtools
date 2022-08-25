import {
  createEffect,
  createMemo,
  createSignal,
  on,
  mergeProps,
  getOwner,
  runWithOwner,
  Accessor,
  Setter,
  onCleanup,
} from "solid-js"
import { createElementBounds } from "@solid-primitives/bounds"
import { makeEventListener } from "@solid-primitives/event-listener"
import { createKeyHold, KbdKey } from "@solid-primitives/keyboard"
import { remove } from "@solid-primitives/immutable"
import { onRootCleanup } from "@solid-primitives/utils"
import { registerDebuggerPlugin, createInternalRoot } from "@solid-devtools/debugger"
import { createElementCursor } from "@solid-devtools/shared/cursor"
import { createConsumers } from "@solid-devtools/shared/primitives"
import { Mapped } from "@solid-devtools/shared/graph"
import { warn } from "@solid-devtools/shared/utils"
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

export type SelectedComponent = {
  name: string
  element: HTMLElement
  location: Omit<SourceCodeData, "projectPath"> | null
}

export type { TargetIDE, TargetURLFunction } from "./goToSource"

export type LocatorOptions = {
  /** Choose in which IDE the component source code should be revealed. */
  targetIDE?: false | TargetIDE | TargetURLFunction
  /** Holding which key should enable the locator overlay? */
  key?: KbdKey
}

export type ClickMiddleware = (e: MouseEvent, data: SourceCodeData | null) => false | void

const exports = createInternalRoot(() => {
  const [enabled, addConsumer] = createConsumers()
  const [targetElement, setTargetElement] = createSignal<HTMLElement | null>(null)
  let selected!: Accessor<SelectedComponent | null>

  registerDebuggerPlugin(({ componentList }) => {
    let init = true
    let prevComponents: Mapped.Component[] = []

    selected = createMemo<SelectedComponent | null>(() => {
      if (!enabled()) {
        // defferred memo is to prevent calculating selected with old components array
        ;(init = true), (prevComponents = [])
        return null
      }
      const [componentRefs, targetRefs] = [componentList(), targetElement()]
      if (init) return (init = false) || null
      if (prevComponents !== componentRefs) {
        clearFindComponentCache()
        prevComponents = componentRefs
      }
      return findComponent(componentRefs, targetRefs)
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
      if (interceptor(e, data) === false) return false
    }
  }

  /**
   * Adds a middleware that controlls the locator behavior.
   */
  function registerLocatorPlugin(data: { enabled: Accessor<boolean>; onClick?: ClickMiddleware }): {
    selected: Accessor<SelectedComponent | null>
    setTargetElement: Setter<HTMLElement | null>
  } {
    const { enabled, onClick } = data
    addConsumer(enabled)
    if (onClick) {
      clickInterceptors.push(onClick)
      onRootCleanup(() => remove(clickInterceptors, onClick))
    }
    return { selected, setTargetElement }
  }

  let locatorUsed = false
  /**
   * User function to enable user locator features. Such as element hover and go to source.
   *
   * Can bu used only once.
   *
   * @param options {@link LocatorOptions} for the locator.
   */
  function useLocator(options: LocatorOptions): void {
    if (locatorUsed) return warn("useLocator can be used called once.")
    locatorUsed = true
    const { targetIDE = false, key = "Alt" } = options

    const isHoldingKey = createKeyHold(key, { preventDefault: true })
    addConsumer(isHoldingKey)

    createEffect(() => {
      if (!isHoldingKey()) return
      let lastTarget: HTMLElement | null = null
      makeHoverElementListener(el => setTargetElement((lastTarget = el)))
      onCleanup(() => setTargetElement(p => (lastTarget === p ? null : p)))
    })

    // set pointer cursor to selected component
    createElementCursor(() => isHoldingKey() && selected()?.location?.element, "pointer")

    // go to selected component source code on click
    createEffect(() => {
      if (!isHoldingKey()) return
      makeEventListener(
        window,
        "click",
        e => {
          const comp = selected()
          if (!comp) return
          const sourceCodeData = comp.location ? getFullSourceCodeData(comp.location) : null
          if (runClickInterceptors(e, sourceCodeData) === false || !sourceCodeData) return
          if (!targetIDE) return
          e.preventDefault()
          e.stopPropagation()
          openSourceCode(targetIDE, sourceCodeData)
        },
        true,
      )
    })
  }

  const owner = getOwner()!
  return {
    useLocator: (opts: LocatorOptions) => runWithOwner(owner, useLocator.bind(void 0, opts)),
    registerLocatorPlugin,
  }
})
export const { useLocator, registerLocatorPlugin } = exports
