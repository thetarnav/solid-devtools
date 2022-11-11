import { Controller } from '@solid-devtools/frontend'
import { createRuntimeMessanger } from '../shared/messanger'
import { once } from 'solid-devtools/bridge'

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

  postRuntimeMessage('DevtoolsOpened')

  once(onRuntimeMessage, 'Versions', v => setVersions(v))

  const controller = new Controller({
    onDevtoolsLocatorStateChange(enabled) {
      postRuntimeMessage('ExtLocatorMode', enabled)
    },
    onHighlightElementChange(data) {
      postRuntimeMessage('HighlightElement', data)
    },
    onInspectValue(payload) {
      postRuntimeMessage('ToggleInspectedValue', payload)
    },
    onInspectNode(node) {
      postRuntimeMessage('SetInspectedNode', node)
    },
  })

  onRuntimeMessage('StructureUpdate', controller.updateStructure.bind(controller))

  onRuntimeMessage('ResetPanel', controller.resetPanel.bind(controller))

  onRuntimeMessage('ComputationUpdates', controller.updateComputation.bind(controller))

  onRuntimeMessage('SetInspectedDetails', controller.setInspectedDetails.bind(controller))

  onRuntimeMessage('InspectorUpdate', controller.updateInspector.bind(controller))

  onRuntimeMessage('ClientLocatorMode', controller.setLocatorState.bind(controller))

  onRuntimeMessage('ClientHoveredComponent', controller.setHoveredNode.bind(controller))

  onRuntimeMessage('ClientInspectedNode', controller.setInspectedNode.bind(controller))

  return controller
}
