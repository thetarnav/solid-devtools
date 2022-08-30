import { noop } from "@solid-primitives/utils"
import * as API from "."

export const useLocator: typeof API.useLocator = noop
export const registerPlugin: typeof API.registerPlugin = () => {}
export const setTarget: typeof API.setTarget = () => null as any
export const hoveredComponents: typeof API.hoveredComponents = () => []
