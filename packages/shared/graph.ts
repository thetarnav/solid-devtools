import { getOwner as _getOwner } from "solid-js"
import type { Owner as _Owner } from "solid-js/types/reactive/signal"
import { AnyFunction } from "@solid-primitives/utils"

export interface Owner extends _Owner {
	fn: AnyFunction
	sdtId?: number
}

export const getOwner = _getOwner as () => Owner | null

export interface GraphRoot {
	id: number
	children: MappedOwner[]
}

export interface MappedOwner {
	id: number
	name: string
	type: OwnerType
	children: MappedOwner[]
	// JSON doesn't support circular structures (for Port.postMessage)
	// parent: MappedOwner | null
}

export enum OwnerType {
	Component,
	UserEffect,
	Effect,
	Memo,
	Computation,
	Refresh,
}
