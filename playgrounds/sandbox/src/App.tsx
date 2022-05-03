import type { Component } from "solid-js"
import styles from "./App.module.css"

const App: Component = () => {
  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <img
          src="https://github.com/solidjs/solid/raw/ebdb8cdf9b0f986e7d15048a34d50a4837101c49/assets/logo.png"
          class={styles.logo}
          alt="logo"
        />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          class={styles.link}
          href="https://github.com/solidjs/solid"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn Solid
        </a>
      </header>
    </div>
  )
}

export default App
