import { mapStructureUpdates, collapseStructureNode } from "../structure"
import { describe, expect, test } from "vitest"
import { Mapped, NodeID, NodeType } from "@solid-devtools/shared/graph"

describe("collapsing", () => {
  test("collapse", () => {
    let removed: NodeID[] = []
    let updated: Record<NodeID, Mapped.Root> = {
      "1": {
        id: "1",
        tree: {
          id: "1",
          name: "root",
          type: NodeType.Root,
          children: [
            { id: "2", name: "For", type: NodeType.Component, children: [] },
            {
              id: "2a",
              name: "For",
              type: NodeType.Memo,
              children: [{ id: "2b", name: "For", type: NodeType.Component, children: [] }],
            },
          ],
        },
      },
      "3": {
        id: "3",
        tree: {
          id: "3",
          name: "item1",
          type: NodeType.Root,
          children: [
            {
              id: "6",
              name: "...",
              type: NodeType.Component,
              children: [{ id: "7", name: "ef", type: NodeType.Component, children: [] }],
            },
          ],
        },
        attachedTo: "2",
      },
      "4": {
        id: "4",
        tree: { id: "4", name: "item2", type: NodeType.Root, children: [] },
        attachedTo: "2",
      },
    }

    const attachments = new Map<NodeID, Mapped.Root[]>()
    const mappedRoots = new Map<NodeID, Mapped.Root>()

    const { structure, nodeMap } = mapStructureUpdates({
      prev: [],
      updated,
      removed,
      attachments,
      mappedRoots,
    })

    expect(structure, "init").toMatchObject([
      {
        id: "1",
        length: 7,
        children: [
          {
            id: "2",
            length: 4,
            children: [
              {
                id: "3",
                length: 2,
                children: [
                  {
                    id: "6",
                    length: 1,
                    children: [{ id: "7", length: 0, children: [] }],
                  },
                ],
              },
              { id: "4", length: 0, children: [] },
            ],
          },
          {
            id: "2a",
            length: 1,
            children: [{ id: "2b", length: 0, children: [] }],
          },
        ],
      },
    ])

    expect(structure[0].parent).toBe(null)
    expect(structure[0].children[0].parent).toBe(structure[0])
    expect(structure[0].children[1].parent).toBe(structure[0])
    expect(structure[0].children[0].children[0].parent).toBe(structure[0].children[0])
    expect(structure[0].children[0].children[1].parent).toBe(structure[0].children[0])
    expect(structure[0].children[1].children[0].parent).toBe(structure[0].children[1])

    collapseStructureNode({
      node: structure[0].children[0],
      collapsed: true,
      attachments,
      mappedRoots,
      nodeMap,
    })

    expect(structure, "collapsed").toMatchObject([
      {
        id: "1",
        parent: null,
        length: 3,
        children: [
          {
            id: "2",
            collapsed: true,
            length: 4,
            parent: structure[0],
            children: [
              {
                id: "3",
                parent: structure[0].children[0],
                length: 2,
                children: [
                  {
                    id: "6",
                    parent: structure[0].children[0].children[0],
                    length: 1,
                    children: [
                      {
                        id: "7",
                        parent: structure[0].children[0].children[0].children[0],
                        length: 0,
                        children: [],
                      },
                    ],
                  },
                ],
              },
              { id: "4", parent: structure[0].children[0], length: 0, children: [] },
            ],
          },
          {
            id: "2a",
            length: 1,
            parent: structure[0],
            children: [{ id: "2b", parent: structure[0].children[1], length: 0, children: [] }],
          },
        ],
      },
    ])

    collapseStructureNode({
      node: structure[0].children[0],
      collapsed: false,
      attachments,
      mappedRoots,
      nodeMap,
    })

    expect(structure, "extended").toMatchObject([
      {
        id: "1",
        length: 7,
        children: [
          {
            id: "2",
            collapsed: false,
            length: 4,
            children: [
              {
                id: "3",
                length: 2,
                children: [
                  {
                    id: "6",
                    length: 1,
                    children: [{ id: "7", length: 0, children: [] }],
                  },
                ],
              },
              { id: "4", length: 0, children: [] },
            ],
          },
          {},
        ],
      },
    ])

    collapseStructureNode({
      node: structure[0].children[0],
      collapsed: true,
      attachments,
      mappedRoots,
      nodeMap,
    })

    collapseStructureNode({
      node: structure[0].children[0].children[0].children[0], // 6
      collapsed: true,
      attachments,
      mappedRoots,
      nodeMap,
    })

    expect(structure, "collapsed two").toMatchObject([
      {
        id: "1",
        length: 3,
        children: [
          {
            id: "2",
            collapsed: true,
            length: 4,
            children: [
              {
                id: "3",
                length: 1,
                children: [
                  {
                    id: "6",
                    length: 1,
                    collapsed: true,
                    children: [{ id: "7", length: 0, children: [] }],
                  },
                ],
              },
              { id: "4", length: 0, children: [] },
            ],
          },
          {},
        ],
      },
    ])

    collapseStructureNode({
      node: structure[0].children[0].children[0].children[0], // 6
      collapsed: false,
      attachments,
      mappedRoots,
      nodeMap,
    })

    expect(structure, "extended inner").toMatchObject([
      {
        id: "1",
        length: 3,
        children: [
          {
            id: "2",
            collapsed: true,
            length: 4,
            children: [
              {
                id: "3",
                length: 2,
                children: [
                  {
                    id: "6",
                    length: 1,
                    collapsed: false,
                    children: [{ id: "7", length: 0, children: [] }],
                  },
                ],
              },
              { id: "4", length: 0, children: [] },
            ],
          },
          {},
        ],
      },
    ])

    collapseStructureNode({
      node: structure[0].children[0].children[0].children[0], // 6
      collapsed: true,
      attachments,
      mappedRoots,
      nodeMap,
    })

    collapseStructureNode({
      node: structure[0].children[0],
      collapsed: false,
      attachments,
      mappedRoots,
      nodeMap,
    })

    let structureMatch = [
      {
        id: "1",
        length: 7,
        children: [
          {
            id: "2",
            collapsed: false,
            length: 4,
            children: [
              {
                id: "3",
                length: 1,
                children: [
                  {
                    id: "6",
                    length: 1,
                    collapsed: true,
                    children: [{ id: "7", length: 0, children: [] }],
                  },
                ],
              },
              { id: "4", length: 0, children: [] },
            ],
          },
          {},
        ],
      },
    ]

    expect(structure, "extended outer").toMatchObject(structureMatch)

    // const { structure: structure1 } = mapStructureUpdates({
    //   prev: structure,
    //   attachments,
    //   mappedRoots,
    //   removed: [],
    //   updated: {},
    // })

    // expect(structure1, "extended outer").toMatchObject(structureMatch)
  })
})
