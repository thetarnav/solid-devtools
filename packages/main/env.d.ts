declare global {
  // process.env
  namespace NodeJS {
    interface ProcessEnv {
      CLIENT_VERSION: string
      SOLID_VERSION: string
      EXPECTED_SOLID_VERSION: string
    }
  }
}

export {}
