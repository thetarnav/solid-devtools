import { mapStructureUpdates, Structure } from "../structure"
import { describe, expect, test } from "vitest"
import { Mapped, NodeID, NodeType } from "@solid-devtools/shared/graph"

describe("mapStructureUpdates", () => {
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
  let prevStructure: Structure.Node[] = []

  const attachments = new Map<NodeID, Mapped.Root[]>()
  const mappedRoots = new Map<NodeID, Mapped.Root>()

  test("initial", () => {
    const { structure } = mapStructureUpdates({
      prev: [],
      updated,
      removed,
      attachments,
      mappedRoots,
    })
    prevStructure = structure

    expect(prevStructure, "initial structure").toEqual([
      {
        id: "1",
        name: "root",
        type: NodeType.Root,
        length: 5,
        children: [
          { id: "2", name: "child", type: NodeType.Component, length: 0, children: [] },
          {
            id: "3",
            name: "child2",
            type: NodeType.Effect,
            length: 3,
            children: [
              { id: "4", name: "child3", type: NodeType.Component, length: 0, children: [] },
              {
                id: "5",
                name: "root2",
                type: NodeType.Root,
                length: 1,
                children: [
                  { id: "6", name: "child4", type: NodeType.Component, length: 0, children: [] },
                ],
              },
            ],
          },
        ],
      },
    ])
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
            {
              id: "3",
              name: "child2",
              type: NodeType.Effect,
              children: [{ id: "4", name: "child3", type: NodeType.Component, children: [] }],
            },
          ],
        },
      },
      "10": {
        id: "10",
        tree: { id: "10", name: "root4", type: NodeType.Root, children: [] },
      },
      "5": {
        id: "5",
        tree: { id: "5", name: "root2", type: NodeType.Root, children: [] },
        attachedTo: "3",
      },
    }

    const { structure } = mapStructureUpdates({
      prev: prevStructure,
      updated,
      removed,
      attachments,
      mappedRoots,
    })
    prevStructure = structure

    expect(prevStructure).toEqual([
      {
        id: "1",
        name: "root",
        type: NodeType.Root,
        length: 3,
        children: [
          {
            id: "3",
            name: "child2",
            type: NodeType.Effect,
            length: 2,
            children: [
              { id: "4", name: "child3", type: NodeType.Component, length: 0, children: [] },
              { id: "5", name: "root2", type: NodeType.Root, length: 0, children: [] },
            ],
          },
        ],
      },
      { id: "10", name: "root4", type: NodeType.Root, length: 0, children: [] },
    ])
  })

  test("attach to a different node", () => {
    // UPDATE 2
    updated = {
      "5": {
        id: "5",
        attachedTo: "8",
        tree: {
          id: "5",
          name: "root2",
          type: NodeType.Root,
          children: [
            { id: "6", name: "child4", type: NodeType.Component, children: [] },
            { id: "7", name: "child5", type: NodeType.Refresh, children: [] },
          ],
        },
      },
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

    const { structure } = mapStructureUpdates({
      prev: prevStructure,
      updated,
      removed,
      attachments,
      mappedRoots,
    })
    prevStructure = structure

    expect(prevStructure, "updated structure 2").toEqual([
      {
        id: "1",
        name: "root",
        type: NodeType.Root,
        length: 2,
        children: [
          {
            id: "3",
            name: "child2",
            type: NodeType.Effect,
            length: 1,
            children: [
              { id: "4", name: "child3", type: NodeType.Component, length: 0, children: [] },
            ],
          },
        ],
      },
      {
        id: "8",
        name: "root3",
        type: NodeType.Root,
        length: 4,
        children: [
          { id: "9", name: "child6", type: NodeType.Component, length: 0, children: [] },
          {
            id: "5",
            name: "root2",
            type: NodeType.Root,
            length: 2,
            children: [
              { id: "6", name: "child4", type: NodeType.Component, length: 0, children: [] },
              { id: "7", name: "child5", type: NodeType.Refresh, length: 0, children: [] },
            ],
          },
        ],
      },
    ])
  })

  test("remove attachment", () => {
    removed = ["1"]

    updated = {
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
              children: [{ id: "11", name: "child7", type: NodeType.Computation, children: [] }],
            },
          ],
        },
      },
      "12": {
        id: "12",
        tree: { id: "12", name: "root5", type: NodeType.Root, children: [] },
        attachedTo: "9",
      },
    }

    const { structure } = mapStructureUpdates({
      prev: prevStructure,
      updated,
      removed,
      attachments,
      mappedRoots,
    })
    prevStructure = structure

    expect(prevStructure).toEqual([
      {
        id: "8",
        name: "root3",
        type: NodeType.Root,
        length: 2,
        children: [
          {
            id: "9",
            name: "child6",
            type: NodeType.Component,
            length: 1,
            children: [{ id: "12", name: "root5", type: NodeType.Root, length: 0, children: [] }],
          },
        ],
      },
      {
        id: "5",
        name: "root2",
        type: NodeType.Root,
        length: 3,
        children: [
          { id: "6", name: "child4", type: NodeType.Component, length: 0, children: [] },
          {
            id: "7",
            name: "child5",
            type: NodeType.Refresh,
            length: 1,
            children: [
              { id: "11", name: "child7", type: NodeType.Computation, length: 0, children: [] },
            ],
          },
        ],
      },
    ])
  })

  test("remove attached node", () => {
    removed = ["12"]
    updated = {}

    const { structure } = mapStructureUpdates({
      prev: prevStructure,
      updated,
      removed,
      attachments,
      mappedRoots,
    })
    prevStructure = structure

    expect(prevStructure).toEqual([
      {
        id: "8",
        name: "root3",
        type: NodeType.Root,
        length: 1,
        children: [{ id: "9", name: "child6", type: NodeType.Component, length: 0, children: [] }],
      },
      {
        id: "5",
        name: "root2",
        type: NodeType.Root,
        length: 3,
        children: [
          { id: "6", name: "child4", type: NodeType.Component, length: 0, children: [] },
          {
            id: "7",
            name: "child5",
            type: NodeType.Refresh,
            length: 1,
            children: [
              { id: "11", name: "child7", type: NodeType.Computation, length: 0, children: [] },
            ],
          },
        ],
      },
    ])
  })
})

describe("mapArray example", () => {
  test("items keeping their position after update", () => {
    let removed: NodeID[] = []
    let updated: Record<NodeID, Mapped.Root> = {
      "1": {
        id: "1",
        tree: {
          id: "1",
          name: "root",
          type: NodeType.Root,
          children: [{ id: "2", name: "For", type: NodeType.Component, children: [] }],
        },
      },
      "3": {
        id: "3",
        tree: { id: "3", name: "item1", type: NodeType.Root, children: [] },
        attachedTo: "2",
      },
      "4": {
        id: "4",
        tree: { id: "4", name: "item2", type: NodeType.Root, children: [] },
        attachedTo: "2",
      },
      "5": {
        id: "5",
        tree: { id: "5", name: "item3", type: NodeType.Root, children: [] },
        attachedTo: "2",
      },
    }

    const attachments = new Map<NodeID, Mapped.Root[]>()
    const mappedRoots = new Map<NodeID, Mapped.Root>()

    const { structure } = mapStructureUpdates({
      prev: [],
      updated,
      removed,
      attachments,
      mappedRoots,
    })

    const goalStructure = [
      {
        id: "1",
        name: "root",
        type: NodeType.Root,
        length: 4,
        children: [
          {
            id: "2",
            name: "For",
            length: 3,
            type: NodeType.Component,
            children: [
              { id: "3", name: "item1", length: 0, type: NodeType.Root, children: [] },
              { id: "4", name: "item2", length: 0, type: NodeType.Root, children: [] },
              { id: "5", name: "item3", length: 0, type: NodeType.Root, children: [] },
            ],
          },
        ],
      },
    ]

    expect(structure, "init").toEqual(goalStructure)

    updated = {
      "3": {
        id: "3",
        tree: { id: "3", name: "item1", type: NodeType.Root, children: [] },
        attachedTo: "2",
      },
    }

    const { structure: structure1 } = mapStructureUpdates({
      prev: structure,
      updated,
      removed,
      attachments,
      mappedRoots,
    })

    expect(structure1, "after update").toEqual(goalStructure)
  })
})
