import { getOwner, OwnerType } from "@shared/graph"
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
			trackBatchedUpdates: false,
			trackComponents: false,
			trackSignals: false,
		})

		dispose()

		expect(tree).toEqual({
			id: 0,
			name: "(anonymous)",
			signals: [],
			sources: [],
			type: OwnerType.Computation,
			children: [
				{
					id: 1,
					name: "e0",
					signals: [],
					sources: [],
					type: OwnerType.Effect,
					children: [
						{
							id: 2,
							name: "c0",
							signals: [],
							sources: [3],
							type: OwnerType.Computation,
							children: [],
						},
						{
							id: 4,
							name: "c1",
							signals: [],
							sources: [],
							type: OwnerType.Computation,
							children: [],
						},
					],
				},
			],
		})
		expect(components).toEqual([])
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
			trackBatchedUpdates: false,
			trackComponents: false,
			trackSignals: true,
		})

		dispose()

		expect(tree).toEqual({
			id: 0,
			name: "(anonymous)",
			sources: [],
			type: OwnerType.Computation,
			signals: [
				{
					id: 1,
					name: "s0",
					observers: [2],
					value: "foo",
				},
				{
					id: 3,
					name: "s1",
					observers: [],
					value: "hello",
				},
			],
			children: [
				{
					id: 4,
					name: "e0",
					signals: [
						{
							id: 5,
							name: "s2",
							observers: [],
							value: "[object Object]",
						},
					],
					sources: [],
					type: OwnerType.Effect,
					children: [
						{
							id: 2,
							name: "c0",
							signals: [],
							sources: [1],
							type: OwnerType.Computation,
							children: [],
						},
						{
							id: 6,
							name: "c1",
							signals: [
								{
									id: 7,
									name: "s3",
									observers: [],
									value: 0,
								},
							],
							sources: [],
							type: OwnerType.Computation,
							children: [],
						},
					],
				},
			],
		})
		expect(components).toEqual([])
	})
})
