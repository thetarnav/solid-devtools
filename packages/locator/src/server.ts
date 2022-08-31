import { noop } from "@solid-primitives/utils"
import * as API from "."

export const useLocator: typeof API.useLocator = noop
export const setTarget: typeof API.setTarget = () => null as any
export const highlightedComponent: typeof API.highlightedComponent = () => []
export const addClickInterceptor: typeof API.addClickInterceptor = () => {}
export const addHighlightingSource: typeof API.addHighlightingSource = () => {}
export const addLocatorModeSource: typeof API.addLocatorModeSource = () => {}
export const highlightingEnabled: typeof API.highlightingEnabled = () => false
export const locatorModeEnabled: typeof API.locatorModeEnabled = () => false
