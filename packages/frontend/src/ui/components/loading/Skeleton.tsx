import { Component } from 'solid-js'
import { createPolled } from '@solid-primitives/timer'
import * as styles from './Skeleton.css'

export const Skeleton: Component<{}> = props => {
  const nDots = createPolled((p: number = 0) => (p === 3 ? 1 : ++p), 800)

  return <div class={styles.skeleton}>Loading{Array.from({ length: nDots() }, () => '.')}</div>
}
