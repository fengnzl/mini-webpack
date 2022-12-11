import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 默认 config 配置
export const DefaultBuildConfig = {
  entry: "./src/index.js",
  output: {
    path: resolve(__dirname, "dist"),
    filename: "main.js",
  },
};
