import { createEffect, createMemo, createSignal, getOwner, runWithOwner, onCleanup } from "solid-js"
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
  // enables debugger and highlighting components
  const [highlightingEnabled, addHighlightingSource] = createConsumers()
  // enables capturing hovered elements
  const [locatorModeEnabled, addLocatorModeSource] = createConsumers()
  addHighlightingSource(locatorModeEnabled)
  // const [inLocatorMode, setLocatorMode] = createSignal(false)
  const [target, setTarget] = createSignal<HTMLElement | TargetComponent | null>(null)

  let components!: PluginFactoryData["components"]
  registerDebuggerPlugin(data => {
    components = data.components
    return { enabled: highlightingEnabled, gatherComponents: highlightingEnabled }
  })

  // TODO: selected is an array, but it still only selects only one component at a time — only elements with location should be stored as array
  const highlightedComponent = (() => {
    let init = true
    return createMemo<HoveredComponent[]>(() => {
      if (!highlightingEnabled()) {
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

  attachElementOverlay(highlightedComponent)

  const clickInterceptors: ClickMiddleware[] = []
  function runClickInterceptors(...args: Parameters<ClickMiddleware>) {
    for (const interceptor of clickInterceptors) {
      if (interceptor(...args) === false) return false
    }
  }
  function addClickInterceptor(interceptor: ClickMiddleware) {
    clickInterceptors.push(interceptor)
    onRootCleanup(() => remove(clickInterceptors, interceptor))
  }

  let targetIDE: TargetIDE | TargetURLFunction | undefined

  createEffect(() => {
    if (!locatorModeEnabled()) return

    // set hovered element as target
    let lastTarget: HTMLElement | null = null
    makeHoverElementListener(el => setTarget((lastTarget = el)))
    onCleanup(() => setTarget(p => (lastTarget === p ? null : p)))

    // go to selected component source code on click
    makeEventListener(
      window,
      "click",
      e => {
        const { target } = e
        if (!(target instanceof HTMLElement)) return
        const highlighted = highlightedComponent()
        const comp = highlighted.find(({ element }) => target.contains(element)) ?? highlighted[0]
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
    if (options.targetIDE) targetIDE = options.targetIDE
    const isHoldingKey = createKeyHold(options.key ?? "Alt", { preventDefault: true })
    addLocatorModeSource(isHoldingKey)
  }

  const owner = getOwner()!
  return {
    useLocator: (opts: LocatorOptions = {}) => runWithOwner(owner, useLocator.bind(void 0, opts)),
    setTarget,
    highlightedComponent,
    highlightingEnabled,
    locatorModeEnabled,
    addClickInterceptor,
    addHighlightingSource,
    addLocatorModeSource,
  }
})
export const {
  useLocator,
  setTarget,
  highlightedComponent,
  highlightingEnabled,
  locatorModeEnabled,
  addClickInterceptor,
  addHighlightingSource,
  addLocatorModeSource,
} = exported
