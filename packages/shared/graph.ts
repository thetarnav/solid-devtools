import { getOwner as _getOwner } from "solid-js"
import { Many } from "@solid-primitives/utils"
import { BatchedUpdates, SafeValue } from "./messanger"

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

type _Owner = import("solid-js/types/reactive/signal").Owner
type _SignalState = import("solid-js/types/reactive/signal").SignalState<unknown>
type _Computation = import("solid-js/types/reactive/signal").Computation<unknown>

declare module "solid-js/types/reactive/signal" {
	interface SignalState<T> {
		sdtId?: number
		onValueUpdate?: ValueUpdateListener
	}
	interface Owner {
		sdtId?: number
		sdtType?: OwnerType
		ownedRoots?: Set<SolidRoot>
	}
	interface Computation<Init, Next> {
		sdtId?: number
		sdtType?: OwnerType
		ownedRoots?: Set<SolidRoot>
		onValueUpdate?: ValueUpdateListener
		onComputationUpdate?: VoidFunction
	}
}

export interface SolidSignal extends _SignalState {
	value: unknown
	observers: SolidComputation[] | null
}

export interface SolidRoot extends _Owner {
	owned: SolidComputation[] | null
	owner: SolidRoot | SolidComputation | null
	sourceMap?: Record<string, SolidSignal>
	isDisposed?: boolean
	sdtContext?: DebuggerContext
}

export interface SolidComputation extends _Computation, SolidRoot, SolidSignal {
	owned: SolidComputation[] | null
	owner: SolidRoot | SolidComputation | null
	value: unknown
	sourceMap?: Record<string, SolidSignal>
	name: string
	sources: (SolidComputation | SolidSignal)[] | null
}

export type SolidOwner = SolidRoot & Partial<SolidComputation>

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
