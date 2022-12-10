import { Component, createMemo, For, JSX, Show } from 'solid-js'
import { Entries } from '@solid-primitives/keyed'
import { NodeType, NODE_TYPE_NAMES } from '@solid-devtools/debugger/types'
import { Scrollable, Badge, Icon } from '@/ui'
import { ValueNode } from './ValueNode'
import { useController } from '@/controller'
import * as styles from './inspector.css'
import { OwnerName } from '@/ui/components/Owner'

export default function Details() {
  const { inspector } = useController()
  const { details, inspectedNode, openComponentLocation, setInspectedNode } = inspector

  return (
    <Show when={inspectedNode()}>
      <div class={styles.root}>
        <header class={styles.header}>
          <OwnerName name={inspectedNode()!.name} type={inspectedNode()!.type} isTitle />
          <div class={styles.actions.container}>
            {/* <button class={styles.actions.button}>
              <Icon.Eye class={styles.actions.icon} />
            </button> */}
            {details.location && (
              <button class={styles.actions.button} onClick={openComponentLocation}>
                <Icon.Code class={styles.actions.icon} />
              </button>
            )}
            <button class={styles.actions.button} onClick={() => setInspectedNode(null)}>
              <Icon.Close class={styles.actions.icon} />
            </button>
          </div>
        </header>
        <Scrollable>
          <DetailsContent />
        </Scrollable>
      </div>
    </Show>
  )
}

const DetailsContent: Component = () => {
  const { inspector } = useController()
  const { details, inspectedNode } = inspector

  const signals = createMemo(() => {
    const list = Object.values(details.signals)
    const memos: typeof list = []
    const signals: typeof list = []
    const stores: typeof list = []
    for (const signal of list) {
      if (signal.type === NodeType.Memo) memos.push(signal)
      else if (signal.type === NodeType.Signal) signals.push(signal)
      else if (signal.type === NodeType.Store) stores.push(signal)
    }
    return { memos, signals, stores }
  })

  return (
    <div class={styles.content}>
      <ListSignals
        when={details.props && Object.keys(details.props.record).length}
        title={<>Props {details.props!.proxy && <Badge>PROXY</Badge>}</>}
      >
        <Entries of={details.props!.record}>
          {(name, value) => (
            <ValueNode
              name={name}
              value={value().value}
              extended={value().selected}
              onClick={() => inspector.inspectValueItem('prop', name)}
              onElementHover={inspector.toggleHoveredElement}
              isSignal
            />
          )}
        </Entries>
      </ListSignals>
      {(['stores', 'signals', 'memos'] as const).map(type => (
        <ListSignals when={signals()[type].length} title={type}>
          <For each={signals()[type]}>
            {signal => (
              <ValueNode
                name={signal.name}
                value={signal.value}
                extended={signal.selected}
                onClick={() => inspector.inspectValueItem('signal', signal.id)}
                onElementHover={inspector.toggleHoveredElement}
                isSignal={type !== 'stores'}
              />
            )}
          </For>
        </ListSignals>
      ))}
      {details.value && (
        <div>
          <h2 class={styles.h2}>{NODE_TYPE_NAMES[inspectedNode()!.type]}</h2>
          <ValueNode
            name="value"
            value={details.value.value}
            extended={details.value.selected}
            onClick={() => inspector.inspectValueItem('value')}
            onElementHover={inspector.toggleHoveredElement}
            isSignal
          />
        </div>
      )}
      {details.location && (
        <div>
          <h2 class={styles.h2}>Location</h2>
          <p class={styles.location}>{details.location}</p>
        </div>
      )}
    </div>
  )
}

function ListSignals<T>(props: { when: T; title: JSX.Element; children: JSX.Element }) {
  return (
    <Show when={props.when}>
      <div>
        <h2 class={styles.h2}>{props.title}</h2>
        <ul>{props.children}</ul>
      </div>
    </Show>
  )
}
