export const INFINITY = '__$sdt-Infinity__'
export const NEGATIVE_INFINITY = '__$sdt-NegativeInfinity__'
export const NAN = '__$sdt-NaN__'

export enum NodeType {
  Root,
  Component,
  Effect,
  Render,
  Memo,
  Computation,
  Refresh,
  Context,
  Signal,
  Store,
}

export enum ValueType {
  Number,
  Boolean,
  String,
  Null,
  Undefined,
  Symbol,
  Array,
  Object,
  Function,
  Getter,
  Element,
  Instance,
  Store,
}

export const TreeWalkerMode = {
  Owners: 'owners',
  Components: 'components',
  DOM: 'dom',
} as const
export type TreeWalkerMode = typeof TreeWalkerMode[keyof typeof TreeWalkerMode]
export const defaultWalkerMode = TreeWalkerMode.Components
