import { Controller, createController } from '@solid-devtools/frontend'
import { Debugger, once } from 'solid-devtools/bridge'
import { createPortMessanger, PANEL_CONNECTION_NAME } from './messanger'

const port = chrome.runtime.connect({ name: PANEL_CONNECTION_NAME })
const { postPortMessage: toBackground, onPortMessage: fromBackground } = createPortMessanger<
  Debugger.OutputChannels,
  Debugger.InputChannels
>(port)

export default function createBridge({
  setVersions,
}: {
  setVersions: (versions: { client: string; expectedClient: string; extension: string }) => void
}): Controller {
  // in development — force update the graph on load to work with hot reloading
  if (import.meta.env.DEV) {
    toBackground('ForceUpdate')
  }

  once(fromBackground, 'Versions', v => setVersions(v))

  const controller = createController()

  controller.devtools.listen(e => toBackground(e.name, e.details))

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  fromBackground(e => controller.client.emit(e.name as any, e.details))

  return controller
}
