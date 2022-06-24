import { createEffect, createSignal, onCleanup } from "solid-js"
import { registerDebuggerPlugin, PluginFactory } from "@solid-devtools/debugger"
import {
	MESSAGE,
	onWindowMessage,
	postWindowMessage,
	startListeningWindowMessages,
} from "@shared/messanger"
import type { SerialisedTreeRoot } from "@shared/graph"
import { getArrayDiffById } from "./handleDiffArray"

startListeningWindowMessages()

const extensionAdapterFactory: PluginFactory = ({
	forceTriggerUpdate,
	serialisedRoots,
	makeBatchUpdateListener,
}) => {
	const [enabled, setEnabled] = createSignal(false)

	postWindowMessage(MESSAGE.SolidOnPage)

	// update the graph only if the devtools panel is in view
	onCleanup(onWindowMessage(MESSAGE.PanelVisibility, setEnabled))
	onCleanup(onWindowMessage(MESSAGE.ForceUpdate, forceTriggerUpdate))

	// diff the roots array, and send only the changed roots (edited, deleted, added)
	createEffect((prev: SerialisedTreeRoot[]) => {
		const _roots = serialisedRoots()
		const diff = getArrayDiffById(prev, _roots)
		postWindowMessage(MESSAGE.GraphUpdate, diff)
		return _roots
	}, [])

	makeBatchUpdateListener(updates => postWindowMessage(MESSAGE.BatchedUpdate, updates))

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
