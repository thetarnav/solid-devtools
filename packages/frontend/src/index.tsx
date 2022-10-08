import { Component } from 'solid-js'
import { ErrorOverlay } from '@/ui'
import * as Controller from './Controller'
import App from './App'

export { Controller } from './Controller'
export type { ClientListeners } from './Controller'

export const Devtools: Component<{ controller: Controller.Controller }> = props => {
  return (
    <ErrorOverlay>
      <Controller.Provider controller={props.controller}>
        <App />
      </Controller.Provider>
    </ErrorOverlay>
  )
}
