import type { WINDOW_WRAP_STORE_PROPERTY } from "@shared/variables"

export {}

declare global {
  interface Window {
    [WINDOW_WRAP_STORE_PROPERTY]?: <T extends object>(init: T) => T
  }
}
