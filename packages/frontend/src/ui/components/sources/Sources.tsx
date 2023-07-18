import { Repeat } from '@solid-primitives/range'
import { Component, Show } from 'solid-js'
import * as styles from './sources.css'

export const Sources: Component<{ length: number }> = props => {
    const a = () => Math.ceil(props.length / 2)
    const b = () => Math.floor(props.length / 2)

    const Row: Component<{ length: number }> = rowProps => (
        <div class={styles.sources.row}>
            <Repeat times={rowProps.length}>
                <div class={styles.sources.dot}></div>
            </Repeat>
        </div>
    )

    return (
        <Show when={props.length}>
            <div class={styles.sources.container}>
                <Row length={a()} />
                <Show when={b()}>
                    <Row length={b()} />
                </Show>
            </div>
        </Show>
    )
}
