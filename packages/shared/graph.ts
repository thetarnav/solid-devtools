import { Accessor, getOwner as _getOwner, Setter } from "solid-js"
import { AnyFunction } from "@solid-primitives/utils"
import { BatchedUpdates, MESSAGE, SafeValue } from "./messanger"

export enum OwnerType {
	Component,
	Effect,
	Render,
	Memo,
	Computation,
	Refresh,
}

//
// "Signal___" — owner/signals/etc. objects in the Solid's internal owner graph
//

export interface SolidSignal {
	name: string
	value: unknown
	observers?: SolidOwner[] | null
	// added by sdt:
	sdtId?: number
	onValueUpdate?: {
		[rootID: number]: ValueUpdateListener
	}
}

export interface SolidOwner extends SolidSignal {
	componentName?: string
	owner: SolidOwner | null
	owned: SolidOwner[]
	fn: AnyFunction
	cleanups: VoidFunction[] | null
	sources: (SolidOwner | SolidSignal)[] | null
	context: any | null
	sourceMap?: Record<string, SolidSignal>
	sdtType?: OwnerType
	onComputationUpdate?: {
		[rootID: number]: VoidFunction
	}
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
	children: MappedOwner[]
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
	element: HTMLElement
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
	readonly children: GraphOwner[]
}
