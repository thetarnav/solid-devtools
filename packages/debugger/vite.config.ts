import { vitestFullConfig } from '../../configs/vitest.config'

export default vitestFullConfig(c => {
    // setup needs to run before the tests to add solid-js api to the global scope
    c.test!.setupFiles = './src/setup.ts'
})
