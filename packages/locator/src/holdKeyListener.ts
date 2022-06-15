// TODO contribute this to solid-primitives

import { makeEventListener } from "@solid-primitives/event-listener"

export type HoldKeySetting = "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | (string & {})

const keyModifierProperties = ["altKey", "ctrlKey", "metaKey", "shiftKey"] as const

export function makeHoldKeyListener(
	key: HoldKeySetting,
	onHoldChange: (isHolding: boolean) => void,
	preventDefault = false,
): void {
	let state = false
	const updateState = (newState: boolean) => newState !== state && onHoldChange((state = newState))

	const checkKey: (e: KeyboardEvent) => boolean = keyModifierProperties.includes(key)
		? e => e[key as "altKey" | "ctrlKey" | "metaKey" | "shiftKey"]
		: e => e.key === key

	makeEventListener(window, "keydown", e => {
		if (!checkKey(e)) return updateState(false)
		if (e.repeat) return
		preventDefault && e.preventDefault()
		updateState(true)
	})
	makeEventListener(window, "keyup", updateState.bind(null, false))
	makeEventListener(
		document,
		"visibilitychange",
		() => document.visibilityState !== "visible" && updateState(false),
	)
}
