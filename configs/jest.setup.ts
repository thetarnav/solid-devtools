jest.mock("@otonashixav/solid-flip", () => ({
	TransitionGroup: (p: any) => p.children,
	animateExit: () => {},
	animateEnter: () => {},
}))

export {}
