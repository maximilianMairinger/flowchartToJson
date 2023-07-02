import { merge } from "webpack-merge"
import commonMod from "./rollup.web.common.config.mjs"


export default merge(commonMod, {
  watch: {
    include: ['code.ts'],
    exclude: 'node_modules/**'
  }
})
