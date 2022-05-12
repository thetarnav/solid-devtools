export {}

declare global {
	namespace chrome.runtime {
		interface MessageSender {
			documentId: string
		}
	}
	interface Document {
		adoptedStyleSheets: CSSStyleSheet[]
	}
}
