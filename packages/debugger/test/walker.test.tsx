import { getOwner, NodeType, Solid } from "@solid-devtools/shared/graph"
import { ValueType } from "@solid-devtools/shared/serialize"
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
      rootId: "ff",
      focusedId: null,
      gatherComponents: false,
    })

    dispose()

    expect(tree).toEqual({
      id: "0",
      name: UNNAMED,
      sources: 0,
      type: NodeType.Root,
      children: [
        {
          id: "1",
          name: "e0",
          sources: 0,
          type: NodeType.Effect,
          children: [
            {
              id: "2",
              name: "c0",
              sources: 1,
              type: NodeType.Computation,
              children: [],
            },
            {
              id: "3",
              name: "c1",
              sources: 0,
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

      const capturedComputationUpdates: [string, string][] = []

      const [a, setA] = createSignal(0)
      createComputed(a)

      walkSolidTree(getOwner()!, {
        onComputationUpdate: (rootId, id) => capturedComputationUpdates.push([rootId, id]),
        onSignalUpdate: () => {},
        rootId: "ff",
        focusedId: null,
        gatherComponents: false,
      })

      expect(capturedComputationUpdates.length).toBe(0)

      setA(1)

      expect(capturedComputationUpdates.length).toBe(1)
      expect(capturedComputationUpdates[0]).toEqual(["ff", "1"])

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
        rootId: "ff",
        focusedId: null,
        gatherComponents: true,
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

      let owner!: Solid.Owner

      createComputed(
        () => {
          const focused = createMemo(
            () => {
              owner = getOwner()!
              owner.sdtId = "ff"
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

      const { tree, focusedOwner, focusedOwnerDetails, focusedOwnerSignalMap } = walkSolidTree(
        getOwner()!,
        {
          rootId: "0",
          focusedId: "ff",
          onComputationUpdate: () => {},
          onSignalUpdate: () => {},
          gatherComponents: false,
        },
      )

      expect(owner).toBe(focusedOwner)

      expect(tree).toEqual({
        id: "0",
        name: UNNAMED,
        sources: 0,
        type: NodeType.Root,
        children: [
          {
            id: "1",
            name: "WRAPPER",
            sources: 1,
            type: NodeType.Computation,
            children: [
              {
                id: "ff",
                name: "focused",
                sources: 1,
                type: NodeType.Memo,
                children: [
                  {
                    id: "3",
                    name: "memo",
                    sources: 0,
                    type: NodeType.Memo,
                    children: [],
                  },
                  {
                    id: "4",
                    name: "render",
                    sources: 1,
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
        id: "ff",
        name: "focused",
        type: NodeType.Memo,
        path: ["0", "1"],
        signals: [
          {
            type: NodeType.Signal,
            id: "2",
            name: "count",
            observers: [],
            value: { type: ValueType.Number, value: 0 },
          },
          {
            type: NodeType.Memo,
            id: "3",
            name: "memo",
            observers: ["4"],
            value: { type: ValueType.Number, value: 0 },
          },
        ],
        value: { type: ValueType.String, value: "value" },
        sources: ["5"],
        observers: ["1"],
      })

      expect(focusedOwnerSignalMap).toHaveProperty("2")
      expect(focusedOwnerSignalMap).toHaveProperty("3")
      expect(focusedOwnerSignalMap["2"].sdtId).toBe("2")
      expect(focusedOwnerSignalMap["3"].sdtId).toBe("3")

      dispose()
    }))
})
