import { Accessor, createEffect, createSignal, onCleanup } from "solid-js"
import {
	MESSAGE,
	onWindowMessage,
	postWindowMessage,
	startListeningWindowMessages,
} from "@shared/messanger"
import type { SerialisedTreeRoot, BatchUpdateListener } from "@shared/graph"
import { getArrayDiffById } from "./handleDiffArray"

startListeningWindowMessages()

export function useExtensionAdapter({
	forceTriggerUpdate,
	roots,
	makeBatchUpdateListener,
}: {
	forceTriggerUpdate: VoidFunction
	makeBatchUpdateListener: (listener: BatchUpdateListener) => VoidFunction
	roots: Accessor<SerialisedTreeRoot[]>
}): { enabled: Accessor<boolean> } {
	const [enabled, setEnabled] = createSignal(false)

	postWindowMessage(MESSAGE.SolidOnPage)

	// update the graph only if the devtools panel is in view
	onCleanup(onWindowMessage(MESSAGE.PanelVisibility, setEnabled))
	onCleanup(onWindowMessage(MESSAGE.ForceUpdate, forceTriggerUpdate))

	// diff the roots array, and send only the changed roots (edited, deleted, added)
	createEffect((prev: SerialisedTreeRoot[]) => {
		const _roots = roots()
		const diff = getArrayDiffById(prev, _roots)
		postWindowMessage(MESSAGE.GraphUpdate, diff)
		return _roots
	}, [])

	makeBatchUpdateListener(updates => postWindowMessage(MESSAGE.BatchedUpdate, updates))

	return { enabled }
}
