import { Component, createSignal, onCleanup } from 'solid-js'
import { isServer, Portal } from 'solid-js/web'
import { Controller, Devtools } from '@solid-devtools/frontend'
import { useDebugger, enableRootsAutoattach, PluginData } from '@solid-devtools/debugger'
import styles from '@solid-devtools/frontend/dist/index.css'

let debuggerData: PluginData

const [mounted, setMounted] = createSignal(false)

if (!isServer) {
  enableRootsAutoattach()

  debuggerData = useDebugger({
    enabled: mounted,
  })
}

export const Overlay: Component<{ test: string }> = props => {
  if (isServer) return ''

  setMounted(true)
  onCleanup(() => setMounted(false))

  const controller = new Controller({
    onExtLocatorEnabledChange(enabled) {
      console.log(enabled)
    },
    onHighlightElementChange(data) {
      console.log(data)
    },
    onInspectedNodeChange(data) {
      console.log(data)
    },
    onInspectValue(data) {
      console.log(data)
    },
  })

  return (
    <Portal useShadow>
      <style>{styles}</style>
      <Devtools controller={controller} />
    </Portal>
  )
}
