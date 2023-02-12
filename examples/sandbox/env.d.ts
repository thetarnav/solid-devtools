export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXT: 'true' | '1' | ''
    }
  }
}
