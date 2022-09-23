export {}

declare global {
  namespace chrome.runtime {
    interface MessageSender {
      documentId: string
    }
  }
  const __ADAPTER_VERSION__: string
}

declare module "solid-js" {
  namespace JSX {
    interface CustomEvents {
      keydown: KeyboardEvent
      click: MouseEvent
    }
  }
}
