import { makeHoverElementListener } from '@solid-devtools/shared/primitives'
import { warn } from '@solid-devtools/shared/utils'
import { EmitterEmit } from '@solid-primitives/event-bus'
import { makeEventListener } from '@solid-primitives/event-listener'
import { createKeyHold } from '@solid-primitives/keyboard'
import { scheduleIdle } from '@solid-primitives/scheduled'
import { defer } from '@solid-primitives/utils'
import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  getOwner,
  onCleanup,
  runWithOwner,
} from 'solid-js'
import type { Debugger } from '../main'
import * as registry from '../main/component-registry'
import { ObjectType, getObjectById } from '../main/id'
import { createInternalRoot } from '../main/roots'
import SolidAPI from '../main/solid-api'
import { NodeID } from '../main/types'
import { attachElementOverlay } from './ElementOverlay'
import {
  LocationAttr,
  LocatorComponent,
  SourceCodeData,
  TargetIDE,
  TargetURLFunction,
  getLocationAttr,
  getSourceCodeData,
  openSourceCode,
} from './findComponent'
import { HighlightElementPayload, LocatorOptions } from './types'

export function createLocator(props: {
  emit: EmitterEmit<Debugger.OutputChannels>
  locatorEnabled: Accessor<boolean>
  setLocatorEnabledSignal(signal: Accessor<boolean>): void
  onComponentClick(componentId: NodeID, next: VoidFunction): void
}) {
  const [enabledByPressingSignal, setEnabledByPressingSignal] = createSignal((): boolean => false)
  props.setLocatorEnabledSignal(createMemo(() => enabledByPressingSignal()()))

  const [hoverTarget, setHoverTarget] = createSignal<HTMLElement | null>(null)
  const [devtoolsTarget, setDevtoolsTarget] = createSignal<HighlightElementPayload>(null)

  const [highlightedComponents, setHighlightedComponents] = createSignal<LocatorComponent[]>([])

  const calcHighlightedComponents = (
    target: HTMLElement | HighlightElementPayload,
  ): LocatorComponent[] => {
    if (!target) return []

    // target is an elementId
    if ('type' in target && target.type === 'element') {
      const element = getObjectById(target.id, ObjectType.Element)
      if (!(element instanceof HTMLElement)) return []
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

  // wait a second to let the framework mess with the document before attaching the overlay
  setTimeout(() => {
    createInternalRoot(() => attachElementOverlay(highlightedComponents))
  }, 1000)

  // notify of component hovered by using the debugger
  createEffect((prev: NodeID | undefined) => {
    const target = hoverTarget()
    const comp = target && registry.findComponent(target)
    if (prev) props.emit('HoveredComponent', { nodeId: prev, state: false })
    if (comp) {
      const { id } = comp
      props.emit('HoveredComponent', { nodeId: id, state: true })
      return id
    }
  })

  let targetIDE: TargetIDE | TargetURLFunction | undefined

  createEffect(() => {
    if (!props.locatorEnabled()) return

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

        // intercept on-page components clicks and send them to the devtools overlay
        props.onComponentClick(comp.id, () => {
          if (!targetIDE || !sourceCodeData) return
          e.preventDefault()
          e.stopPropagation()
          openSourceCode(targetIDE, sourceCodeData)
        })
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
      if (locatorUsed) return warn('useLocator can be called only once.')
      locatorUsed = true
      if (options.targetIDE) targetIDE = options.targetIDE
      if (options.key !== false) {
        const isHoldingKey = createKeyHold(options.key ?? 'Alt', { preventDefault: true })
        setEnabledByPressingSignal(() => isHoldingKey)
      }
    })
  }

  // Enable the locator when the options were passed by the vite plugin
  if (SolidAPI.locatorOptions) {
    useLocator(SolidAPI.locatorOptions)
  }

  function openElementSourceCode(location: LocationAttr, element: SourceCodeData['element']) {
    if (!targetIDE) return warn('Please set `targetIDE` it in useLocator options.')
    const sourceCodeData = getSourceCodeData(location, element)
    sourceCodeData && openSourceCode(targetIDE, sourceCodeData)
  }

  return {
    useLocator,
    setDevtoolsHighlightTarget: (target: HighlightElementPayload) => void setDevtoolsTarget(target),
    openElementSourceCode,
  }
}
