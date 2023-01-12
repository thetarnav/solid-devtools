import { defer, makeHoverElementListener } from '@solid-devtools/shared/primitives'
import { warn } from '@solid-devtools/shared/utils'
import { createSimpleEmitter } from '@solid-primitives/event-bus'
import { makeEventListener } from '@solid-primitives/event-listener'
import { createKeyHold } from '@solid-primitives/keyboard'
import { scheduleIdle } from '@solid-primitives/scheduled'
import { onRootCleanup } from '@solid-primitives/utils'
import {
  Accessor,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  getOwner,
  onCleanup,
  runWithOwner,
} from 'solid-js'
import * as registry from '../main/componentRegistry'
import { createInternalRoot, enableRootsAutoattach } from '../main/roots'
import { NodeID } from '../main/types'
import { attachElementOverlay } from './ElementOverlay'
import {
  getLocationAttr,
  getSourceCodeData,
  LocationAttr,
  LocatorComponent,
  openSourceCode,
  TargetIDE,
  TargetURLFunction,
} from './findComponent'
import { ClickMiddleware, HighlightElementPayload, LocatorOptions } from './types'

export { markComponentLoc } from './markComponent'

export function createLocator({
  debuggerEnabled,
  getElementById,
  setLocatorEnabledSignal,
}: {
  debuggerEnabled: Accessor<boolean>
  getElementById(id: string): HTMLElement | undefined
  setLocatorEnabledSignal(signal: Accessor<boolean>): void
}) {
  // enables capturing hovered elements
  const [enabledByPlugin, setEnabledByPlugin] = createSignal(false)
  const [enabledByPressingSignal, setEnabledByPressingSignal] = createSignal<Accessor<boolean>>()
  const enabledByPressing = createMemo(() => !!enabledByPressingSignal()?.())
  setLocatorEnabledSignal(enabledByPressing)
  // locator is enabled if debugger is enabled, and user pressed the key to activate it, or the plugin activated it
  const locatorEnabled = createMemo(
    () => debuggerEnabled() && (enabledByPressing() || enabledByPlugin()),
  )

  function togglePluginLocatorMode(state?: boolean) {
    setEnabledByPlugin(p => state ?? !p)
  }

  createComputed(
    defer(debuggerEnabled, enabled => {
      if (!enabled) return
      setEnabledByPlugin(false)
      setDevtoolsTarget(null)
    }),
  )

  const [hoverTarget, setHoverTarget] = createSignal<HTMLElement | null>(null)
  const [devtoolsTarget, setDevtoolsTarget] = createSignal<HighlightElementPayload>(null)

  const [highlightedComponents, setHighlightedComponents] = createSignal<LocatorComponent[]>([])

  const calcHighlightedComponents = (
    target: HTMLElement | HighlightElementPayload,
  ): LocatorComponent[] => {
    if (!target) return []

    // target is an elementId
    if ('type' in target && target.type === 'element') {
      const element = getElementById(target.id)
      if (!element) return []
      target = element
    }

    // target is an element
    if (target instanceof HTMLElement) {
      const comp = registry.findComponent(target)
      if (!comp) return []
      return [
        {
          location: getLocationAttr(target),
          element: target,
          id: comp.id,
          name: comp.name,
        },
      ]
    }

    // target is a component or an element of a component (in DOM walker mode)
    const comp = registry.getComponent(target.id)
    if (!comp) return []
    return comp.elements.map(element => ({
      element,
      id: comp.id,
      name: comp.name,
    }))
  }

  createEffect(
    defer(
      () => hoverTarget() ?? devtoolsTarget(),
      scheduleIdle(target => setHighlightedComponents(() => calcHighlightedComponents(target))),
    ),
  )

  // TODO invalidate when components change

  // components.onComponentsChange(() => {
  //   // TODO
  // })

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
    const comp = registry.findComponent(target)
    if (prev) emitDebuggerHoveredComponentChange({ nodeId: prev, state: false })
    if (comp) {
      const { id } = comp
      emitDebuggerHoveredComponentChange({ nodeId: id, state: true })
      return id
    }
  })

  // functions to be called when user clicks on a component
  const clickInterceptors = new Set<ClickMiddleware>()
  function runClickInterceptors(...[e, c, l]: Parameters<ClickMiddleware>): true | undefined {
    for (const interceptor of clickInterceptors) {
      interceptor(e, c, l)
      if (e.defaultPrevented) return true
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
    makeHoverElementListener(el => setHoverTarget(el))
    onCleanup(() => setHoverTarget(null))

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
        const sourceCodeData = comp.location && getSourceCodeData(comp.location, comp.element)
        if (!runClickInterceptors(e, comp, sourceCodeData) && targetIDE && sourceCodeData) {
          e.preventDefault()
          e.stopPropagation()
          openSourceCode(targetIDE, sourceCodeData)
        }
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
      if (locatorUsed) return warn('useLocator can be called only once.')
      locatorUsed = true
      if (options.targetIDE) targetIDE = options.targetIDE
      if (options.key !== false) {
        const isHoldingKey = createKeyHold(options.key ?? 'Alt', { preventDefault: true })
        setEnabledByPressingSignal(() => isHoldingKey)
      }
    })
  }

  function openElementSourceCode(location: LocationAttr, element: HTMLElement | string) {
    if (!targetIDE) return warn('Please set `targetIDE` it in useLocator options.')
    const sourceCodeData = getSourceCodeData(location, element)
    sourceCodeData && openSourceCode(targetIDE, sourceCodeData)
  }

  return {
    useLocator,
    togglePluginLocatorMode,
    enabledByDebugger: enabledByPressing,
    addClickInterceptor,
    setDevtoolsHighlightTarget: (target: HighlightElementPayload) => void setDevtoolsTarget(target),
    onDebuggerHoveredComponentChange,
    openElementSourceCode,
  }
}
