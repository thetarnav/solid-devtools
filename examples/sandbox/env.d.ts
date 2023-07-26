export {}

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            EXT: 'true' | '1' | ''
            BUILD: 'true' | '1' | ''
        }
    }
}
