import { readFile } from "fs/promises";
import { join } from "path";
import { cwd } from "process";

class Compiler {
  constructor(options) {
    this.options = options;
  }

  run() {
    this.createAssets();
  }

  // 获取文件内容
  async createAssets() {
    // 获取文件名全路径
    const entryFullName = join(cwd(), this.options.entry);
    // 获取文件内容
    const resource = await readFile(entryFullName, {
      encoding: "utf-8",
    });
    console.log(resource);
    // TODO 获取依赖关系
    return {};
  }
}

export default Compiler;
