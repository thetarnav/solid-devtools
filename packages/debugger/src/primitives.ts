import { Accessor, createEffect, createSignal, untrack } from "solid-js"
import { throttle } from "@solid-primitives/scheduled"
import { MappedComponent, MappedOwner, SolidOwner } from "@shared/graph"
import { UpdateType } from "@shared/messanger"
import { batchUpdate, ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import { makeRootUpdateListener } from "./update"
import { mapOwnerTree } from "./walker"
import { getNewSdtId } from "./utils"

export type CreateOwnerTreeOptions = {
	enabled?: Accessor<boolean>
	trackSignals?: Accessor<boolean>
	trackBatchedUpdates?: Accessor<boolean>
	trackComponents?: Accessor<boolean>
}

export function boundReturn<T>(this: T): T {
	return this
}

export function createOwnerObserver(
	owner: SolidOwner,
	onUpdate: (children: MappedOwner[], components: MappedComponent[]) => void,
	options: CreateOwnerTreeOptions = {},
): {
	update: VoidFunction
	forceUpdate: VoidFunction
	rootId: number
} {
	const {
		enabled,
		trackSignals = boundReturn.bind(false),
		trackComponents = boundReturn.bind(false),
		trackBatchedUpdates = boundReturn.bind(false),
	} = options

	const rootId = getNewSdtId()

	const onComputationUpdate: ComputationUpdateHandler = payload => {
		batchUpdate({ type: UpdateType.Computation, payload })
	}
	const onSignalUpdate: SignalUpdateHandler = payload => {
		batchUpdate({ type: UpdateType.Signal, payload })
	}
	const forceUpdate = () => {
		const { children, components } = untrack(
			mapOwnerTree.bind(void 0, owner, {
				onComputationUpdate,
				onSignalUpdate,
				rootId,
				trackSignals: trackSignals(),
				trackComponents: trackComponents(),
				trackBatchedUpdates: trackBatchedUpdates(),
			}),
		)
		onUpdate(children, components)
	}
	const update = throttle(forceUpdate, 350)

	if (enabled)
		createEffect(() => {
			if (!enabled()) return
			forceUpdate()
			makeRootUpdateListener(rootId, update)
		})
	else makeRootUpdateListener(rootId, update)

	return { update, forceUpdate, rootId }
}

export function createGraphRoot(
	root: SolidOwner,
	options?: CreateOwnerTreeOptions,
): [
	{
		rootId: number
		children: Accessor<MappedOwner[]>
		components: Accessor<MappedComponent[]>
	},
	{
		update: VoidFunction
		forceUpdate: VoidFunction
	},
] {
	const [children, setChildren] = createSignal<MappedOwner[]>([], { internal: true })
	const [components, setComponents] = createSignal<MappedComponent[]>([], { internal: true })

	const { update, forceUpdate, rootId } = createOwnerObserver(
		root,
		(children, components) => {
			console.log("GRAPH UPDATE")
			setChildren(children)
			setComponents(components)
		},
		options,
	)
	update()

	return [
		{ rootId, children, components },
		{ update, forceUpdate },
	]
}
