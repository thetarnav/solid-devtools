import { MESSAGE, MessagePayloads, OnMessageFn, PostMessageFn } from "@shared/messanger"

export function createPortMessanger(port: chrome.runtime.Port): {
	postPortMessage: PostMessageFn
	onPortMessage: OnMessageFn
} {
	const listeners: Partial<Record<MESSAGE, ((payload: any) => void)[]>> = {}
	port.onMessage.addListener((event, port) => {
		console.log("port message", port)

		const id = event?.id as MESSAGE
		if (typeof id !== "number") return
		listeners[id]?.forEach(f => f(event.payload))
	})
	return {
		postPortMessage: (id, payload?: any) => port.postMessage({ id, payload }),
		onPortMessage: (id, handler) => {
			let arr = listeners[id]
			if (!arr) arr = listeners[id] = []
			arr.push(handler)
		},
	}
}

export function createRuntimeMessanger(): {
	postRuntimeMessage: <K extends MESSAGE>(
		id: K,
		payload: MessagePayloads[K],
		onResponse?: (response: any) => void,
	) => void
	onRuntimeMessage: <K extends MESSAGE>(
		id: K,
		handler: (payload: MessagePayloads[K], sendResponse: (response: any) => void) => void,
	) => void
} {
	const listeners: Partial<Record<MESSAGE, ((...a: any[]) => void)[]>> = {}

	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		const id = message?.id as MESSAGE
		if (typeof id !== "number") return
		listeners[id]?.forEach(f => f(message.payload, sendResponse))
	})

	return {
		onRuntimeMessage: (id, handler) => {
			let arr = listeners[id]
			if (!arr) arr = listeners[id] = []
			arr.push(handler)
		},
		postRuntimeMessage: (id, payload, handleResponse = () => {}) => {
			chrome.runtime.sendMessage({ id, payload }, handleResponse)
		},
	}
}
