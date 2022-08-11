import { createEffect, For, JSX, onCleanup } from "solid-js"
import { TransitionGroup, animateExit, animateEnter } from "@otonashixav/solid-flip"
import { createHover } from "@solid-aria/interactions"
import { GraphOwner, NodeType } from "@solid-devtools/shared/graph"
import { HighlightText } from "../signal/signalNode"
import { useHighlights } from "../ctx/highlights"
import * as styles from "./OwnerNode.css"

export function OwnerChildren(props: { children: GraphOwner[] }) {
  return (
    <TransitionGroup enter={animateEnter()} exit={animateExit()}>
      <For each={props.children}>{o => <OwnerNode owner={o} />}</For>
    </TransitionGroup>
  )
}

export function OwnerNode(props: { owner: GraphOwner }): JSX.Element {
  const { owner } = props
  const { name, type, id } = owner
  const children = () => owner.children
  const typeName = NodeType[type]

  const { hoverProps, isHovered } = createHover({})

  const {
    highlightNodeSources,
    isObserverHighlighted,
    useComputationUpdatedSelector,
    useOwnerFocusedSelector,
    handleFocus,
  } = useHighlights()

  const isUpdated = type !== NodeType.Root ? useComputationUpdatedSelector(id) : () => false
  const isFocused = useOwnerFocusedSelector(owner)
  const isHighlighted = isObserverHighlighted.bind(null, owner)
  onCleanup(() => isFocused() && handleFocus(null))

  createEffect(() => {
    highlightNodeSources(owner, isHovered())
  })
  onCleanup(() => highlightNodeSources(owner, false))

  // TODO: rework the observers highlighting for memos
  // if (signal) {
  //   createEffect(() => {
  //     highlightSignalObservers(signal, isHovered())
  //   })
  //   onCleanup(() => highlightSignalObservers(signal, false))
  // }

  return (
    <div class={styles.container}>
      <div
        class={styles.header.contailer[isFocused() ? "focused" : "base"]}
        {...hoverProps}
        onClick={e => handleFocus(isFocused() ? null : owner)}
      >
        <div class={styles.header.containerShadow}></div>
        <div class={styles.header.nameContainer}>
          <HighlightText
            strong={isUpdated()}
            light={isHighlighted()}
            bgColor
            class={styles.header.highlight}
          >
            {type === NodeType.Component ? `<${name}>` : name}
          </HighlightText>
          <div class={styles.header.type}>{typeName}</div>
        </div>
        {/* {signal && <ValueNode value={signal.value} updated={signal.updated} />} */}
      </div>
      {/* <Signals each={signals()} /> */}
      {/* <Show when={children().length}> */}
      <div
        class={styles.childrenContainer}
        style={{
          opacity: isUpdated() ? 0.3 : 1,
        }}
      >
        <OwnerChildren children={children()} />
      </div>
      {/* </Show> */}
    </div>
  )
}
