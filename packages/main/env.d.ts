declare global {
  // process.env
  namespace NodeJS {
    interface ProcessEnv {
      VERSION: string
    }
  }
}

export {}
