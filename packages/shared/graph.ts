import { getOwner as _getOwner, Setter } from "solid-js"
import { AnyFunction } from "@solid-primitives/utils"
import { SafeValue } from "./messanger"

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
	sdtId?: number
	value: unknown
	observers: SolidOwner[]
}

export interface SolidOwner {
	name?: string
	componentName?: string
	sdtId?: number
	owner: SolidOwner | null
	owned: SolidOwner[]
	fn: AnyFunction
	cleanups: VoidFunction[] | null
	context: any | null
	sourceMap?: Record<string, SolidSignal>
	// every owner has a value, only for memo that value is available as a signal
	value: unknown
}

export const getOwner = _getOwner as () => SolidOwner | null

//
// "Mapped___" — owner/signal/etc. objects created by the solid-devtools-debugger runtime library
// They should be JSON serialisable — to be able to send them with chrome.runtime.sendMessage
//

export interface MappedRoot {
	id: number
	children: MappedNode[]
}

export interface MappedBase {
	id: number
	name: string
	type: OwnerType
	signals: MappedSignal[]
	children: MappedNode[]
	value?: SafeValue
}

export interface MappedOwner extends MappedBase {
	type: Exclude<OwnerType, OwnerType.Memo>
}

export interface MappedMemo extends MappedBase {
	type: OwnerType.Memo
	value: SafeValue
}

export type MappedNode = MappedOwner | MappedMemo

export interface MappedSignal {
	name: string
	id: number
	value: SafeValue
}

//
// "Graph___" — owner/signals/etc. objects handled by the devtools frontend (extension/overlay/ui packages)
// They are meant to be "reactive" — wrapped with a store
//

export interface GraphBase {
	readonly id: number
	readonly name: string
	readonly type: OwnerType
	readonly dispose: VoidFunction
	readonly rerun: boolean
	readonly children: GraphNode[]
	readonly signals: GraphSignal[]
	value?: SafeValue
}

export interface GraphOwner extends GraphBase {
	readonly type: Exclude<OwnerType, OwnerType.Memo>
}

export interface GraphMemo extends GraphBase {
	readonly type: OwnerType.Memo
	value: SafeValue
}

export type GraphNode = GraphMemo | GraphOwner

export interface GraphSignal {
	readonly id: number
	readonly name: string
	readonly dispose?: VoidFunction
	value: SafeValue
	readonly setValue: Setter<SafeValue>
}

export interface GraphRoot {
	readonly id: number
	readonly children: GraphNode[]
}
