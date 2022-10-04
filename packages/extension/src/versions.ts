import { createSignal } from "solid-js"

declare global {
  interface Window {
    versions: {
      client: string
      expectedClient: string
      extension: string
    }
  }
}

export const [versions, setVersions] = createSignal({
  client: "",
  expectedClient: "",
  extension: "",
})

window.versions = {
  get client() {
    return versions().client
  },
  get expectedClient() {
    return versions().expectedClient
  },
  get extension() {
    return versions().extension
  },
}
