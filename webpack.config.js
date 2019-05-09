/**
 * Build configuration
 */

"use strict";

const path = require("path");
const srcPath = path.join(__dirname, "src");

module.exports = {
  mode: "development",
  entry: [path.join(srcPath, "index.ts")],
  output: {
    path: path.join(__dirname, "dist"),
    filename: "bundle.js"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.(t|j)s[x]?$/,
        exclude: /node_modules/,
        use: [
          "ts-loader",
        ]
      },
    ]
  },
  plugins: [],
};
