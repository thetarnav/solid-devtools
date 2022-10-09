import { Controller } from '@solid-devtools/frontend'
import { once } from '@solid-devtools/shared/bridge'
import { createRuntimeMessanger } from '../shared/messanger'

export default function createBridge({
  setVersions,
}: {
  setVersions: (versions: { client: string; expectedClient: string; extension: string }) => void
}) {
  const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

  // in development — force update the graph on load to work with hot reloading
  if (import.meta.env.DEV) {
    postRuntimeMessage('ForceUpdate')
  }

  postRuntimeMessage('DevtoolsPanelConnected')

  once(onRuntimeMessage, 'Versions', v => setVersions(v))

  const controller = new Controller({
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

  return controller
}
