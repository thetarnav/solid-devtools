export type { Owner } from "solid-js/types/reactive/signal"

export interface GraphRoot {
	id: number
	children: MappedOwner[]
}

export interface MappedOwner {
	name: string
	type: OwnerType
	children: MappedOwner[]
	// JSON doesn't support circular structures (for Port.postMessage)
	// parent: MappedOwner | null
}

export enum OwnerType {
	Memo,
	Component,
	Computation,
	Effect,
	Refresh,
	Render,
}
