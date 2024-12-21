/// <reference types="vite/client" />
/// <reference types="@types/chrome" />

declare global {
    // import.meta.env.EXPECTED_CLIENT
    interface ImportMetaEnv {
        EXPECTED_CLIENT: string
        BROWSER: 'chrome' | 'firefox'
    }
}

export {}
