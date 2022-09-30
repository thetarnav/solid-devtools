import { Component } from "solid-js"
import { NodeType } from "@solid-devtools/shared/graph"
import { Icon } from "@/ui"
import { Structure } from "@/state"
import * as styles from "./path.css"
import { NodeTypeIcon } from "./OwnerNode"

export const OwnerPath: Component<{ path: Structure.Node[] }> = props => {
  return (
    <div class={styles.container}>
      {props.path.map((node, index) => (
        <>
          {index > 0 && (
            <div class={styles.divider}>
              <Icon.CarretRight class={styles.carret} />
            </div>
          )}
          <div class={styles.item}>
            <div class={styles.highlight} />
            {() => {
              switch (node.type) {
                case NodeType.Root:
                case NodeType.Render:
                  return <NodeTypeIcon type={node.type} class={styles.typeIcon} />
                default:
                  return (
                    <>
                      <NodeTypeIcon type={node.type} class={styles.typeIcon} />
                      <div class={styles.name}>{node.name}</div>
                    </>
                  )
              }
            }}
          </div>
        </>
      ))}
    </div>
  )
}
