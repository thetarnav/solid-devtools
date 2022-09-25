import { reconcileStructure, Structure } from "../structure"
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
  let structure: Structure.Node[] = []

  const nodeMap: any = {}

  test("initial", () => {
    structure = reconcileStructure({ structure, nodeMap, updated, removed })

    expect(structure, "initial structure").toMatchObject([
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
            ],
            subroots: [
              {
                id: "5",
                name: "root2",
                type: NodeType.Root,
                attachedTo: structure[0].children[1],
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

    structure = reconcileStructure({ structure, nodeMap, updated, removed })

    expect(structure).toMatchObject([
      {
        id: "1",
        name: "root",
        length: 3,
        parent: null,
        children: [
          {
            id: "3",
            name: "child2",
            parent: structure[0],
            length: 2,
            children: [
              {
                id: "4",
                parent: structure[0].children[0],
                name: "child3",
                length: 0,
                children: [],
              },
            ],
            subroots: [
              {
                id: "5",
                name: "root2",
                parent: structure[0].children[0],
                attachedTo: structure[0].children[0],
                length: 0,
                children: [],
              },
            ],
          },
        ],
      },
      { id: "10", name: "root4", length: 0, children: [] },
    ])
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

    structure = reconcileStructure({ structure, nodeMap, updated, removed })

    expect(structure, "updated structure 2").toMatchObject([
      {
        id: "1",
        name: "root",
        parent: null,
        length: 2,
        children: [
          {
            id: "3",
            name: "child2",
            parent: structure[0],
            length: 1,
            children: [
              {
                id: "4",
                parent: structure[0].children[0],
                name: "child3",
                length: 0,
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: "8",
        name: "root3",
        length: 4,
        children: [{ id: "9", parent: structure[1], name: "child6", length: 0, children: [] }],
        subroots: [
          {
            id: "5",
            name: "root2",
            parent: structure[1],
            attachedTo: structure[1],
            length: 2,
            children: [
              {
                id: "6",
                parent: structure[1].subroots![0],
                name: "child4",
                length: 0,
                children: [],
              },
              {
                id: "7",
                parent: structure[1].subroots![0],
                name: "child5",
                length: 0,
                children: [],
              },
            ],
          },
        ],
      },
    ])
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
      // add new root (12)
      "12": {
        id: "12",
        tree: { id: "12", name: "root5", type: NodeType.Root, children: [] },
        attachedTo: "9",
      },
    }

    structure = reconcileStructure({ structure, nodeMap, updated, removed })

    expect(structure).toMatchObject([
      {
        id: "8",
        length: 2,
        parent: null,
        children: [
          {
            id: "9",
            length: 1,
            children: [],
            parent: { id: "8" },
            subroots: [
              {
                id: "12",
                parent: { id: "9" },
                attachedTo: { id: "9" },
                length: 0,
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: "5",
        length: 3,
        parent: null,
        children: [
          { id: "6", length: 0, children: [] },
          {
            id: "7",
            length: 1,
            children: [{ id: "11", length: 0, children: [] }],
          },
        ],
      },
    ])
  })
  expect(structure.length).toBe(2)
  expect(structure[1]).not.toHaveProperty("attachedTo")

  // test("remove attached node", () => {
  //   removed = ["12"]
  //   updated = {}

  //   const { structure } = mapStructureUpdates({
  //     prev: prevStructure,
  //     updated,
  //     removed,
  //     attachments,
  //     mappedRoots,
  //   })
  //   prevStructure = structure

  //   expect(prevStructure).toMatchObject([
  //     {
  //       id: "8",
  //       name: "root3",
  //       type: NodeType.Root,
  //       length: 1,
  //       children: [{ id: "9", name: "child6", type: NodeType.Component, length: 0, children: [] }],
  //     },
  //     {
  //       id: "5",
  //       name: "root2",
  //       type: NodeType.Root,
  //       length: 3,
  //       children: [
  //         { id: "6", name: "child4", type: NodeType.Component, length: 0, children: [] },
  //         {
  //           id: "7",
  //           name: "child5",
  //           type: NodeType.Refresh,
  //           length: 1,
  //           children: [
  //             { id: "11", name: "child7", type: NodeType.Computation, length: 0, children: [] },
  //           ],
  //         },
  //       ],
  //     },
  //   ])
  // })
})

// describe("mapArray example", () => {
//   test("items keeping their position after update", () => {
//     let removed: NodeID[] = []
//     let updated: Record<NodeID, Mapped.Root> = {
//       "1": {
//         id: "1",
//         tree: {
//           id: "1",
//           name: "root",
//           type: NodeType.Root,
//           children: [{ id: "2", name: "For", type: NodeType.Component, children: [] }],
//         },
//       },
//       "3": {
//         id: "3",
//         tree: { id: "3", name: "item1", type: NodeType.Root, children: [] },
//         attachedTo: "2",
//       },
//       "4": {
//         id: "4",
//         tree: { id: "4", name: "item2", type: NodeType.Root, children: [] },
//         attachedTo: "2",
//       },
//       "5": {
//         id: "5",
//         tree: { id: "5", name: "item3", type: NodeType.Root, children: [] },
//         attachedTo: "2",
//       },
//     }

//     const attachments = new Map<NodeID, Mapped.Root[]>()
//     const mappedRoots = new Map<NodeID, Mapped.Root>()

//     const { structure } = mapStructureUpdates({
//       prev: [],
//       updated,
//       removed,
//       attachments,
//       mappedRoots,
//     })

//     const goalStructure = [
//       {
//         id: "1",
//         name: "root",
//         type: NodeType.Root,
//         length: 4,
//         children: [
//           {
//             id: "2",
//             name: "For",
//             length: 3,
//             type: NodeType.Component,
//             children: [
//               { id: "3", name: "item1", length: 0, type: NodeType.Root, children: [] },
//               { id: "4", name: "item2", length: 0, type: NodeType.Root, children: [] },
//               { id: "5", name: "item3", length: 0, type: NodeType.Root, children: [] },
//             ],
//           },
//         ],
//       },
//     ]

//     expect(structure, "init").toMatchObject(goalStructure)

//     updated = {
//       "3": {
//         id: "3",
//         tree: { id: "3", name: "item1", type: NodeType.Root, children: [] },
//         attachedTo: "2",
//       },
//     }

//     const { structure: structure1 } = mapStructureUpdates({
//       prev: structure,
//       updated,
//       removed,
//       attachments,
//       mappedRoots,
//     })

//     expect(structure1, "after update").toMatchObject(goalStructure)
//   })
// })
