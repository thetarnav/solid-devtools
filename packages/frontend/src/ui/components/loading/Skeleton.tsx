import { createPolled } from '@solid-primitives/timer'
import { Component } from 'solid-js'
import * as styles from './Skeleton.css'

export const Skeleton: Component<{}> = () => {
  const nDots = createPolled((p: number = 0) => (p === 3 ? 1 : ++p), 800)

  return <div class={styles.skeleton}>Loading{Array.from({ length: nDots() }, () => '.')}</div>
}
