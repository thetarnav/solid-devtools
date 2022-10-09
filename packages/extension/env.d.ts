export {}

declare global {
  namespace chrome.runtime {
    interface MessageSender {
      documentId: string
    }
  }
  const __CLIENT_VERSION__: string
}
