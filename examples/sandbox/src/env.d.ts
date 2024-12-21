
/// <reference types="vite/client" />

declare global {
    interface ImportMetaEnv {
        readonly EXT: boolean
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv
    }
}

export {}