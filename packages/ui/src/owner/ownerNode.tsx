import { createEffect, For, JSX, onCleanup } from "solid-js"
import { TransitionGroup, animateExit, animateEnter } from "@otonashixav/solid-flip"
import { createHover } from "@solid-aria/interactions"
import { GraphOwner, NodeType } from "@solid-devtools/shared/graph"
import { HighlightText, Signals, ValueNode } from "../signal/signalNode"
import { useHighlights } from "../ctx/highlights"
import { childrenContainer, container, header } from "./styles.css"

export function OwnerChildren(props: { children: GraphOwner[] }) {
  return (
    <TransitionGroup enter={animateEnter()} exit={animateExit()}>
      <For each={props.children}>{o => <OwnerNode owner={o} />}</For>
    </TransitionGroup>
  )
}

export function OwnerNode(props: { owner: GraphOwner }): JSX.Element {
  const { owner } = props
  const { name, type, signal } = owner
  const children = () => owner.children
  const signals = () => owner.signals
  const rerun = () => owner.updated
  const typeName = NodeType[type]

  const { hoverProps, isHovered } = createHover({})

  const { highlightNodeSources, highlightSignalObservers, isObserverHighlighted } = useHighlights()

  const isHighlighted = isObserverHighlighted.bind(null, owner)

  createEffect(() => {
    highlightNodeSources(owner, isHovered())
  })
  onCleanup(() => highlightNodeSources(owner, false))

  if (signal) {
    createEffect(() => {
      highlightSignalObservers(signal, isHovered())
    })
    onCleanup(() => highlightSignalObservers(signal, false))
  }

  return (
    <div class={container}>
      <div class={header.contailer} {...hoverProps}>
        <div class={header.nameContainer}>
          <HighlightText strong={rerun()} light={isHighlighted()} bgColor class={header.highlight}>
            {type === NodeType.Component ? `<${name}>` : name}
          </HighlightText>
          <div class={header.type}>{typeName}</div>
        </div>
        {signal && <ValueNode value={signal.value} updated={signal.updated} />}
      </div>
      <Signals each={signals()} />
      {/* <Show when={children().length}> */}
      <div
        class={childrenContainer}
        style={{
          opacity: rerun() ? 0.3 : 1,
        }}
      >
        <OwnerChildren children={children()} />
      </div>
      {/* </Show> */}
    </div>
  )
}
