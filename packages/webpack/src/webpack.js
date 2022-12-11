import { DefaultBuildConfig } from "./config";

function webpack(options = DefaultBuildConfig) {
  // 创建 Compiler 实例
  const compiler = new Compiler(options);

  return compiler;
}

export default webpack;
