import { Component, createMemo, For, JSX, Show } from 'solid-js'
import { Entries } from '@solid-primitives/keyed'
import { NodeType } from '@solid-devtools/debugger/types'
import { Scrollable, Badge } from '@/ui'
import { ValueNode } from './ValueNode'
import { useController } from '@/controller'
import { Inspector } from '.'
import * as styles from './inspector.css'

export default function Details() {
  const { inspector } = useController()

  return (
    <Show when={inspector.inspectedNode()}>
      <div class={styles.scrollWrapper}>
        <Scrollable>
          <Show when={inspector.details()} keyed>
            {details => <DetailsContent details={details} />}
          </Show>
        </Scrollable>
      </div>
    </Show>
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

const DetailsContent: Component<{ details: Inspector.Details }> = ({ details }) => {
  const { name, id, type, props: componentProps, ownerValue } = details

  const { inspector } = useController()

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
    <div class={styles.root}>
      <div class={styles.rootMargin}>
        <header class={styles.header}>
          <h1 class={styles.h1}>
            {name} <span class={styles.id}>#{id}</span>
          </h1>
          <div class={styles.type}>{NodeType[type]}</div>
        </header>
        <div class={styles.content}>
          <ListSignals
            when={componentProps && Object.keys(componentProps.record).length}
            title={<>Props {componentProps!.proxy && <Badge>PROXY</Badge>}</>}
          >
            <Entries of={componentProps!.record}>
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
          {ownerValue && (
            <div>
              <h2 class={styles.h2}>{NodeType[type]}</h2>
              <ValueNode
                name="value"
                value={ownerValue.value}
                extended={ownerValue.selected}
                onClick={() => inspector.inspectValueItem('value')}
                onElementHover={inspector.toggleHoveredElement}
                isSignal
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
