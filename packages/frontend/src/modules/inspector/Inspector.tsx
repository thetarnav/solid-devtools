import { useController } from '@/controller'
import { SidePanelCtx } from '@/SidePanel'
import { Badge, Scrollable } from '@/ui'
import { NodeType, NODE_TYPE_NAMES, PropGetterState } from '@solid-devtools/debugger/types'
import { Entries } from '@solid-primitives/keyed'
import { batch, Component, createMemo, For, JSX, Show, useContext } from 'solid-js'
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

  const { setOpenPanel } = useContext(SidePanelCtx)!

  const valueItems = createMemo(() => {
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
                extended={value().extended}
                onClick={() => inspector.inspectValueItem(value())}
                onElementHover={hovered.toggleHoveredElement}
                isSignal={value().getter !== false}
                isStale={value().getter === PropGetterState.Stale}
              />
            )}
          </Entries>
        </ListSignals>
        <ListSignals when={valueItems().stores.length} title="Stores">
          <For each={valueItems().stores}>
            {store => (
              <ValueNode
                name={store.name}
                value={store.value}
                extended={store.extended}
                onClick={() => inspector.inspectValueItem(store)}
                onElementHover={hovered.toggleHoveredElement}
              />
            )}
          </For>
        </ListSignals>
        <ListSignals when={valueItems().signals.length} title="Signals">
          <For each={valueItems().signals}>
            {signal => (
              <div
                style={{
                  outline:
                    inspector.inspectedNode().signalId === signal.id ? '1px dashed orange' : 'none',
                  'border-radius': '4px',
                  position: 'relative',
                }}
              >
                <button
                  onClick={() => {
                    batch(() => {
                      inspector.setInspectedSignal(signal.id)
                      setOpenPanel('dgraph')
                    })
                  }}
                  style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                  }}
                >
                  inspect
                </button>
                <ValueNode
                  name={signal.name}
                  value={signal.value}
                  extended={signal.extended}
                  onClick={() => inspector.inspectValueItem(signal)}
                  onElementHover={hovered.toggleHoveredElement}
                  isSignal
                />
              </div>
            )}
          </For>
        </ListSignals>
        <ListSignals when={valueItems().memos.length} title="Memos">
          <For each={valueItems().memos}>
            {memo => (
              <ValueNode
                name={memo.name}
                value={memo.value}
                extended={memo.extended}
                onClick={() => inspector.inspectValueItem(memo)}
                onElementHover={hovered.toggleHoveredElement}
                isSignal
              />
            )}
          </For>
        </ListSignals>
        <Show when={state.value} keyed>
          {valueItem => (
            <div>
              <h2 class={styles.h2}>{state.type ? NODE_TYPE_NAMES[state.type] : 'Owner'}</h2>
              <ValueNode
                name="value"
                value={valueItem.value}
                extended={valueItem.extended}
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
