import { Component, createEffect, createSignal, onCleanup } from 'solid-js'
import { isServer, Portal } from 'solid-js/web'
import { Controller, Devtools } from '@solid-devtools/frontend'
import { useDebugger, enableRootsAutoattach, PluginData } from '@solid-devtools/debugger'
import styles from '@solid-devtools/frontend/dist/index.css'
import { createInternalRoot } from '@solid-devtools/debugger'

let debuggerData: PluginData

const [mounted, setMounted] = createSignal(false)

if (!isServer) {
  enableRootsAutoattach()

  debuggerData = useDebugger({
    enabled: mounted,
  })
}

export const Overlay: Component<{}> = props => {
  if (isServer) return ''

  setMounted(true)
  onCleanup(() => setMounted(false))

  let dispose!: VoidFunction

  setTimeout(() =>
    createInternalRoot(_dispose => {
      dispose = _dispose

      const {
        forceTriggerUpdate,
        findComponent,
        listenTo,
        inspectedDetails,
        getElementById,
        setInspectedNode,
        setInspectedSignal,
        setInspectedProp,
        setInspectedValue,
      } = debuggerData

      const controller = new Controller({
        onExtLocatorEnabledChange(enabled) {
          console.log(enabled)
        },
        onHighlightElementChange(data) {
          console.log(data)
        },
        onInspectedNodeChange(data) {
          queueMicrotask(() => {
            setInspectedNode(data)
          })
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
        if (details)
          queueMicrotask(() => {
            controller.setInspectedDetails(details)
          })
      })

      return (
        <Portal useShadow>
          <style>{styles}</style>
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '0',
              right: '0',
              bottom: '0',
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
