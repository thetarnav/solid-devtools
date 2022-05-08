import { MappedOwner } from "./graph"

export enum MESSAGE {
	SolidOnPage,
	Hello,
	PanelVisibility,
	SolidUpdate,
}

export interface Message<K extends MESSAGE> {
	id: K
}

export interface MessagePayloads {
	[MESSAGE.SolidOnPage]: true
	[MESSAGE.Hello]: string
	[MESSAGE.PanelVisibility]: boolean
	[MESSAGE.SolidUpdate]: MappedOwner[]
}

export type PostMessageFn = <K extends MESSAGE>(id: K, payload: MessagePayloads[K]) => void

export type OnMessageFn = <K extends MESSAGE>(
	id: K,
	handler: (payload: MessagePayloads[K]) => void,
) => void

export const postWindowMessage: PostMessageFn = (id, payload) => {
	console.log("message posted:", MESSAGE[id], payload)
	window.postMessage({ id, payload }, "*")
}

const windowListeners: Partial<Record<MESSAGE, ((payload: any) => void)[]>> = {}

export function startListeningWindowMessages() {
	window.addEventListener(
		"message",
		event => {
			const id = event.data?.id as MESSAGE
			if (typeof id !== "number") return
			windowListeners[id]?.forEach(f => f(event.data.payload))
		},
		false,
	)
}

export const onWindowMessage: OnMessageFn = (id, handler) => {
	let arr = windowListeners[id]
	if (!arr) arr = windowListeners[id] = []
	arr.push(handler)
}
