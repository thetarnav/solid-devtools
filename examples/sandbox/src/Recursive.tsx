import {type Component, createContext, For, mergeProps, splitProps, useContext} from 'solid-js'
import {createStore} from 'solid-js/store'

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
function genNodePath({nodeId, parentsPath = [], accessKey = 'children'}: genNodePathInterface) {
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
        <div style={{
            "border": "1px solid #1e293b",
            "border-radius": "8px",
            "padding": "0.5rem",
            "margin": "1rem",
            "gap": "0.5rem"
        }}>
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
            style={{
                "border-radius": "9999px",
                "background-color": "#1e293b"
            }}
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
                {id: 1, children: [{id: 2, children: []}]},
                {id: 3, children: []},
            ],
        },
    ])

    const addNode = (nodeId: number, parentsPath: number[]) => {
        setData(
            // @ts-ignore
            ...genNodePath({nodeId, parentsPath}),
            (children: any) => [...children, {id: ++id, children: []}],
        )
    }

    return (
        <RecursiveContext.Provider value={addNode}>
            <For each={data}>{page => <Node {...page} />}</For>
        </RecursiveContext.Provider>
    )
}

export default Recursive
