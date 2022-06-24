import { noop } from "@solid-primitives/utils"
import { SolidComputation } from "@shared/graph"
import * as API from "./index"

export const Debugger: typeof API.Debugger = props => props.children

export const attachDebugger: typeof API.attachDebugger = noop

export const registerDebuggerPlugin: typeof API.registerDebuggerPlugin = noop

export const makeSolidUpdateListener: typeof API.makeSolidUpdateListener = () => noop

export const getOwnerType: typeof API.getOwnerType = () => 0
export const getOwnerName: typeof API.getOwnerName = () => "(anonymous)"
export const isComputation: typeof API.isComputation = (o): o is SolidComputation => false
