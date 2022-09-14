import { createMemo, createRoot, createSignal } from "solid-js"

const locator = createRoot(() => {
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
export default locator
