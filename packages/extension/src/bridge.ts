import { Controller } from '@solid-devtools/frontend'
import { createPortMessanger, PANEL_CONNECTION_NAME } from './messanger'
import { Messages, once } from 'solid-devtools/bridge'

const port = chrome.runtime.connect({ name: PANEL_CONNECTION_NAME })
const { postPortMessage: toBackground, onPortMessage: fromBackground } = createPortMessanger<
  Messages.Client,
  Messages.Extension
>(port)

export default function createBridge({
  setVersions,
}: {
  setVersions: (versions: { client: string; expectedClient: string; extension: string }) => void
}) {
  // in development — force update the graph on load to work with hot reloading
  if (import.meta.env.DEV) {
    toBackground('ForceUpdate')
  }

  once(fromBackground, 'Versions', v => setVersions(v))

  const controller = new Controller({
    onDevtoolsLocatorStateChange(enabled) {
      toBackground('LocatorMode', enabled)
    },
    onHighlightElementChange(data) {
      toBackground('HighlightElement', data)
    },
    onInspectValue(payload) {
      toBackground('InspectValue', payload)
    },
    onInspectNode(node) {
      toBackground('InspectNode', node)
    },
    onOpenLocation() {
      toBackground('OpenLocation')
    },
  })

  fromBackground('StructureUpdate', controller.updateStructure.bind(controller))

  fromBackground('ResetPanel', controller.resetPanel.bind(controller))

  fromBackground('ComputationUpdates', controller.updateComputation.bind(controller))

  fromBackground('InspectedDetails', controller.setInspectedDetails.bind(controller))

  fromBackground('InspectorUpdate', controller.updateInspector.bind(controller))

  fromBackground('LocatorMode', controller.setLocatorState.bind(controller))

  fromBackground('HoverComponent', controller.setHoveredNode.bind(controller))

  fromBackground('ClientInspectedNode', controller.setInspectedNode.bind(controller))

  return controller
}
