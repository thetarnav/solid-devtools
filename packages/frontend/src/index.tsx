import { Component } from 'solid-js'
import { ErrorOverlay } from '@/ui'
import * as Controller from './controller'
import App from './App'

export { Controller } from './controller'
export type { ClientListeners } from './controller'

export const Devtools: Component<{ controller: Controller.Controller }> = props => {
  return (
    <ErrorOverlay>
      <Controller.Provider controller={props.controller}>
        <App />
      </Controller.Provider>
    </ErrorOverlay>
  )
}
