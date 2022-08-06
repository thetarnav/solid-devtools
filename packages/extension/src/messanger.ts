import { createRuntimeMessanger } from "../shared/messanger"
export const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

postRuntimeMessage("ForceUpdate")
