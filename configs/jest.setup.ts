jest.mock("@otonashixav/solid-flip", () => ({
  TransitionGroup: (p: any) => p.children,
  animateExit: () => {},
  animateEnter: () => {},
}))

jest.mock("object-observer", () => ({
  Observable: {
    from: (obj: any) => obj,
    observe: () => void 0,
    unobserve: () => void 0,
  },
}))

export {}
