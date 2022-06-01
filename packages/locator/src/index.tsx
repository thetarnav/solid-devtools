import {
	Accessor,
	Component,
	createComputed,
	createEffect,
	createMemo,
	createSelector,
	createSignal,
	on,
	onCleanup,
} from "solid-js"
import { Portal, render } from "solid-js/web"
import { isProd } from "@solid-primitives/utils"
import { makeEventListener } from "@solid-primitives/event-listener"
import { MappedComponent } from "@shared/graph"
import { sheet } from "@ui"

const [selected, setSelected] = createSignal<HTMLElement>()
const [hoverTarget, setHoverTarget] = createSignal<HTMLElement>()
const updateHoverTarget = (e: Event) =>
	setHoverTarget(e.target instanceof HTMLElement ? e.target : undefined)

const findComponentCache = new Map<HTMLElement, MappedComponent | false>()

function findComponent(
	this: Accessor<MappedComponent[]>,
	getTarget: Accessor<HTMLElement | undefined>,
): MappedComponent | undefined {
	const target = getTarget()
	if (!target) return undefined
	const comps = this()
	const checked: HTMLElement[] = []
	const toCheck = [target]
	for (const el of toCheck) {
		for (const comp of comps) {
			if (!checked.includes(el)) {
				const cached = findComponentCache.get(el)
				if (cached !== undefined) {
					for (const el of checked) findComponentCache.set(el, cached)
					return cached || undefined
				}
				checked.push(el)
				if (el === comp.element) {
					for (const el of checked) findComponentCache.set(el, comp)
					return comp
				}
			}
			el.parentElement && toCheck.push(el.parentElement)
		}
	}
	for (const el of checked) findComponentCache.set(el, false)
	return undefined
}

export function useLocator({ components }: { components: Accessor<MappedComponent[]> }): {
	enabled: Accessor<boolean>
} {
	// TODO: enable only when the page window is opened
	const [enabled, setEnabled] = createSignal(true)
	onCleanup(setHoverTarget)

	attachLocator()

	createEffect(() => {
		if (!enabled()) return setHoverTarget()
		makeEventListener(window, "mouseover", updateHoverTarget)
		makeEventListener(document, "mouseleave", setHoverTarget.bind(void 0, void 0))
	})

	createComputed(on(components, () => findComponentCache.clear()))
	const selectedComp = createMemo(findComponent.bind(components, hoverTarget))

	createEffect(() => console.log(selectedComp()))

	return { enabled }
}

function attachLocator() {
	if (isProd) return
	const root = (<div class="solid-devtools-locator"></div>) as HTMLDivElement
	const shadow = root.attachShadow({ mode: "open" })
	const inShadowRoot = document.createElement("div")
	shadow.appendChild(inShadowRoot)
	onCleanup(render(() => root, document.body))
	onCleanup(render(() => <Locator />, inShadowRoot))
	// stylesheet has to be attached after the shadow root has been attached to the dom
	shadow.adoptedStyleSheets = [sheet.target]
}

const Locator: Component = props => {
	return <div>Hello :)</div>
}
