import { noop } from "@solid-primitives/utils"
import * as API from "."

export const useLocator: typeof API.useLocator = noop
export const registerLocatorPlugin: typeof API.registerLocatorPlugin = () => ({
  selected: () => null,
  setTargetElement: () => null as any,
})
