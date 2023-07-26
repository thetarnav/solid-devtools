/*

import { Repeat } from '@solid-primitives/range'
import { Component, Show } from 'solid-js'
import * as styles from './sources/sources.css'

export const sources = {
    container: style({
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: spacing[3],
        width: 'max-content',
        padding: `${spacing[0.5]} ${spacing[1]}`,
        ...rounded(),
        rowGap: spacing[0.5],
        backgroundColor: `rgb(${hexToRgbValue(color.amber[500])} / 0.1)`,
    }),
    row: style({
        display: 'flex',
        columnGap: spacing[0.5],
    }),
    dot: style({
        width: spacing[1],
        height: spacing[1],
        ...rounded('full'),
        backgroundColor: color.amber[500],
        filter: 'blur(0.1px)',
        opacity: 0.8,
    }),
}


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

*/
