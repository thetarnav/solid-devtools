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
import { registerDebuggerPlugin, createInternalRoot } from "@solid-devtools/debugger"
import { createConsumers } from "@solid-devtools/shared/primitives"
import { Mapped } from "@solid-devtools/shared/graph"
import { warn } from "@solid-devtools/shared/utils"
import { findComponent, getLocationFromElement, SelectedComponent } from "./findComponent"
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
export type { SelectedComponent } from "./findComponent"

export type LocatorOptions = {
  /** Choose in which IDE the component source code should be revealed. */
  targetIDE?: false | TargetIDE | TargetURLFunction
  /** Holding which key should enable the locator overlay? */
  key?: KbdKey
}

export type ClickMiddleware = (
  e: MouseEvent,
  component: SelectedComponent,
  data: SourceCodeData | null,
) => false | void

const exported = createInternalRoot(() => {
  const [enabled, addConsumer] = createConsumers()
  const [target, setTarget] = createSignal<HTMLElement | Mapped.Component | null>(null)

  let componentList!: Accessor<Mapped.Component[]>
  registerDebuggerPlugin(data => {
    componentList = data.componentList
    return { enabled, gatherComponents: enabled }
  })

  // TODO: selected is an array, but it still only selects only one component at a time — only elements with location should be stored as array
  // TODO: also, rename to "hovered" — to not confuse with selected owners in the extension
  const selected = (() => {
    let init = true
    return createMemo<SelectedComponent[]>(() => {
      if (!enabled()) {
        // defferred memo is to prevent calculating selected with old components array
        init = true
        return []
      }
      const [components, targetRef] = [componentList(), target()]
      if (init) return (init = false) || []
      if (!targetRef) return []
      if (targetRef instanceof HTMLElement) {
        const comp = findComponent(components, targetRef)
        return comp ? [comp] : []
      }
      const { name, resolved, id } = targetRef
      const resolvedArr = Array.isArray(resolved) ? resolved : [resolved]
      return resolvedArr.map(element => {
        return { id, element, name, location: getLocationFromElement(element) }
      })
    })
  })()

  attachElementOverlay(selected)

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
          const comp = selected().find(({ element }) => target.contains(element))
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
    useLocator: (opts: LocatorOptions) => runWithOwner(owner, useLocator.bind(void 0, opts)),
    registerPlugin,
    setTarget,
    selected,
  }
})
export const { useLocator, registerPlugin, setTarget, selected } = exported
