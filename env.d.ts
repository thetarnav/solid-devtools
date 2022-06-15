export {}

declare global {
	interface Document {
		adoptedStyleSheets: CSSStyleSheet[]
	}
	interface ShadowRoot {
		adoptedStyleSheets: CSSStyleSheet[]
	}
}

declare global {
	interface Array<T> {
		includes(searchElement: unknown, fromIndex?: number): boolean
	}
	interface ReadonlyArray<T> {
		includes(searchElement: unknown, fromIndex?: number): boolean
	}
}
