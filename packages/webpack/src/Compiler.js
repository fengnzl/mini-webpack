import { readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { cwd } from "process";
import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";

const traverse = babelTraverse.default;
class Compiler {
  constructor(options) {
    this.options = options;
    // 保存已经遍历过的依赖
    this.modules = new Set();
  }

  run() {
    const graph = this.createGraph();
    console.log(graph);
  }

  // 获取文件内容
  createAssets(filePath) {
    // 获取文件内容
    const source = readFileSync(filePath, {
      encoding: "utf-8",
    });
    // 获取依赖关系
    const ast = parse(source, {
      sourceType: "module",
    });
    const deps = [];
    traverse(ast, {
      ImportDeclaration: ({ node }) => {
        // 获取当前文件所在文件夹
        const curDirName = dirname(filePath);
        // 获取文件依赖路径
        const dependFile = join(curDirName, node.source.value);
        // 没有处理过
        if (!this.modules.has(dependFile)) {
          deps.push(dependFile);
          this.modules.add(dependFile);
        }
      },
    });
    return {
      filePath,
      source,
      deps,
    };
  }
  createGraph() {
    // 获取文件名全路径
    const entryFullName = join(cwd(), this.options.entry);
    const mainAsset = this.createAssets(entryFullName);
    const queue = [mainAsset];
    for (const asset of queue) {
      asset.deps.forEach((child) => {
        queue.push(this.createAssets(child));
      });
    }
    return queue;
  }
}

export default Compiler;
