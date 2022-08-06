import { createRuntimeMessanger } from "../shared/bridge"

export const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

postRuntimeMessage("ForceUpdate", true)
