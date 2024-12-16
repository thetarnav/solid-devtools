import {vitestFullConfig} from '../../configs/vitest.config.ts'

export default vitestFullConfig(c => {
    // setup needs to run before the tests to add solid-js api to the global scope
    // c.test!.setupFiles = 'test_setup.ts'
    c.test!.setupFiles = './src/setup.ts'
})
