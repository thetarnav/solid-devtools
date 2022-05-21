import { getOwner as _getOwner, Setter } from "solid-js"
import { AnyFunction } from "@solid-primitives/utils"
import { MESSAGE, SafeValue } from "./messanger"

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
	observers: SolidOwner[]
	// added by sdt:
	sdtId?: number
	onValueUpdate?: {
		[rootID: number]: ValueUpdateListener
	}
}

export interface SolidOwner {
	name?: string
	componentName?: string
	owner: SolidOwner | null
	owned: SolidOwner[]
	fn: AnyFunction
	cleanups: VoidFunction[] | null
	context: any | null
	sourceMap?: Record<string, SolidSignal>
	// every owner has a value, only for memo that value is available as a signal
	value: unknown
	// added by sdt:
	sdtId?: number
	onComputationUpdate?: {
		[rootID: number]: VoidFunction
	}
	onValueUpdate?: {
		[rootID: number]: ValueUpdateListener
	}
}

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
	value?: MappedSignal
}

export interface MappedSignal {
	name: string
	id: number
	value?: SafeValue
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
	readonly rerun: boolean
	readonly children: GraphOwner[]
	readonly signals: GraphSignal[]
	readonly signal?: GraphSignal
}

export interface GraphSignal {
	readonly id: number
	readonly name: string
	readonly dispose?: VoidFunction
	readonly value: SafeValue
}

export interface GraphRoot {
	readonly id: number
	readonly children: GraphOwner[]
}
