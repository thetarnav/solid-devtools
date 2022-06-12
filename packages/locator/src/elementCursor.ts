import { Accessor, createEffect } from "solid-js"
import { MaybeAccessor, access } from "@solid-primitives/utils"

/**
 * Set selected {@link cursor} to {@link target} styles.
 *
 * @param target
 * @param cursor
 */
export function createElementCursor(
	target: Accessor<HTMLElement | undefined | false | null> | HTMLElement,
	cursor: MaybeAccessor<string> = "pointer",
) {
	createEffect<{ el: HTMLElement | undefined | false | null; cursor: string }>(
		prev => {
			if (prev.el) prev.el.style.cursor = prev.cursor
			const el = access(target)
			if (el) {
				const _cursor = el.style.cursor
				el.style.cursor = access(cursor)
				return { el, cursor: _cursor }
			}
			return { el, cursor: "" }
		},
		{
			el: undefined,
			cursor: "",
		},
	)
}
