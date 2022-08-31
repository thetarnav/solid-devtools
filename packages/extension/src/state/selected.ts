import { createRoot, createSignal } from "solid-js"

const exported = createRoot(() => {
  const [inLocatorMode, setInLocatorMode] = createSignal(false)

  return {
    inLocatorMode,
    setInLocatorMode,
  }
})
export const { inLocatorMode, setInLocatorMode } = exported
