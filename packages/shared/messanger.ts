import { GraphRoot, MappedOwner } from "./graph"

export enum MESSAGE {
	SolidOnPage,
	Hello,
	PanelVisibility,
	ResetPanel,
	GraphUpdate,
	ComputationUpdate,
	SignalUpdate,
	BatchedUpdate,
}

export interface Message<K extends MESSAGE> {
	id: K
}

export interface MessagePayloads {
	[MESSAGE.SolidOnPage]: void
	[MESSAGE.Hello]: string
	[MESSAGE.PanelVisibility]: boolean
	[MESSAGE.ResetPanel]: void
	[MESSAGE.GraphUpdate]: GraphRoot
	[MESSAGE.ComputationUpdate]: number
	[MESSAGE.SignalUpdate]: {
		id: number
		value: unknown
		oldValue: unknown
	}
	[MESSAGE.BatchedUpdate]: BatchedUpdates
}

export enum UpdateType {
	Signal,
	Computation,
}

export interface SignalUpdatePayload {
	id: number
	value: unknown
	oldValue: unknown
}

export type BatchedUpdate =
	| {
			type: UpdateType.Signal
			payload: SignalUpdatePayload
	  }
	| {
			type: UpdateType.Computation
			payload: number
	  }

export type BatchedUpdates = BatchedUpdate[]

export type PostMessageFn = <K extends MESSAGE>(
	..._: [K] extends [void] ? [id: K] : [id: K, payload: MessagePayloads[K]]
) => void

export type OnMessageFn = <K extends MESSAGE>(
	id: K,
	handler: (payload: MessagePayloads[K]) => void,
) => void

export const postWindowMessage: PostMessageFn = (id, payload?: any) => {
	console.log("message posted:", MESSAGE[id], payload)
	window.postMessage({ id, payload }, "*")
}

const listeners: Partial<Record<MESSAGE, ((payload: any) => void)[]>> = {}

export function startListeningWindowMessages() {
	window.addEventListener(
		"message",
		event => {
			const id = event.data?.id as MESSAGE
			if (typeof id !== "number") return
			listeners[id]?.forEach(f => f(event.data.payload))
		},
		false,
	)
}

export const onWindowMessage: OnMessageFn = (id, handler) => {
	let arr = listeners[id]
	if (!arr) arr = listeners[id] = []
	arr.push(handler)
}
