import { createContext, useContext, ParentComponent, Component } from 'solid-js'
import { createStore } from 'solid-js/store'

export type ThemeContextState = {
  readonly color: string
  readonly title: string
}
export type ThemeContextValue = [
  state: ThemeContextState,
  actions: {
    changeColor: (color: string) => void
    changeTitle: (title: string) => void
  },
]

const defaultState = {
  color: '#66e6ac',
  title: 'Fallback Title',
}

const ThemeContext = createContext<ThemeContextValue>([
  defaultState,
  {
    changeColor: () => undefined,
    changeTitle: () => undefined,
  },
])

export const ThemeProvider: ParentComponent<{
  color?: string
  title?: string
}> = props => {
  const [theme, setTheme] = createStore({
    color: props.color || defaultState.color,
    title: props.title || defaultState.title,
  })

  const changeColor = (color: string) => setTheme('color', color)
  const changeTitle = (title: string) => setTheme('title', title)

  return (
    <ThemeContext.Provider value={[theme, { changeColor, changeTitle }]}>
      {props.children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

export const ThemeExample: Component = props => {
  const [theme, { changeColor }] = useTheme()

  return (
    <>
      <h1
        style={{
          color: theme.color,
        }}
      >
        {theme.title}
      </h1>
      <input
        type="color"
        name="color"
        value={theme.color}
        onInput={e => changeColor(e.currentTarget.value)}
      />
      <label for="color">Change color theme</label>
    </>
  )
}
