import { getOwner, NodeType, SolidOwner } from "@solid-devtools/shared/graph"
import { UNNAMED } from "@solid-devtools/shared/variables"
import {
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  createRoot,
  createSignal,
} from "solid-js"
import type * as API from "../src/walker"

const getModule = (): typeof API.walkSolidTree => require("../src/walker").walkSolidTree

const mockTree = () => {
  const [s] = createSignal("foo", { name: "s0" })
  createSignal("hello", { name: "s1" })

  createEffect(
    () => {
      createSignal({ bar: "baz" }, { name: "s2" })

      createComputed(s, undefined, { name: "c0" })
      createComputed(
        () => {
          createSignal(0, { name: "s3" })
        },
        undefined,
        { name: "c1" },
      )
    },
    undefined,
    { name: "e0" },
  )
}

describe("walkSolidTree", () => {
  beforeEach(() => {
    delete (window as any).Solid$$
    jest.resetModules()
  })

  it("default options", () => {
    const walkSolidTree = getModule()

    const [dispose, owner] = createRoot(dispose => {
      mockTree()
      return [dispose, getOwner()!]
    })

    const { tree, components, focusedOwner, focusedOwnerDetails } = walkSolidTree(owner, {
      onComputationUpdate: () => {},
      onSignalUpdate: () => {},
      rootId: 123,
      focusedID: null,
      gatherComponents: false,
      observeComputations: false,
    })

    dispose()

    expect(tree).toEqual({
      id: 0,
      name: UNNAMED,
      sources: [],
      type: NodeType.Root,
      children: [
        {
          id: 1,
          name: "e0",
          sources: [],
          type: NodeType.Effect,
          children: [
            {
              id: 2,
              name: "c0",
              sources: [3],
              type: NodeType.Computation,
              children: [],
            },
            {
              id: 4,
              name: "c1",
              sources: [],
              type: NodeType.Computation,
              children: [],
            },
          ],
        },
      ],
    })
    expect(tree).toEqual(JSON.parse(JSON.stringify(tree)))
    expect(components).toEqual([])
    expect(focusedOwner).toBe(null)
    expect(focusedOwnerDetails).toBe(null)
  })

  it("listen to computation updates", () =>
    createRoot(dispose => {
      const walkSolidTree = getModule()

      const capturedComputationUpdates: number[] = []

      const [a, setA] = createSignal(0)
      createComputed(a)

      walkSolidTree(getOwner()!, {
        onComputationUpdate: id => capturedComputationUpdates.push(id),
        onSignalUpdate: () => {},
        rootId: 123,
        focusedID: null,
        gatherComponents: false,
        observeComputations: true,
      })

      expect(capturedComputationUpdates.length).toBe(0)

      setA(1)

      expect(capturedComputationUpdates.length).toBe(1)
      expect(capturedComputationUpdates[0]).toBe(1)

      dispose()
    }))

  it("gathers components", () =>
    createRoot(dispose => {
      const walkSolidTree = getModule()

      const TestComponent = (props: { n: number }) => {
        const [a] = createSignal(0)
        createComputed(a)
        return <div>{props.n === 0 ? "end" : <TestComponent n={props.n - 1} />}</div>
      }
      const Button = () => {
        return <button>Click me</button>
      }

      createRenderEffect(() => {
        return (
          <>
            <TestComponent n={5} />
            <Button />
          </>
        )
      })

      const { components } = walkSolidTree(getOwner()!, {
        onComputationUpdate: () => {},
        onSignalUpdate: () => {},
        rootId: 123,
        focusedID: null,
        gatherComponents: true,
        observeComputations: false,
      })

      expect(components.length).toBe(7)

      for (let i = 0; i < 6; i++) {
        const comp = components[i]
        expect(comp.name).toBe("TestComponent")
        expect(comp.resolved).toBeInstanceOf(HTMLDivElement)
      }

      expect(components[6].name).toBe("Button")
      expect(components[6].resolved).toBeInstanceOf(HTMLButtonElement)

      dispose()
    }))

  it("collects focused owner details", () =>
    createRoot(dispose => {
      const walkSolidTree = getModule()
      const [s, setS] = createSignal(0, { name: "source" })

      let owner!: SolidOwner

      createComputed(
        () => {
          const focused = createMemo(
            () => {
              owner = getOwner()!
              owner.sdtId = 123
              s()
              createSignal(0, { name: "count" })
              const memo = createMemo(() => 0, undefined, { name: "memo" })
              createRenderEffect(memo, undefined, { name: "render" })
              return "value"
            },
            undefined,
            { name: "focused" },
          )
          focused()
        },
        undefined,
        { name: "WRAPPER" },
      )

      const { tree, focusedOwner, focusedOwnerDetails } = walkSolidTree(getOwner()!, {
        rootId: 0,
        focusedID: 123,
        onComputationUpdate: () => {},
        onSignalUpdate: () => {},
        gatherComponents: false,
        observeComputations: false,
      })

      expect(owner).toBe(focusedOwner)

      expect(tree).toEqual({
        id: 0,
        name: UNNAMED,
        sources: [],
        type: NodeType.Root,
        children: [
          {
            id: 1,
            name: "WRAPPER",
            sources: [123],
            type: NodeType.Computation,
            children: [
              {
                id: 123,
                name: "focused",
                sources: [5],
                type: NodeType.Memo,
                children: [
                  {
                    id: 3,
                    name: "memo",
                    sources: [],
                    type: NodeType.Memo,
                    children: [],
                  },
                  {
                    id: 4,
                    name: "render",
                    sources: [3],
                    type: NodeType.Render,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      })

      expect(focusedOwnerDetails).toEqual({
        id: 123,
        name: "focused",
        type: NodeType.Memo,
        path: [0, 1],
        signals: [
          { type: NodeType.Signal, id: 2, name: "count", observers: [], value: 0 },
          { type: NodeType.Memo, id: 3, name: "memo", observers: [4], value: 0 },
        ],
        value: "value",
        sources: [5],
        observers: [1],
      })

      dispose()
    }))
})
