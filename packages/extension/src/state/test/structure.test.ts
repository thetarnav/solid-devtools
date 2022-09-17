import { mapStructureUpdates, Structure } from "../structure"
import { describe, expect, test } from "vitest"
import { Mapped, NodeID, NodeType } from "@solid-devtools/shared/graph"

describe("mapStructureUpdates", () => {
  let updated: Mapped.Root[] = [
    {
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
    {
      id: "5",
      tree: {
        id: "5",
        name: "root2",
        type: NodeType.Root,
        children: [{ id: "6", name: "child4", type: NodeType.Component, children: [] }],
      },
      attachedTo: "3",
    },
  ]
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
    updated = [
      {
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
      {
        id: "10",
        tree: { id: "10", name: "root4", type: NodeType.Root, children: [] },
      },
      {
        id: "5",
        tree: { id: "5", name: "root2", type: NodeType.Root, children: [] },
        attachedTo: "3",
      },
    ]

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
    updated = [
      {
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
      {
        id: "8",
        tree: {
          id: "8",
          name: "root3",
          type: NodeType.Root,
          children: [{ id: "9", name: "child6", type: NodeType.Component, children: [] }],
        },
      },
    ]

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

    updated = [
      {
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
      {
        id: "12",
        tree: { id: "12", name: "root5", type: NodeType.Root, children: [] },
        attachedTo: "9",
      },
    ]

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
    updated = []

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
