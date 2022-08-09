import { createEffect, createSignal } from "solid-js"
import { registerDebuggerPlugin, PluginFactory, getSafeValue } from "@solid-devtools/debugger"
import {
  BatchedUpdate,
  onWindowMessage,
  postWindowMessage,
  startListeningWindowMessages,
  UpdateType,
} from "@solid-devtools/shared/bridge"

startListeningWindowMessages()

const extensionAdapterFactory: PluginFactory = ({
  forceTriggerUpdate,
  rootsUpdates,
  makeBatchUpdateListener,
  setFocusedOwner,
}) => {
  const [enabled, setEnabled] = createSignal(false)

  postWindowMessage("SolidOnPage")

  // update the graph only if the devtools panel is in view
  onWindowMessage("PanelVisibility", setEnabled)
  onWindowMessage("ForceUpdate", forceTriggerUpdate)
  onWindowMessage("SetFocusedOwner", setFocusedOwner)

  // diff the roots, and send only the changed roots (edited, deleted, added)
  createEffect(() => {
    postWindowMessage("GraphUpdate", rootsUpdates())
  })

  // makeBatchUpdateListener(updates => {
  //   // serialize the updates and send them to the devtools panel
  //   const safeUpdates = updates.map(({ type, payload }) => ({
  //     type,
  //     payload:
  //       type === UpdateType.Computation
  //         ? payload
  //         : {
  //             id: payload.id,
  //             value: getSafeValue(payload.value),
  //             oldValue: getSafeValue(payload.oldValue),
  //           },
  //   })) as BatchedUpdate[]
  //   postWindowMessage("BatchedUpdate", safeUpdates)
  // })

  return { enabled }
}

/**
 * Registers the extension adapter with the debugger.
 */
export function useExtensionAdapter() {
  registerDebuggerPlugin(data => {
    const { enabled } = extensionAdapterFactory(data)
    return {
      enabled,
      observeComputations: enabled,
    }
  })
}
