import { Structure } from "../structure"
import { reconcileStructure } from "../structure-reconcile"
import { describe, expect, test } from "vitest"
import { Mapped, NodeID, NodeType } from "@solid-devtools/shared/graph"

describe("reconcileStructure", () => {
  let updated: Record<NodeID, Mapped.Root> = {
    "1": {
      id: "1",
      tree: {
        id: "1",
        name: "root",
        type: NodeType.Root,
        children: [
          { id: "2", name: "child", type: NodeType.Component, children: [] },
          {
            id: "3",
            name: "child2",
            type: NodeType.Effect,
            children: [{ id: "4", name: "child3", type: NodeType.Component, children: [] }],
          },
        ],
      },
    },
    "5": {
      id: "5",
      tree: {
        id: "5",
        name: "root2",
        type: NodeType.Root,
        children: [{ id: "6", name: "child4", type: NodeType.Component, children: [] }],
      },
      attachedTo: "3",
    },
  }
  let removed: NodeID[] = []

  let prevRoots: Structure.Node[] = []

  test("initial", () => {
    const { roots, nodeList } = reconcileStructure(prevRoots, updated, removed)
    prevRoots = roots

    expect(nodeList).toMatchObject([
      { id: "1", parent: null, children: [{ id: "2" }, { id: "3" }] },
      { id: "2", parent: { id: "1" }, children: [] },
      { id: "3", parent: { id: "1" }, children: [{ id: "4" }], subroots: [{ id: "5" }] },
      { id: "4", parent: { id: "3" }, children: [] },
      { id: "5", parent: { id: "3" }, children: [{ id: "6" }] },
      { id: "6", parent: { id: "5" }, children: [] },
    ])

    expect(roots).toMatchObject([{ id: "1" }])
  })

  test("update", () => {
    updated = {
      "1": {
        id: "1",
        tree: {
          id: "1",
          name: "root",
          type: NodeType.Root,
          children: [
            // removed child (2)
            {
              id: "3",
              name: "child2",
              type: NodeType.Effect,
              children: [{ id: "4", name: "child3", type: NodeType.Component, children: [] }],
            },
          ],
        },
      },
      // added new top-level root (10)
      "10": {
        id: "10",
        tree: { id: "10", name: "root4", type: NodeType.Root, children: [] },
      },
      "5": {
        id: "5",
        // removed child (6)
        tree: { id: "5", name: "root2", type: NodeType.Root, children: [] },
        attachedTo: "3",
      },
    }

    const { roots, nodeList } = reconcileStructure(prevRoots, updated, removed)
    prevRoots = roots

    expect(nodeList).toHaveLength(5)
    expect(nodeList).toMatchObject([
      { id: "1", parent: null, children: [{ id: "3" }] },
      { id: "3", parent: { id: "1" }, children: [{ id: "4" }], subroots: [{ id: "5" }] },
      { id: "4", parent: { id: "3" }, children: [] },
      { id: "5", parent: { id: "3" }, children: [] },
      { id: "10", parent: null, children: [] },
    ])

    expect(roots).toMatchObject([{ id: "1" }, { id: "10" }])
  })

  test("attach to a different node", () => {
    // UPDATE 2
    updated = {
      "5": {
        id: "5",
        // changed attachment from 3 to 8
        attachedTo: "8",
        tree: {
          id: "5",
          name: "root2",
          type: NodeType.Root,
          children: [
            // add two children (6, 7)
            { id: "6", name: "child4", type: NodeType.Component, children: [] },
            { id: "7", name: "child5", type: NodeType.Refresh, children: [] },
          ],
        },
      },
      // add new root (8)
      "8": {
        id: "8",
        tree: {
          id: "8",
          name: "root3",
          type: NodeType.Root,
          children: [{ id: "9", name: "child6", type: NodeType.Component, children: [] }],
        },
      },
    }

    removed = ["10"]

    const { roots, nodeList } = reconcileStructure(prevRoots, updated, removed)
    prevRoots = roots

    expect(nodeList).toHaveLength(8)
    expect(nodeList).toMatchObject([
      { id: "1", parent: null, children: [{ id: "3" }] },
      { id: "3", parent: { id: "1" }, children: [{ id: "4" }] },
      { id: "4", parent: { id: "3" }, children: [] },
      { id: "8", parent: null, children: [{ id: "9" }], subroots: [{ id: "5" }] },
      { id: "9", parent: { id: "8" }, children: [] },
      { id: "5", parent: { id: "8" }, children: [{ id: "6" }, { id: "7" }] },
      { id: "6", parent: { id: "5" }, children: [] },
      { id: "7", parent: { id: "5" }, children: [] },
    ])

    expect(roots).toHaveLength(2)
    expect(roots[0].id).toBe("1")
    expect(roots[1].id).toBe("8")
  })

  test("remove attachment", () => {
    removed = ["1"]

    updated = {
      // remove attachment from 8
      "5": {
        id: "5",
        tree: {
          id: "5",
          name: "root2",
          type: NodeType.Root,
          children: [
            { id: "6", name: "child4", type: NodeType.Component, children: [] },
            {
              id: "7",
              name: "child5",
              type: NodeType.Refresh,
              // add a child (11)
              children: [{ id: "11", name: "child7", type: NodeType.Computation, children: [] }],
            },
          ],
        },
      },
      // add new subroot (12) attached to 9
      "12": {
        id: "12",
        tree: { id: "12", name: "root5", type: NodeType.Root, children: [] },
        attachedTo: "9",
      },
    }

    const { roots, nodeList } = reconcileStructure(prevRoots, updated, removed)
    prevRoots = roots

    expect(nodeList).toHaveLength(7)
    expect(nodeList).toMatchObject([
      { id: "8", parent: null, children: [{ id: "9" }] },
      { id: "9", parent: { id: "8" }, children: [], subroots: [{ id: "12" }] },
      { id: "12", parent: { id: "9" }, children: [] },
      { id: "5", parent: null, children: [{ id: "6" }, { id: "7" }] },
      { id: "6", parent: { id: "5" }, children: [] },
      { id: "7", parent: { id: "5" }, children: [{ id: "11" }] },
      { id: "11", parent: { id: "7" }, children: [] },
    ])

    expect(roots).toHaveLength(2)
    expect(roots[0].id).toBe("8")
    expect(roots[1].id).toBe("5")
  })

  test("remove attached node", () => {
    removed = ["12"]
    updated = {}

    const { roots, nodeList } = reconcileStructure(prevRoots, updated, removed)
    prevRoots = roots

    expect(nodeList).toHaveLength(6)
    expect(nodeList).toMatchObject([
      { id: "8", parent: null, children: [{ id: "9" }] },
      { id: "9", parent: { id: "8" }, children: [] },
      { id: "5", parent: null, children: [{ id: "6" }, { id: "7" }] },
      { id: "6", parent: { id: "5" }, children: [] },
      { id: "7", parent: { id: "5" }, children: [{ id: "11" }] },
      { id: "11", parent: { id: "7" }, children: [] },
    ])

    expect(roots).toHaveLength(2)
    expect(roots[0].id).toBe("8")
    expect(roots[1].id).toBe("5")
  })
})

describe("mapArray example", () => {
  test("items keeping their position after update", () => {
    const n1: Structure.Node = {
      id: "1",
      name: "root",
      type: NodeType.Root,
      parent: null,
      children: [],
    }
    const n2: Structure.Node = {
      id: "2",
      name: "For",
      type: NodeType.Component,
      parent: n1,
      children: [],
    }
    const n3: Structure.Node = {
      id: "3",
      name: "item1",
      type: NodeType.Root,
      parent: n2,
      children: [],
    }
    const n4: Structure.Node = {
      id: "4",
      name: "item2",
      type: NodeType.Root,
      parent: n2,
      children: [],
    }
    const n5: Structure.Node = {
      id: "5",
      name: "item3",
      type: NodeType.Root,
      parent: n2,
      children: [],
    }
    ;(n1 as any).children = [n2]
    ;(n2 as any).subroots = [n3, n4, n5]

    const updated: Record<NodeID, Mapped.Root> = {
      "3": {
        id: "3",
        tree: { id: "3", name: "item1", type: NodeType.Root, children: [] },
        attachedTo: "2",
      },
    }

    const prevRoots: Structure.Node[] = [n1]
    const prevNodeList: Structure.Node[] = [n1, n2, n3, n4, n5]

    const { roots, nodeList } = reconcileStructure(prevRoots, updated, [])

    expect(roots).toEqual(prevRoots)
    expect(nodeList).toEqual(prevNodeList)
  })
})
