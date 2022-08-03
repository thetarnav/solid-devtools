export {}

declare global {
  namespace chrome.runtime {
    interface MessageSender {
      documentId: string
    }
  }
}
