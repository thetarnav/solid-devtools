import { Component, createContext, useContext } from 'solid-js'
import { createDependencyGraph, Dgraph } from './dgraph'

const DgraphContext = createContext<Dgraph.Module>()

export const useDgraph = () => {
  const ctx = useContext(DgraphContext)
  if (!ctx) throw new Error('Dgraph context not found')
  return ctx
}

const DgraphView: Component = () => {
  const dgraph = createDependencyGraph()

  return (
    <DgraphContext.Provider value={dgraph}>
      <div>Dgraph</div>
    </DgraphContext.Provider>
  )
}

export default DgraphView
