import { merge } from "webpack-merge"
import commonMod from "./rollup.web.common.config.mjs"
import terser from "@rollup/plugin-terser"


export default merge(commonMod, {
  plugins: [
    // terser()
  ]
})
