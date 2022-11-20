import { Component, JSX } from 'solid-js'
import { ErrorOverlay } from '@/ui'
import * as Controller from './controller'
import App from './App'

export { Controller } from './controller'
export type { ClientListeners } from './controller'

export { Icon, MountIcons } from './ui'
export type { IconComponent } from './ui'

export const Devtools: Component<{
  controller: Controller.Controller
  errorOverlayFooter?: JSX.Element
  headerSubtitle?: JSX.Element
  useShortcuts?: boolean
}> = props => {
  return (
    <ErrorOverlay footer={props.errorOverlayFooter}>
      <Controller.Provider
        controller={props.controller}
        options={{ useShortcuts: props.useShortcuts ?? false }}
      >
        <App headerSubtitle={props.headerSubtitle} />
      </Controller.Provider>
    </ErrorOverlay>
  )
}
