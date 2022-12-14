import jsonLoader from "./jsonLoader.js";
// 默认 config 配置
export const DefaultBuildConfig = {
  entry: "./src/index.js",
  output: {
    path: "./dist",
    filename: "main.js",
  },
  module: {
    rules: [
      {
        test: /\.json$/,
        use: [
          {
            loader: jsonLoader,
            options: {
              name: "jsonLader",
            },
          },
        ],
      },
    ],
  },
};
