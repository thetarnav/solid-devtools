import { Scrollable } from '@/ui'
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
    <Scrollable>
      <DgraphContext.Provider value={dgraph}>
        <pre>{JSON.stringify(dgraph.dGraph(), null, 2)}</pre>
      </DgraphContext.Provider>
    </Scrollable>
  )
}

export default DgraphView
