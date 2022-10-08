import { createRuntimeMessanger } from '../shared/messanger'
import { Controller } from '@solid-devtools/frontend'

export const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

// in development — force update the graph on load to work with hot reloading
if (import.meta.env.DEV) {
  postRuntimeMessage('ForceUpdate')
}

postRuntimeMessage('DevtoolsPanelConnected')

// once(onRuntimeMessage, 'Versions', v => setVersions(v))

export const controller = new Controller({
  onExtLocatorEnabledChange(enabled) {
    postRuntimeMessage('ExtLocatorMode', enabled)
  },
  onHighlightElementChange(data) {
    postRuntimeMessage('HighlightElement', data)
  },
  onInspectedNodeChange(data) {
    postRuntimeMessage('InspectedNodeChange', data)
  },
  onInspectValue(data) {
    postRuntimeMessage('ToggleInspectedValue', data)
  },
})

onRuntimeMessage('StructureUpdate', controller.updateStructure.bind(controller))

onRuntimeMessage('ResetPanel', controller.resetPanel.bind(controller))

onRuntimeMessage('ComputationUpdates', controller.updateComputation.bind(controller))

onRuntimeMessage('SetInspectedDetails', controller.setInspectedDetails.bind(controller))

onRuntimeMessage('SignalUpdates', controller.updateSignals.bind(controller))

onRuntimeMessage('PropsUpdate', controller.updateProps.bind(controller))

onRuntimeMessage('ValueUpdate', controller.updateValue.bind(controller))

onRuntimeMessage('ClientLocatorMode', controller.setLocatorState.bind(controller))

onRuntimeMessage('ClientHoveredNodeChange', controller.setHoveredNode.bind(controller))

onRuntimeMessage('ClientInspectedNode', controller.setSelectedNode.bind(controller))

// let initHighlight = true
// // toggle hovered html element
// createEffect<Messages['HighlightElement'] | undefined>(prev => {
//   // tracks
//   const hovered = structure.hovered()
//   const elId = inspector.hoveredElement()

//   return untrack(() => {
//     // skip initial value
//     if (initHighlight) return (initHighlight = false) || undefined

//     // handle component
//     if (hovered && hovered.type === NodeType.Component) {
//       if (
//         // if the hovered component is the same as the last one
//         (prev && typeof prev === 'object' && prev.nodeId === hovered.id) ||
//         // ignore state that came from the client
//         hovered.id === locator.clientHoveredId()
//       )
//         return prev

//       const rootId = structure.getParentRoot(hovered).id
//       const payload = { rootId, nodeId: hovered.id }
//       postRuntimeMessage('HighlightElement', payload)
//       return payload
//     }
//     // handle element
//     if (elId) {
//       // do not send the same message twice
//       if (typeof prev === 'string' && prev === elId) return prev
//       postRuntimeMessage('HighlightElement', elId)
//       return elId
//     }
//     // no element or component
//     if (prev) postRuntimeMessage('HighlightElement', null)
//   })
// })
