import { Accessor, getOwner as _getOwner, Setter } from "solid-js"
import { AnyFunction, Many, Modify } from "@solid-primitives/utils"
import { BatchedUpdates, MESSAGE, SafeValue } from "./messanger"

export enum OwnerType {
	Component,
	Effect,
	Render,
	Memo,
	Computation,
	Refresh,
	Root,
}

//
// "Signal___" — owner/signals/etc. objects in the Solid's internal owner graph
//

export interface SolidSignal {
	name: string
	value: unknown
	observers: SolidComputation[] | null
	// TODO: set them to valid values
	observerSlots: any
	pending: any
	// added by solid-devtools:
	sdtId?: number
	onValueUpdate?: {
		[rootID: number]: ValueUpdateListener
	}
}

export interface SolidRoot {
	name?: string
	cleanups: VoidFunction[] | null
	context: any | null
	owner: SolidOwner | SolidRoot | null
	owned: SolidComputation[] | null
	sourceMap?: Record<string, SolidSignal>
	// added by solid-devtools:
	ownedRoots?: Set<SolidRoot>
}

export interface SolidComputation extends SolidRoot, SolidSignal {
	name: string
	fn: AnyFunction
	sources: (SolidComputation | SolidSignal)[] | null
	// TODO: set them to valid values
	state: any
	sourceSlots: any
	updatedAt: any
	pure: any
	// added by solid-devtools:
	onComputationUpdate?: {
		[rootID: number]: VoidFunction
	}
}

export type SolidOwner = Modify<
	SolidSignal & SolidRoot & SolidComputation,
	{
		name?: string
		value?: unknown
		componentName?: string
		fn?: AnyFunction
		sources?: (SolidComputation | SolidSignal)[] | null
		observers?: SolidComputation[] | null
		// TODO: set them to valid values
		state?: any
		sourceSlots?: any
		updatedAt?: any
		pure?: any
		observerSlots?: any
		pending?: any
		// added by solid-devtools:
		sdtType?: OwnerType
		sdtContext?: DebuggerContext
	}
>

export type DebuggerContext = {
	rootId: number
	triggerRootUpdate: VoidFunction
	forceRootUpdate: VoidFunction
}

export type BatchUpdateListener = (updates: BatchedUpdates) => void

export type ValueUpdateListener = (newValue: unknown, oldValue: unknown) => void

export const getOwner = _getOwner as () => SolidOwner | null

//
// "Mapped___" — owner/signal/etc. objects created by the solid-devtools-debugger runtime library
// They should be JSON serialisable — to be able to send them with chrome.runtime.sendMessage
//

export interface MappedRoot {
	id: number
	tree: MappedOwner
	components: MappedComponent[]
}

export interface SerialisedTreeRoot {
	id: number
	tree: MappedOwner
	components?: undefined
}

export interface MappedOwner {
	id: number
	name: string
	type: OwnerType
	signals: MappedSignal[]
	children: MappedOwner[]
	sources: number[]
	signal?: MappedSignal
}

export interface MappedSignal {
	name: string
	id: number
	observers: number[]
	value: SafeValue
}

export type MappedComponent = {
	name: string
	// ! HTMLElements aren't JSON serialisable
	resolved: Many<HTMLElement>
}

//
// "Graph___" — owner/signals/etc. objects handled by the devtools frontend (extension/overlay/ui packages)
// They are meant to be "reactive" — wrapped with a store
//

export interface GraphOwner {
	readonly id: number
	readonly name: string
	readonly type: OwnerType
	readonly dispose: VoidFunction
	readonly updated: boolean
	readonly setUpdate: (value: boolean) => void
	sources: GraphSignal[]
	readonly children: GraphOwner[]
	readonly signals: GraphSignal[]
	signal?: GraphSignal
}

export interface GraphSignal {
	readonly id: number
	readonly name: string
	readonly dispose?: VoidFunction
	readonly updated: boolean
	readonly setUpdate: (value: boolean) => void
	readonly value: SafeValue
	readonly setValue: (value: unknown) => void
	readonly observers: GraphOwner[]
}

export interface GraphRoot {
	readonly id: number
	readonly tree: GraphOwner
}
