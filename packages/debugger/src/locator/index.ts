import { createEffect, createMemo, onCleanup, Accessor, getOwner, runWithOwner } from 'solid-js'
import { makeEventListener } from '@solid-primitives/event-listener'
import { createKeyHold, KbdKey } from '@solid-primitives/keyboard'
import { onRootCleanup } from '@solid-primitives/utils'
import { createSimpleEmitter } from '@solid-primitives/event-bus'
import { atom, defer, makeHoverElementListener } from '@solid-devtools/shared/primitives'
import { warn } from '@solid-devtools/shared/utils'
import { findLocatorComponent, getLocationFromElement, LocatorComponent } from './findComponent'
import {
  getFullSourceCodeData,
  openSourceCode,
  SourceCodeData,
  TargetIDE,
  TargetURLFunction,
} from './goToSource'
import { createInternalRoot } from '../main/utils'
import { enableRootsAutoattach } from '../main/roots'
import { attachElementOverlay } from './ElementOverlay'
import { Mapped, NodeID } from '../types'

export type { TargetIDE, TargetURLFunction } from './goToSource'
export type { LocatorComponent } from './findComponent'

export type LocatorOptions = {
  /** Choose in which IDE the component source code should be revealed. */
  targetIDE?: false | TargetIDE | TargetURLFunction
  /** Holding which key should enable the locator overlay? */
  key?: KbdKey
}

export type HighlightElementPayload =
  | { rootId: NodeID; nodeId: NodeID }
  | { elementId: string }
  | null

export type ClickMiddleware = (
  e: MouseEvent,
  component: LocatorComponent,
  data: SourceCodeData | null,
) => false | void

export { markComponentLoc } from './markComponent'

export function createLocator({
  components,
  debuggerEnabled,
  findComponent,
  getElementById,
  setLocatorEnabledSignal,
}: {
  components: Accessor<Record<NodeID, Mapped.ResolvedComponent[]>>
  debuggerEnabled: Accessor<boolean>
  findComponent(rootId: NodeID, nodeId: NodeID): Mapped.ResolvedComponent | undefined
  getElementById(id: string): HTMLElement | undefined
  setLocatorEnabledSignal(signal: Accessor<boolean>): void
}) {
  // enables capturing hovered elements
  const enabledByPlugin = atom(false)
  const enabledByPressingSignal = atom<Accessor<boolean>>()
  const enabledByPressing = createMemo(() => !!enabledByPressingSignal()?.())
  setLocatorEnabledSignal(enabledByPressing)
  // locator is enabled if debugger is enabled, and user pressed the key to activate it, or the plugin activated it
  const locatorEnabled = createMemo(
    () => debuggerEnabled() && (enabledByPressing() || enabledByPlugin()),
  )

  function togglePluginLocatorMode(state?: boolean) {
    enabledByPlugin(p => state ?? !p)
  }

  const hoverTarget = atom<HTMLElement | null>(null)
  const pluginTarget = atom<HTMLElement | (Mapped.ResolvedComponent & { rootId: NodeID }) | null>(
    null,
  )

  // TODO: selected is an array, but it still only selects only one component at a time — only elements with location should be stored as array
  const highlightedComponents = createMemo<LocatorComponent[]>(
    defer(
      [components, () => hoverTarget() ?? pluginTarget()],
      ([components, target]) => {
        if (!target) return []
        // target is an element
        if (target instanceof HTMLElement) {
          const comp = findLocatorComponent(components, target)
          return comp ? [comp] : []
        }
        // target is a component
        const { element } = target
        const resolvedArr = Array.isArray(element) ? element : [element]
        return resolvedArr.map(element => {
          return { ...target, element, location: getLocationFromElement(element) }
        })
      },
      [],
    ),
  )

  // wait a second to let the framework mess with the document before attaching the overlay
  setTimeout(() => {
    createInternalRoot(() => attachElementOverlay(highlightedComponents))
  }, 1000)

  const [onDebuggerHoveredComponentChange, emitDebuggerHoveredComponentChange] =
    createSimpleEmitter<{ nodeId: NodeID; state: boolean }>()

  // notify of component hovered by using the debugger
  createEffect((prev: NodeID | undefined) => {
    const target = hoverTarget()
    if (!target) return
    const comp = findLocatorComponent(components(), target)
    if (prev) emitDebuggerHoveredComponentChange({ nodeId: prev, state: false })
    if (comp) emitDebuggerHoveredComponentChange({ nodeId: comp.id, state: true })
    return comp?.id
  })

  function setPluginHighlightTarget(data: HighlightElementPayload) {
    if (!data) return pluginTarget(null)
    // highlight component
    if ('nodeId' in data) {
      const { rootId, nodeId } = data
      const component = findComponent(rootId, nodeId)
      component && pluginTarget({ ...component, rootId })
    }
    // highlight element
    else {
      const element = getElementById(data.elementId)
      if (!element) return warn('No element found', data)
      pluginTarget(element)
    }
  }

  // functions to be called when user clicks on a component
  const clickInterceptors = new Set<ClickMiddleware>()
  function runClickInterceptors(...args: Parameters<ClickMiddleware>) {
    for (const interceptor of clickInterceptors) {
      if (interceptor(...args) === false) return false
    }
  }
  function addClickInterceptor(interceptor: ClickMiddleware) {
    clickInterceptors.add(interceptor)
    onRootCleanup(() => clickInterceptors.delete(interceptor))
  }

  let targetIDE: TargetIDE | TargetURLFunction | undefined

  createEffect(() => {
    if (!locatorEnabled()) return

    // set hovered element as target
    makeHoverElementListener(el => hoverTarget(el))
    onCleanup(() => hoverTarget(null))

    // go to selected component source code on click
    makeEventListener(
      window,
      'click',
      e => {
        const { target } = e
        if (!(target instanceof HTMLElement)) return
        const highlighted = highlightedComponents()
        const comp = highlighted.find(({ element }) => target.contains(element)) ?? highlighted[0]
        if (!comp) return
        const sourceCodeData = comp.location
          ? getFullSourceCodeData(comp.location, comp.element)
          : null
        if (
          runClickInterceptors(e, comp, sourceCodeData) === false ||
          !targetIDE ||
          !sourceCodeData
        ) {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        openSourceCode(targetIDE, sourceCodeData)
      },
      true,
    )
  })

  let locatorUsed = false
  const owner = getOwner()!
  /**
   * User function to enable user locator features. Such as element hover and go to source.
   *
   * Can bu used only once.
   *
   * @param options {@link LocatorOptions} for the locator.
   */
  function useLocator(options: LocatorOptions): void {
    runWithOwner(owner, () => {
      enableRootsAutoattach()
      if (locatorUsed) return warn('useLocator can be used called once.')
      locatorUsed = true
      if (options.targetIDE) targetIDE = options.targetIDE
      const isHoldingKey = createKeyHold(options.key ?? 'Alt', { preventDefault: true })
      enabledByPressingSignal(() => isHoldingKey)
    })
  }

  return {
    useLocator,
    togglePluginLocatorMode,
    enabledByDebugger: enabledByPressing,
    addClickInterceptor,
    setPluginHighlightTarget,
    onDebuggerHoveredComponentChange,
  }
}
