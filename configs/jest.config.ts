import type { Config } from "@jest/types"

const solidjsPath = `<rootDir>/../../node_modules/solid-js`

const config: Config.InitialOptions = {
	preset: "ts-jest",

	globals: {
		"ts-jest": {
			tsconfig: `<rootDir>/tsconfig.json`,
			babelConfig: {
				presets: ["@babel/preset-env", "babel-preset-solid"],
			},
		},
	},

	testEnvironment: "jsdom",

	setupFilesAfterEnv: ["@testing-library/jest-dom", "regenerator-runtime"],

	moduleNameMapper: {
		"solid-js/web": `${solidjsPath}/web/dist/dev.cjs`,
		"solid-js/store": `${solidjsPath}/store/dist/dev.cjs`,
		"solid-js": `${solidjsPath}/dist/dev.cjs`,
	},

	verbose: true,
}
export default config
