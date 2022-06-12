export {}

declare global {
	interface Document {
		adoptedStyleSheets: CSSStyleSheet[]
	}
	interface ShadowRoot {
		adoptedStyleSheets: CSSStyleSheet[]
	}
}
