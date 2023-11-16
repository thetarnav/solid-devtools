import {render} from 'solid-js/web'
import App from './App'
import {Overlay} from './Overlay'
import {ThemeProvider} from './Theme'

import 'uno.css'

function Main() {
    return (
        <ThemeProvider>
            <App />
            <Overlay />
        </ThemeProvider>
    )
}

render(() => <Main />, document.getElementById('root')!)
