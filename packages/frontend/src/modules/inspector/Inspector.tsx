import { useController } from '@/controller'
import { Badge, Scrollable } from '@/ui'
import { NodeType, NODE_TYPE_NAMES, PropGetterState } from '@solid-devtools/debugger/types'
import { Entries } from '@solid-primitives/keyed'
import { Component, createMemo, For, JSX, Show } from 'solid-js'
import * as styles from './inspector.css'
import { ValueNode } from './ValueNode'

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

const InspectorView: Component = () => {
  const { inspector, hovered } = useController()
  const { state } = inspector

  const allSignals = createMemo(() => {
    const list = Object.values(state.signals)
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
    <Scrollable>
      <div class={styles.content}>
        <ListSignals
          when={state.props && Object.keys(state.props.record).length}
          title={<>Props {state.props!.proxy && <Badge>PROXY</Badge>}</>}
        >
          <Entries of={state.props!.record}>
            {(name, value) => (
              <ValueNode
                name={name}
                value={value().value}
                extended={value().selected}
                onClick={() => inspector.inspectValueItem(value())}
                onElementHover={hovered.toggleHoveredElement}
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
                  onElementHover={hovered.toggleHoveredElement}
                  isSignal={type !== 'stores'}
                />
              )}
            </For>
          </ListSignals>
        ))}
        <Show when={state.value} keyed>
          {valueItem => (
            <div>
              <h2 class={styles.h2}>{state.type ? NODE_TYPE_NAMES[state.type] : 'Owner'}</h2>
              <ValueNode
                name="value"
                value={valueItem.value}
                extended={valueItem.selected}
                onClick={() => inspector.inspectValueItem(valueItem)}
                onElementHover={hovered.toggleHoveredElement}
                isSignal
              />
            </div>
          )}
        </Show>
        {state.location && (
          <div>
            <h2 class={styles.h2}>Location</h2>
            <p class={styles.location}>{state.location}</p>
          </div>
        )}
      </div>
    </Scrollable>
  )
}

export default InspectorView
