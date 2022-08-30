import {
  createEffect,
  createMemo,
  createSignal,
  getOwner,
  runWithOwner,
  Accessor,
  onCleanup,
} from "solid-js"
import { makeEventListener } from "@solid-primitives/event-listener"
import { createKeyHold, KbdKey } from "@solid-primitives/keyboard"
import { remove } from "@solid-primitives/immutable"
import { onRootCleanup } from "@solid-primitives/utils"
import {
  registerDebuggerPlugin,
  createInternalRoot,
  PluginFactoryData,
} from "@solid-devtools/debugger"
import { createConsumers } from "@solid-devtools/shared/primitives"
import { Mapped, NodeID } from "@solid-devtools/shared/graph"
import { warn } from "@solid-devtools/shared/utils"
import { findComponent, getLocationFromElement, HoveredComponent } from "./findComponent"
import { makeHoverElementListener } from "./hoverElement"
import {
  getFullSourceCodeData,
  openSourceCode,
  SourceCodeData,
  TargetIDE,
  TargetURLFunction,
} from "./goToSource"
import { attachElementOverlay } from "./ElementOverlay"

export type { TargetIDE, TargetURLFunction } from "./goToSource"
export type { HoveredComponent } from "./findComponent"

export type LocatorOptions = {
  /** Choose in which IDE the component source code should be revealed. */
  targetIDE?: false | TargetIDE | TargetURLFunction
  /** Holding which key should enable the locator overlay? */
  key?: KbdKey
}

export type ClickMiddleware = (
  e: MouseEvent,
  component: HoveredComponent,
  data: SourceCodeData | null,
) => false | void

export type TargetComponent = Mapped.Component & { rootId: NodeID }

const exported = createInternalRoot(() => {
  const [enabled, addConsumer] = createConsumers()
  const [target, setTarget] = createSignal<HTMLElement | TargetComponent | null>(null)

  let components!: PluginFactoryData["components"]
  registerDebuggerPlugin(data => {
    components = data.components
    return { enabled, gatherComponents: enabled }
  })

  // TODO: selected is an array, but it still only selects only one component at a time — only elements with location should be stored as array
  const hoveredComponents = (() => {
    let init = true
    return createMemo<HoveredComponent[]>(() => {
      if (!enabled()) {
        // defferred memo is to prevent calculating selected with old components array
        init = true
        return []
      }
      const [componentRefs, targetRef] = [components(), target()]
      if (init) return (init = false) || []
      if (!targetRef) return []
      // target is an element
      if (targetRef instanceof HTMLElement) {
        const comp = findComponent(componentRefs, targetRef)
        return comp ? [comp] : []
      }
      // target is a component
      const { element } = targetRef
      const resolvedArr = Array.isArray(element) ? element : [element]
      return resolvedArr.map(element => {
        return { ...targetRef, element, location: getLocationFromElement(element) }
      })
    })
  })()

  attachElementOverlay(hoveredComponents)

  const clickInterceptors: ClickMiddleware[] = []
  function runClickInterceptors(...args: Parameters<ClickMiddleware>) {
    for (const interceptor of clickInterceptors) {
      if (interceptor(...args) === false) return false
    }
  }

  /**
   * Adds a middleware that controlls the locator behavior.
   */
  function registerPlugin(data: { enabled: Accessor<boolean>; onClick?: ClickMiddleware }): void {
    const { enabled, onClick } = data
    addConsumer(enabled)
    if (onClick) {
      clickInterceptors.push(onClick)
      onRootCleanup(() => remove(clickInterceptors, onClick))
    }
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
      makeHoverElementListener(el => setTarget((lastTarget = el)))
      onCleanup(() => setTarget(p => (lastTarget === p ? null : p)))
    })

    // go to selected component source code on click
    createEffect(() => {
      if (!isHoldingKey()) return
      makeEventListener(
        window,
        "click",
        e => {
          const { target } = e
          if (!(target instanceof HTMLElement)) return
          const comp = hoveredComponents().find(({ element }) => target.contains(element))
          if (!comp) return
          const sourceCodeData = comp.location
            ? getFullSourceCodeData(comp.location, comp.element)
            : null
          if (runClickInterceptors(e, comp, sourceCodeData) === false || !sourceCodeData) return
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
    useLocator: (opts: LocatorOptions = {}) => runWithOwner(owner, useLocator.bind(void 0, opts)),
    registerPlugin,
    setTarget,
    hoveredComponents,
  }
})
export const { useLocator, registerPlugin, setTarget, hoveredComponents } = exported
