import { noop } from "@solid-primitives/utils"
import * as API from "."

export const useLocator: typeof API.useLocator = noop
export const registerLocatorPlugin: typeof API.registerLocatorPlugin = () => {}
export const selectedComponent: typeof API.selectedComponent = () => []
export const setLocatorTarget: typeof API.selectedComponent = () => null as any
