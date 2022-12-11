import { DefaultBuildConfig } from "./config.js";
import Compiler from "./Compiler.js";

function webpack(options = DefaultBuildConfig) {
  // 创建 Compiler 实例
  const compiler = new Compiler(options);

  return compiler;
}

export default webpack;
