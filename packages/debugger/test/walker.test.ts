import { getOwner, NodeType } from "@solid-devtools/shared/graph"
import { UNNAMED } from "@solid-devtools/shared/variables"
import { createComputed, createEffect, createRoot, createSignal } from "solid-js"
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
    jest.resetModules()
  })

  it("default options", () => {
    const walkSolidTree = getModule()

    const [dispose, owner] = createRoot(dispose => {
      mockTree()
      return [dispose, getOwner()!]
    })

    const { tree, components } = walkSolidTree(owner, {
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
      expect(typeof capturedComputationUpdates[0]).toBe("number")

      dispose()
    }))
})
