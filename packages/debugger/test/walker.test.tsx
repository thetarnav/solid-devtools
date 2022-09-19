import { describe, beforeEach, jest, it, expect } from "@jest/globals"
import { getOwner, Mapped, NodeType, Solid } from "@solid-devtools/shared/graph"
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
      createComputed(() => createSignal(0, { name: "s3" }), undefined, { name: "c1" })
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
      return [dispose, getOwner()! as Solid.Root]
    })

    const { root, components, inspectedOwner } = walkSolidTree(owner, {
      onComputationUpdate: () => {},
      rootId: "ff",
      inspectedId: null,
      gatherComponents: false,
    })

    dispose()

    expect(root.tree).toEqual({
      id: "0",
      name: UNNAMED,
      type: NodeType.Root,
      children: [
        {
          id: "1",
          name: "e0",
          type: NodeType.Effect,
          children: [
            { id: "2", name: "c0", type: NodeType.Computation, children: [] },
            { id: "3", name: "c1", type: NodeType.Computation, children: [] },
          ],
        },
      ],
    })
    expect(root.tree).toEqual(JSON.parse(JSON.stringify(root.tree)))
    expect(components).toEqual([])
    expect(inspectedOwner).toBe(null)
  })

  it("listen to computation updates", () =>
    createRoot(dispose => {
      const walkSolidTree = getModule()

      const capturedComputationUpdates: [string, string][] = []

      const [a, setA] = createSignal(0)
      createComputed(a)

      walkSolidTree(getOwner()! as Solid.Root, {
        onComputationUpdate: (rootId, id) => capturedComputationUpdates.push([rootId, id]),
        rootId: "ff",
        inspectedId: null,
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

      const { components } = walkSolidTree(getOwner()! as Solid.Root, {
        onComputationUpdate: () => {},
        rootId: "ff",
        inspectedId: null,
        gatherComponents: true,
      })

      expect(components.length).toBe(7)

      let testCompsLength = 0
      let btn!: Mapped.Component
      components.forEach(c => {
        if (c.name === "TestComponent" && c.element instanceof HTMLDivElement) testCompsLength++
        else btn = c
      })
      expect(testCompsLength).toBe(6)

      expect(btn).toBeTruthy()
      expect(btn.name).toBe("Button")
      expect(btn.element).toBeInstanceOf(HTMLButtonElement)

      dispose()
    }))

  it("returns inspected owner", () =>
    createRoot(dispose => {
      const walkSolidTree = getModule()
      const [s, setS] = createSignal(0, { name: "source" })

      let owner!: Solid.Owner
      const div = document.createElement("div")

      createComputed(
        () => {
          const focused = createMemo(
            () => {
              owner = getOwner()!
              owner.sdtId = "ff"
              s()
              createSignal(div, { name: "element" })
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

      const { root, inspectedOwner } = walkSolidTree(getOwner()! as Solid.Root, {
        rootId: "0",
        inspectedId: "ff",
        onComputationUpdate: () => {},
        gatherComponents: false,
      })

      expect(owner).toBe(inspectedOwner)

      expect(root.tree).toEqual({
        id: "0",
        name: UNNAMED,
        type: NodeType.Root,
        children: [
          {
            id: "1",
            name: "WRAPPER",
            type: NodeType.Computation,
            children: [
              {
                id: "ff",
                name: "focused",
                type: NodeType.Memo,
                children: [
                  { id: "2", name: "memo", type: NodeType.Memo, children: [] },
                  { id: "3", name: "render", type: NodeType.Render, children: [] },
                ],
              },
            ],
          },
        ],
      })

      dispose()
    }))
})
