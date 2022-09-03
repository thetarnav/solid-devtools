import { Component, Show } from "solid-js"
import { Key } from "@solid-primitives/keyed"
import { NodeType, Graph } from "@solid-devtools/shared/graph"
import { SignalContextProvider, Scrollable, Signals, ValueNode } from "@solid-devtools/ui"
import {
  details,
  useUpdatedSignalsSelector,
  toggleSignalFocus,
  setHoveredElement,
} from "../state/details"
import * as styles from "./details.css"

const DetailsContent: Component<{ details: Graph.OwnerDetails }> = ({ details }) => {
  const { name, id, type, signals, props: componentProps } = details
  return (
    <div class={styles.root}>
      <header class={styles.header}>
        <h1 class={styles.h1}>
          {name} <span class={styles.id}>#{id}</span>
        </h1>
        <div class={styles.type}>{NodeType[type]}</div>
      </header>
      {componentProps && (
        <div class={styles.props}>
          <h2>Props {componentProps.proxy && "(dynamic)"}</h2>
          <Key each={Object.entries(componentProps.value)} by={0}>
            {keyvalue => {
              const name = keyvalue()[0]
              const value = () => keyvalue()[1]
              return (
                <ValueNode
                  name={name}
                  value={value().value}
                  type={value().signal ? NodeType.Signal : null}
                  selected={false}
                />
              )
            }}
          </Key>
        </div>
      )}
      <div>
        <h2>Signals</h2>
        <SignalContextProvider
          value={{
            useUpdatedSelector: useUpdatedSignalsSelector,
            toggleSignalFocus: toggleSignalFocus,
            setHoveredElement,
          }}
        >
          <Signals each={Object.values(signals)} />
        </SignalContextProvider>
      </div>
    </div>
  )
}

export default function Details() {
  return (
    <div class={styles.scrollWrapper}>
      <Scrollable>
        <Show when={details()} keyed>
          {details => <DetailsContent details={details} />}
        </Show>
      </Scrollable>
    </div>
  )
}
