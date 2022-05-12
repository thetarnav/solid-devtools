export {}

declare global {
	interface ShadowRoot {
		adoptedStyleSheets: CSSStyleSheet[]
	}
}
