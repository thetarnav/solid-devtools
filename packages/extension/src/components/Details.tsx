import { Component, Show } from "solid-js"
import { Entries } from "@solid-primitives/keyed"
import { NodeType, Graph } from "@solid-devtools/shared/graph"
import { SignalContextProvider, Scrollable, Signals, ValueNode } from "@/ui"
import {
  details,
  useUpdatedSignalsSelector,
  toggleSignalFocus,
  togglePropFocus,
  toggleHoveredElement,
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
      <div class={styles.content}>
        {componentProps && (
          <div>
            <h2 class={styles.h2}>
              Props {componentProps.proxy && <span class={styles.proxy}>proxy</span>}
            </h2>
            <Entries of={componentProps.record}>
              {(name, value) => (
                <ValueNode
                  name={name}
                  value={value().value}
                  selected={value().selected}
                  onClick={() => togglePropFocus(name)}
                  onElementHover={toggleHoveredElement}
                />
              )}
            </Entries>
          </div>
        )}
        <div>
          <h2 class={styles.h2}>Signals</h2>
          <SignalContextProvider
            value={{
              useUpdatedSelector: useUpdatedSignalsSelector,
              toggleSignalFocus,
              toggleHoveredElement,
            }}
          >
            <Signals each={Object.values(signals)} />
          </SignalContextProvider>
        </div>
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
