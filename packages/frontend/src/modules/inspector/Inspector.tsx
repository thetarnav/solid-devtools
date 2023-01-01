import { useController } from '@/controller'
import { Badge, Icon, Scrollable } from '@/ui'
import { OwnerName } from '@/ui/components/Owner'
import { NodeType, NODE_TYPE_NAMES, PropGetterState } from '@solid-devtools/debugger/types'
import { Entries } from '@solid-primitives/keyed'
import { Component, createMemo, For, JSX, Show } from 'solid-js'
import * as styles from './inspector.css'
import { ValueNode } from './ValueNode'

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

  const allSignals = createMemo(() => {
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
              onClick={() => inspector.inspectValueItem(value())}
              onElementHover={inspector.toggleHoveredElement}
              isSignal={value().getter !== false}
              isStale={value().getter === PropGetterState.Stale}
            />
          )}
        </Entries>
      </ListSignals>
      {(['stores', 'signals', 'memos'] as const).map(type => (
        <ListSignals when={allSignals()[type].length} title={type}>
          <For each={allSignals()[type]}>
            {signal => (
              <ValueNode
                name={signal.name}
                value={signal.value}
                extended={signal.selected}
                onClick={() => inspector.inspectValueItem(signal)}
                onElementHover={inspector.toggleHoveredElement}
                isSignal={type !== 'stores'}
              />
            )}
          </For>
        </ListSignals>
      ))}
      <Show when={details.value} keyed>
        {valueItem => (
          <div>
            <h2 class={styles.h2}>{NODE_TYPE_NAMES[inspectedNode()!.type]}</h2>
            <ValueNode
              name="value"
              value={valueItem.value}
              extended={valueItem.selected}
              onClick={() => inspector.inspectValueItem(valueItem)}
              onElementHover={inspector.toggleHoveredElement}
              isSignal
            />
          </div>
        )}
      </Show>
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
