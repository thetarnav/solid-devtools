import { getOwner, OwnerType, SignalUpdatePayload } from "@shared/graph"
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
			type: OwnerType.Root,
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
		expect(tree).toEqual(JSON.parse(JSON.stringify(tree)))
		expect(components).toEqual([])
	})

	it("track signals", () => {
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
			type: OwnerType.Root,
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
		expect(tree).toEqual(JSON.parse(JSON.stringify(tree)))
		expect(components).toEqual([])
	})

	it("listen to batched updates", () =>
		createRoot(dispose => {
			const walkSolidTree = getModule()

			const capturedSignalUpdates: SignalUpdatePayload[] = []
			const capturedComputationUpdates: number[] = []

			const [a, setA] = createSignal(0)
			createComputed(a)

			walkSolidTree(getOwner()!, {
				onComputationUpdate: id => capturedComputationUpdates.push(id),
				onSignalUpdate: e => capturedSignalUpdates.push(e),
				rootId: 123,
				trackBatchedUpdates: true,
				trackComponents: false,
				trackSignals: true,
			})

			expect(capturedSignalUpdates.length).toBe(0)
			expect(capturedComputationUpdates.length).toBe(0)

			setA(1)

			expect(capturedComputationUpdates.length).toBe(1)
			expect(typeof capturedComputationUpdates[0]).toBe("number")
			expect(capturedSignalUpdates.length).toBe(1)
			expect(typeof capturedSignalUpdates[0].id).toBe("number")
			expect(capturedSignalUpdates[0].value).toBe(1)
			expect(capturedSignalUpdates[0].oldValue).toBe(0)

			dispose()
		}))
})
