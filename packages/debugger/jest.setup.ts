import { jest } from '@jest/globals'

jest.mock('object-observer', () => ({
  Observable: {
    from: (obj: any) => obj,
    observe: () => void 0,
    unobserve: () => void 0,
  },
}))

export {}
