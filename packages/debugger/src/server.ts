import { noop } from "@solid-primitives/utils"
import * as API from "./index"

export const Debugger: typeof API.Debugger = props => props.children

export const attachDebugger: typeof API.attachDebugger = noop

export const registerDebuggerPlugin: typeof API.registerDebuggerPlugin = noop
