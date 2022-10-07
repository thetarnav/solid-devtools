import { Structure } from '@/state'
import { createContext, useContext } from 'solid-js'

const StructureContext = createContext<{
  toggleCollapsed: (node: Structure.Node) => void
  isCollapsed: (node: Structure.Node) => boolean
}>()

export const StructureProvider = StructureContext.Provider

export const useStructure = () => {
  const ctx = useContext(StructureContext)
  if (!ctx) throw new Error('No StructureContext')
  return ctx
}
