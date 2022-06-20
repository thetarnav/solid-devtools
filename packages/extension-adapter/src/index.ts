import { Accessor, createEffect, createSignal, onCleanup } from "solid-js"
import {
	MESSAGE,
	onWindowMessage,
	postWindowMessage,
	startListeningWindowMessages,
} from "@shared/messanger"
import type { MappedRoot, BatchUpdateListener, MappedOwner } from "@shared/graph"

startListeningWindowMessages()

export function useExtensionAdapter({
	forceTriggerUpdate,
	roots,
	makeBatchUpdateListener,
}: {
	forceTriggerUpdate: VoidFunction
	makeBatchUpdateListener: (listener: BatchUpdateListener) => VoidFunction
	roots: Accessor<MappedRoot[]>
}): { enabled: Accessor<boolean> } {
	const [enabled, setEnabled] = createSignal(false)

	postWindowMessage(MESSAGE.SolidOnPage)

	// update the graph only if the devtools panel is in view
	onCleanup(onWindowMessage(MESSAGE.PanelVisibility, setEnabled))
	onCleanup(onWindowMessage(MESSAGE.ForceUpdate, forceTriggerUpdate))

	createEffect(() => postWindowMessage(MESSAGE.GraphUpdate, roots()))

	makeBatchUpdateListener(updates => postWindowMessage(MESSAGE.BatchedUpdate, updates))

	return { enabled }
}
