import { getOwner as _getOwner, Setter } from "solid-js"
import { AnyFunction } from "@solid-primitives/utils"

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
}

export const getOwner = _getOwner as () => SolidOwner | null

export interface GraphRoot {
	id: number
	children: MappedOwner[]
}

export interface MappedOwner {
	id: number
	name: string
	type: OwnerType
	signals: MappedSignal[]
	children: MappedOwner[]
}

export interface MappedSignal {
	name: string
	id: number
	value: unknown
}

export interface ReactiveGraphOwner {
	readonly id: number
	readonly name: string
	readonly type: OwnerType
	readonly dispose: VoidFunction
	readonly rerun: boolean
	readonly children: ReactiveGraphOwner[]
	readonly signals: ReactiveGraphSignal[]
}

export interface ReactiveGraphSignal {
	readonly id: number
	readonly name: string
	readonly dispose?: VoidFunction
	value: unknown
	readonly setValue: Setter<unknown>
}

export interface ReactiveGraphRoot {
	readonly id: number
	readonly children: ReactiveGraphOwner[]
}

export enum OwnerType {
	Component,
	Effect,
	Render,
	Memo,
	Computation,
	Refresh,
}
