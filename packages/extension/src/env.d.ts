declare global {
    namespace chrome.runtime {
        interface MessageSender {
            documentId: string
        }
    }
    // import.meta.env.EXPECTED_CLIENT
    interface ImportMetaEnv {
        EXPECTED_CLIENT: string
        BROWSER: 'chrome' | 'firefox'
    }
}

export {}
