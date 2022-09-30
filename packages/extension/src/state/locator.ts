import { NodeID } from "@solid-devtools/shared/graph"
import { batch, createRoot, createSignal } from "solid-js"

const locator = createRoot(() => {
  const [extLocatorEnabled, setExtLocator] = createSignal(false)
  const [clientLocatorEnabled, setClientLocator] = createSignal(false)
  const [clientHoveredId, setClientHoveredId] = createSignal<NodeID | null>(null)

  const locatorEnabled = () => extLocatorEnabled() || clientLocatorEnabled()

  function toggleClientLocatorState(enabled: boolean) {
    batch(() => {
      setClientLocator(enabled)
      if (!enabled) setClientHoveredId(null)
    })
  }

  function toggleHovered(id: NodeID, hovered: boolean): void {
    setClientHoveredId(p => {
      if (hovered) return id ?? p
      return p && p === id ? null : p
    })
  }

  return {
    extLocatorEnabled,
    setExtLocator,
    locatorEnabled,
    setClientLocatorState: toggleClientLocatorState,
    clientHoveredId,
    toggleHovered,
  }
})
export default locator
