import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cwd } from "node:process";
import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";
import { fileURLToPath } from "node:url";
import ejs from "ejs";
import { transformFromAst } from "@babel/core";

const __filename = fileURLToPath(import.meta.url);

const traverse = babelTraverse.default;

//运行命令所在的目录
const executePath = cwd();
class Compiler {
  constructor(options) {
    this.options = options;
    // 保存已经遍历过的依赖
    this.modules = new Set();
  }

  run() {
    console.log("[mini-webpack]: 开始打包");
    const graph = this.createGraph();
    this.build(graph);
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
    // 将代码转换成 cjs
    const { code } = transformFromAst(ast, null, {
      presets: ["@babel/preset-env"],
    });
    return {
      filePath,
      source,
      deps,
      code,
    };
  }
  createGraph() {
    // 获取文件名全路径
    const entryFullName = join(executePath, this.options.entry);
    const mainAsset = this.createAssets(entryFullName);
    const queue = [mainAsset];
    for (const asset of queue) {
      asset.deps.forEach((child) => {
        queue.push(this.createAssets(child));
      });
    }
    return queue;
  }

  build(graph) {
    // 获取定义的模板文件
    const ejsTemplate = join(__filename, "../bundle.ejs");
    const template = readFileSync(ejsTemplate, {
      encoding: "utf-8",
    });
    // 根据依赖图生成所要往模板里面填充的数据
    const data = graph.map((asset) => {
      const { code, filePath } = asset;
      return {
        code,
        filePath,
      };
    });
    // console.log(data);
    // 通过 ejs 渲染模板中的内容
    const bundleInfo = ejs.render(template, { data });
    // 将选后的内容写入打包目录下
    this.writeBuildFile(bundleInfo);
  }

  writeBuildFile(content) {
    const { path: outputPath, filename } = this.options.output;
    const outputDirPath = join(executePath, outputPath);
    if (!existsSync(outputDirPath)) {
      console.log("[mini-webpack]: 创建打包文件夹");
      mkdirSync(outputDirPath);
    }
    // 写入打包内容
    writeFileSync(join(outputDirPath, filename), content, {
      encoding: "utf-8",
    });
    console.log("[mini-webpack]: 打包完成");
  }
}

export default Compiler;
