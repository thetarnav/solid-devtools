import {render} from 'solid-js/web'
import App from './App.tsx'
import {Overlay} from './Overlay.tsx'
import {ThemeProvider} from './Theme.tsx'

import "./styles.css"

function Main() {
    return (
        <ThemeProvider>
            <App />
            <Overlay />
        </ThemeProvider>
    )
}

render(() => <Main />, document.getElementById('root')!)
