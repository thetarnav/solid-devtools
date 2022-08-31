import { createMemo, createRoot, createSignal } from "solid-js"

const exported = createRoot(() => {
  const [extLocatorEnabled, setExtLocator] = createSignal(false)
  const [otherLocatorEnabled, setOtherLocator] = createSignal(false)
  const locatorEnabled = createMemo(() => extLocatorEnabled() || otherLocatorEnabled())

  return {
    extLocatorEnabled,
    setExtLocator,
    locatorEnabled,
    setOtherLocator,
  }
})
export const { extLocatorEnabled, setExtLocator, locatorEnabled, setOtherLocator } = exported
