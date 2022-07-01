import { ParentComponent } from "solid-js"
import { attachDebugger } from "./primitives"

export { registerDebuggerPlugin } from "./plugin"
export type { PluginFactory } from "./plugin"

export type { TargetIDE, TargetURLFunction } from "@solid-devtools/locator"

export { attachDebugger } from "./primitives"

export {
	makeSolidUpdateListener,
	observeComputationUpdate,
	observeValueUpdate,
	interceptComputationRerun,
} from "./update"

export {
	getOwnerType,
	getNodeType,
	getNodeName,
	isSolidComputation,
	isSolidMemo,
	isSolidOwner,
	isSolidRoot,
	onOwnerCleanup,
	onParentCleanup,
	getFunctionSources,
	getSafeValue,
	createUnownedRoot,
} from "./utils"

export const Debugger: ParentComponent = props => {
	attachDebugger()
	return props.children
}
