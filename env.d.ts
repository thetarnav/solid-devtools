export {}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Array<T> {
    includes(searchElement: unknown, fromIndex?: number): boolean
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ReadonlyArray<T> {
    includes(searchElement: unknown, fromIndex?: number): boolean
  }
}
