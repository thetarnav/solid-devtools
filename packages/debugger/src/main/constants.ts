export const INFINITY = '__$sdt-Infinity__'
export const NEGATIVE_INFINITY = '__$sdt-NegativeInfinity__'
export const NAN = '__$sdt-NaN__'

export enum NodeType {
  Root = 'root',
  Component = 'component',
  Element = 'element',
  Effect = 'effect',
  Render = 'render',
  Memo = 'memo',
  Computation = 'computation',
  Refresh = 'refresh',
  Context = 'context',
  Signal = 'signal',
  Store = 'store',
}

export const NODE_TYPE_NAMES: Readonly<Record<NodeType, string>> = {
  [NodeType.Root]: 'Root',
  [NodeType.Component]: 'Component',
  [NodeType.Element]: 'Element',
  [NodeType.Effect]: 'Effect',
  [NodeType.Render]: 'Render Effect',
  [NodeType.Memo]: 'Memo',
  [NodeType.Computation]: 'Computation',
  [NodeType.Refresh]: 'Refresh',
  [NodeType.Context]: 'Context',
  [NodeType.Signal]: 'Signal',
  [NodeType.Store]: 'Store',
}

export enum ValueType {
  Number = 'number',
  Boolean = 'boolean',
  String = 'string',
  Null = 'null',
  Undefined = 'undefined',
  Symbol = 'symbol',
  Array = 'array',
  Object = 'object',
  Function = 'function',
  Getter = 'getter',
  Element = 'element',
  Instance = 'instance',
  Store = 'store',
}

export enum TreeWalkerMode {
  Owners = 'owners',
  Components = 'components',
  DOM = 'dom',
}
export const defaultWalkerMode = TreeWalkerMode.Components
