import { Component, For, splitProps, mergeProps, createContext, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'

type NodeType = {
  id: number
  children?: Array<NodeType>
  parents?: Array<number>
}

let id: number = 3

interface genNodePathInterface {
  nodeId: number
  parentsPath?: Array<number>
  accessKey?: string
}
function genNodePath({ nodeId, parentsPath = [], accessKey = 'children' }: genNodePathInterface) {
  let path = parentsPath.concat(nodeId)
  let nodePath: Array<Function | string> = []
  path.forEach(id => {
    nodePath.push(...[(child: NodeType) => child.id === id, accessKey])
  })
  return nodePath
}

// Printed url path
function genNodeUrl(nodeProps: any) {
  let urlFormat = `${nodeProps.id}`
  let url = nodeProps?.url ? [...nodeProps.url, urlFormat] : [urlFormat]
  return url
}

// Recursive component
const Node: Component<NodeType> = props => {
  let [childrenProps, nodeProps] = splitProps(props, ['children'])
  // To store local component signals
  type nodeSignalsType = {
    parents: Array<number>
    url: Array<string>
  }
  const [nodeSignals, setNodeSignals] = createStore<nodeSignalsType>({
    parents: nodeProps?.parents ? nodeProps?.parents : [],
    url: genNodeUrl(nodeProps),
  })

  const addNode = useContext(RecursiveContext)

  return (
    <div class="border-2 rounded-lg p-1 space-y-1 m-1">
      <p>{nodeSignals.url.join(' > ')}</p>
      <For each={childrenProps.children}>
        {node => {
          const childProps = mergeProps(
            {
              parents: [...nodeSignals.parents, nodeProps.id],
              url: nodeSignals.url,
            },
            node,
          )
          return <Node {...childProps} />
        }}
      </For>
      <button
        class="rounded-full bg-slate-300 px-2"
        onClick={e => addNode(nodeProps.id, nodeSignals.parents)}
      >
        Add item
      </button>
    </div>
  )
}

const RecursiveContext = createContext<(nodeId: number, parentsPath: number[]) => void>(() => {})

const Recursive: Component = props => {
  const [data, setData] = createStore<NodeType[]>([
    {
      id: 0,
      children: [
        { id: 1, children: [{ id: 2, children: [] }] },
        { id: 3, children: [] },
      ],
    },
  ])

  const addNode = (nodeId: number, parentsPath: number[]) => {
    setData(
      // @ts-ignore
      ...genNodePath({ nodeId, parentsPath }),
      (children: any) => [...children, { id: ++id, children: [] }],
    )
  }

  return (
    <RecursiveContext.Provider value={addNode}>
      <For each={data}>{page => <Node {...page} />}</For>
    </RecursiveContext.Provider>
  )
}

export default Recursive
