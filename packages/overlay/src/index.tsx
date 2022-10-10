import { Component, createEffect, createSignal, on, onCleanup } from 'solid-js'
import { isServer, Portal } from 'solid-js/web'
import { Controller, Devtools } from '@solid-devtools/frontend'
import { useDebugger, enableRootsAutoattach, PluginData } from '@solid-devtools/debugger'
import styles from '@solid-devtools/frontend/dist/index.css'
import { createInternalRoot } from '@solid-devtools/debugger'
import * as locator from '@solid-devtools/locator'
import { Messages } from '@solid-devtools/shared/bridge'

let debuggerData: PluginData

const [mounted, setMounted] = createSignal(false)
locator.addHighlightingSource(mounted)

if (!isServer) {
  enableRootsAutoattach()

  debuggerData = useDebugger({
    enabled: mounted,
  })
}

export const Overlay: Component<{}> = props => {
  if (isServer) return ''

  setMounted(true)
  let dispose: VoidFunction | undefined
  onCleanup(() => {
    setMounted(false)
    dispose?.()
  })

  setTimeout(() =>
    createInternalRoot(_dispose => {
      dispose = _dispose

      const {
        findComponent,
        listenTo,
        inspectedDetails,
        getElementById,
        setInspectedNode,
        setInspectedSignal,
        setInspectedProp,
        setInspectedValue,
      } = debuggerData

      const [devtoolsLocatorEnabled, setDevtoolsLocatorState] = createSignal(false)
      locator.addLocatorModeSource(devtoolsLocatorEnabled)

      const controller = new Controller({
        onExtLocatorEnabledChange(enabled) {
          queueMicrotask(() => setDevtoolsLocatorState(enabled))
        },
        onHighlightElementChange(data) {
          queueMicrotask(() => handleDevtoolsHoveredElement(data))
        },
        onInspectedNodeChange(data) {
          queueMicrotask(() => setInspectedNode(data))
        },
        onInspectValue(data) {
          queueMicrotask(() => {
            if (data.type === 'signal') {
              const { id, selected } = data
              const value = setInspectedSignal(id, selected)
              if (value) controller.updateSignals({ signals: [{ id, value }], update: false })
            } else if (data.type === 'prop') {
              const { id, selected } = data
              setInspectedProp(id, selected)
            } else {
              setInspectedValue(data.selected)
            }
          })
        },
      })

      listenTo('StructureUpdates', updates =>
        queueMicrotask(() => controller.updateStructure(updates)),
      )

      listenTo('ComputationUpdates', updates =>
        queueMicrotask(() => controller.updateComputation(updates)),
      )

      listenTo('SignalUpdates', updates =>
        queueMicrotask(() => {
          controller.updateSignals({ signals: updates, update: true })
        }),
      )

      listenTo('PropsUpdate', updates => queueMicrotask(() => controller.updateProps(updates)))

      listenTo('ValueUpdate', ({ value, update }) =>
        queueMicrotask(() => {
          controller.updateValue({ value, update })
        }),
      )

      // send the focused owner details
      // TODO: change this to an event emitter
      createEffect(() => {
        const details = inspectedDetails()
        if (details) {
          queueMicrotask(() => controller.setInspectedDetails(details))
        }
      })

      // send the state of the client locator mode
      createEffect(
        on(
          locator.locatorModeEnabled,
          state => queueMicrotask(() => controller.setLocatorState(state)),
          { defer: true },
        ),
      )

      // intercept on-page components clicks and send them to the devtools
      locator.addClickInterceptor((e, component) => {
        e.preventDefault()
        e.stopPropagation()
        queueMicrotask(() => controller.setInspectedNode(component.id))
        return false
      })

      let skipNextHoveredComponent = true
      // listen for op-page components being hovered and send them to the devtools
      createEffect((prev: Messages['ClientHoveredNodeChange'] | undefined | void) => {
        const hovered = locator.highlightedComponent()[0] as locator.HoveredComponent | undefined
        if (skipNextHoveredComponent) {
          skipNextHoveredComponent = false
          return
        }
        let data: Messages['ClientHoveredNodeChange'] | undefined
        if (!hovered) {
          if (prev && prev.state) {
            data = { nodeId: prev.nodeId, state: false }
            queueMicrotask(() => controller.setHoveredNode(data!))
          }
        } else {
          data = { nodeId: hovered.id, state: true }
          queueMicrotask(() => controller.setHoveredNode(data!))
        }
        return data
      })

      function handleDevtoolsHoveredElement(data: Messages['HighlightElement']) {
        if (!data) return locator.setTarget(null)
        let target: locator.TargetComponent | HTMLElement
        // highlight component
        if (typeof data === 'object') {
          const { rootId, nodeId } = data
          const component = findComponent(rootId, nodeId)
          if (!component) return console.warn('No component found', nodeId)
          target = { ...component, rootId }
        }
        // highlight element
        else {
          const element = getElementById(data)
          if (!element) return console.warn('No element found', data)
          target = element
        }
        locator.setTarget(p => {
          if (p === target) return p
          // prevent creating an infinite loop
          skipNextHoveredComponent = true
          return target
        })
      }

      return (
        <Portal useShadow mount={document.documentElement}>
          <style>{styles}</style>
          <div
            style={{
              position: 'fixed',
              inset: '50% 0 0 0',
              'z-index': 999999,
            }}
          >
            <Devtools controller={controller} />
          </div>
        </Portal>
      )
    }),
  )

  return ''
}
