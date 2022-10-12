import { Hand } from './Hand'
import type { Component } from 'solid-js'

type LinesProps = { numberOfLines: number; class: string; length: number; width: number }

const rotate = (index: number, length: number) => () => `rotate(${(360 * index) / length})`

export const Lines: Component<LinesProps> = ({ numberOfLines, ...rest }) =>
  Array.from({ length: numberOfLines }).map((_, index) => (
    <Hand rotate={rotate(index, numberOfLines)} {...rest} fixed />
  ))
