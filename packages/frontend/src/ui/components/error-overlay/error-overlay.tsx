import {Icon} from '@/ui'
import {Component, JSX, ParentComponent} from 'solid-js'
import {HeadlessErrorOverlay, HeadlessErrorOverlayRenderProps} from './error-overlay-headless'

const button =
    'w-8 h-8 center-child rounded-md bg-panel-8 hover:bg-panel-7 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-panel-7 active:bg-panel-6 active:ring-offset-0 active:ring-0'

const icon = 'w-4 h-4 text-current'

const RenderErrorOverlay: Component<
    HeadlessErrorOverlayRenderProps & {footer?: JSX.Element}
> = props => (
    <div class="fixed inset-0 z-9999 overflow-y-auto overscroll-none">
        <div class="min-h-full p-y-4 p-x-8 center-child bg-black/50">
            <div class="min-w-80 p-4 gap-y-2 m-y-8 overflow-hidden bg-panel-8 rounded-md font-mono text-panel-1">
                <div class="flex items-center justify-between">
                    <div class="center-child gap-x-1">
                        <button class={button} onClick={props.goPrev}>
                            <span class="sr-only">Prev</span>
                            <Icon.ArrowLeft class={icon} />
                        </button>
                        <button class={button} onClick={props.goNext}>
                            <span class="sr-only">Prev</span>
                            <Icon.ArrowRight class={icon} />
                        </button>
                        <span class="p-1 font-500">
                            <span>{props.currentCount}</span>
                            {' of '}
                            <span>{props.maxCount}</span>
                        </span>
                    </div>
                    <div class="center-child gap-x-1">
                        <button class={button} onClick={props.resetError}>
                            <span class="sr-only">Reset</span>
                            <Icon.Refresh class={icon} />
                        </button>
                    </div>
                </div>
                <div class="p-t-2 flex flex-col gap-y-2">
                    <span class="text-red font-500 break-words">
                        <span class="font-700">
                            {props.error instanceof Error ? props.error.name : 'UnknownError'}
                        </span>
                        {': '}
                        {props.error instanceof Error ? props.error.message : String(props.error)}
                    </span>
                    {props.footer && <div>{props.footer}</div>}
                </div>
            </div>
        </div>
    </div>
)

export const ErrorOverlay: ParentComponent<{
    footer?: JSX.Element
    catchWindowErrors?: boolean
}> = props => {
    return (
        <HeadlessErrorOverlay
            // eslint-disable-next-line no-console
            onError={e => console.error(e)}
            render={overlayProps => <RenderErrorOverlay {...overlayProps} footer={props.footer} />}
            catchWindowErrors={props.catchWindowErrors}
        >
            {props.children}
        </HeadlessErrorOverlay>
    )
}
