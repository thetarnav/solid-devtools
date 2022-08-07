import { createEffect, createSignal, onCleanup } from "solid-js"
import { registerDebuggerPlugin, PluginFactory, getSafeValue } from "@solid-devtools/debugger"
import {
  BatchedUpdate,
  onWindowMessage,
  postWindowMessage,
  startListeningWindowMessages,
  UpdateType,
} from "@solid-devtools/shared/bridge"
import type { SerialisedTreeRoot } from "@solid-devtools/shared/graph"
import { getArrayDiffById } from "@solid-devtools/shared/diff"

startListeningWindowMessages()

const extensionAdapterFactory: PluginFactory = ({
  forceTriggerUpdate,
  serialisedRoots,
  makeBatchUpdateListener,
}) => {
  const [enabled, setEnabled] = createSignal(false)

  postWindowMessage("SolidOnPage")

  // update the graph only if the devtools panel is in view
  onCleanup(onWindowMessage("PanelVisibility", setEnabled))
  onCleanup(onWindowMessage("ForceUpdate", forceTriggerUpdate))

  // diff the roots array, and send only the changed roots (edited, deleted, added)
  createEffect((prev: SerialisedTreeRoot[]) => {
    const _roots = serialisedRoots()
    const diff = getArrayDiffById(prev, _roots)
    postWindowMessage("GraphUpdate", diff)
    return _roots
  }, [])

  makeBatchUpdateListener(updates => {
    // serialize the updates and send them to the devtools panel
    const safeUpdates = updates.map(({ type, payload }) => ({
      type,
      payload:
        type === UpdateType.Computation
          ? payload
          : {
              id: payload.id,
              value: getSafeValue(payload.value),
              oldValue: getSafeValue(payload.oldValue),
            },
    })) as BatchedUpdate[]
    postWindowMessage("BatchedUpdate", safeUpdates)
  })

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
      trackSignals: enabled,
      trackBatchedUpdates: enabled,
    }
  })
}
