import { Component, JSX } from 'solid-js'
import { ErrorOverlay } from '@/ui'
import * as Controller from './controller'
import App from './App'

export { Controller } from './controller'
export type { ClientListeners } from './controller'

export const Devtools: Component<{
  controller: Controller.Controller
  errorOverlayFooter?: JSX.Element
  headerSubtitle?: JSX.Element
}> = props => {
  return (
    <ErrorOverlay footer={props.errorOverlayFooter}>
      <Controller.Provider controller={props.controller}>
        <App headerSubtitle={props.headerSubtitle} />
      </Controller.Provider>
    </ErrorOverlay>
  )
}
