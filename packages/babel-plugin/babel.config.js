/** @type {import('@babel/core').TransformOptions} */
const config = {
	presets: [["@babel/preset-env", { targets: { node: "current" } }], "@babel/preset-typescript"],
}
module.exports = config
