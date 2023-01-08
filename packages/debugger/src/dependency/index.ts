import { Listen } from '@solid-primitives/event-bus'
import { Accessor } from 'solid-js'
import { InspectedNode } from '../main'

export function createDependencyGraph(props: {
  enabled: Accessor<boolean>
  listenToInspectedNodeChange: Listen<InspectedNode>
}) {}
