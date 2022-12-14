# Mini Webpack

本仓库主要模拟实现一个最简单的 webpack ，这里只模拟了核心逻辑实现，使用的 [pnpm + nx](https://fengnzl.github.io/translation/setup-monorepo-with-PNPM-and-speed-it-up-with-Nx.html#%E5%88%9D%E5%A7%8B%E5%8C%96%E4%B8%80%E4%B8%AA%E6%96%B0%E7%9A%84-pnpm-workspaces) 管理的 monorepo，便于后续有相关模拟实现可以继续添加到本仓库。

我们首先要知道，webpack 打包过程中主要经历的核心流程，这样我们就可以按这几个流程来慢慢实现我们的 mini webpack。其打包主要是以下几个步骤：

- 读取解析配置信息，获取入口文件
- 根据入口文件，递归解析依赖，生成依赖图谱
- 根据依赖图谱和配置的出口生成打包后的文件

## 读取配置文件

我们通过调试 webpack 执行过程及查看[官方文档](https://webpack.docschina.org/api/node/#webpack)可知，执行命令的时候主要进行以操作：

```js
const webpack = require('webpack');
// 调用 webpack 方法 并传入配置信息
const compiler = webpack(options);
// 调用返回的 Compiler 实例，调用 run 方法
compiler.run()
```

我们先来模拟以上过程，首先我们在 webpack 文件夹的入口文件创建执行代码的入口以及读取配置文件信息：

```js
// src/webpack.js
// 引入默认配置
import { DefaultBuildConfig } from "./config.js";
import Compiler from "./Compiler.js";

function webpack(options = DefaultBuildConfig) {
  // 创建 Compiler 实例
  const compiler = new Compiler(options);

  return compiler;
}

export default webpack;

// 默认配置信息，这里只简单写了 入口和出口信息
// src/config.js
export const DefaultBuildConfig = {
  entry: "./src/index.js",
  output: {
    path: "./dist",
    filename: "main.js",
  },
};
```

## 构建依赖图谱

在传入基本配置信息之后，我们需要做的就是获取其入口 `entry` 配置，然后根据入口文件来递归解析相关引入依赖，其中包括将配置文件及引入文件交给对应的 `loader` 处理，返回处理后的代码。这里我们需要实现 `Compiler` 类，并提供 `run` 方法，用于构建调用。

首先我们先根据获取文件内容：

```js
// src/Compiler.js
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
```

然后为了更加符合 `webpack` 实现，我们这里提供一个可执行命令出去，修改 `package.json` 文件，添加 `bin` 字段：

```json
{
  //...
  "main": "./src/webpack.js",
  "bin": {
    "webpack": "./bin/webpack.js"
  },
}
```

然后新增 `bin/webpack.js` 文件，将执行的命令填入。

```js
#!/usr/bin/env node

import webpack from "../src/webpack.js";

const compiler = webpack();

compiler.run();
```

然后新增 `example` 文件夹来实现基本的代码：

![image-20221212010135421](https://raw.githubusercontent.com/fengnzl/HexoImages/master/blog/202212120101482.png)

`foo.js` 和 `index.js` 代码分别如下所示

```js
// example/basic/foo.js
export function foo() {
  console.log("foo load");
}
// example/basic/index.js
import { foo } from "./foo.js";

foo();
console.log("basic test");
```

这时候我们在通过执行 `pnpm --filter basic add webpack --workspace` 将本地 `webpack` 连接到 `basic` 文件夹的依赖中，同时我们在 `example/basic/package.json` 文件中添加打包命令。

在 `mini-webpack` 根目录下安装 `Nx` ，从而优化运行 `monorepo` 的场景。

通过 `pnpm add nx -D -w` 命令安装之后，执行 `npx nx build basic` 就可执行对应文件夹下的打包命令，此时我们可以看到命令行输出了 `index.js` 的内容。

![image-20221212010956709](https://raw.githubusercontent.com/fengnzl/HexoImages/master/blog/202212120109743.png)

获取入口文件内容之后，我们就需要将 `import` 导入语句进行分析，将其依赖收集起来，后续不断递归处理其依赖，这里就需要用到 `babel` 处理。具体使用可以查看[官方文档](https://babeljs.io/docs/en/babel-traverse)。

```js
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { cwd } from "node:process";
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
    // 递归处理
    for (const asset of queue) {
      asset.deps.forEach((child) => {
        queue.push(this.createAssets(child));
      });
    }
    return queue;
  }
}

export default Compiler;
```

此时我们打包之后可以看到输出的依赖数据如下：
![image-20221213005810146](https://raw.githubusercontent.com/fengnzl/HexoImages/master/blog/202212130058196.png)

## 生成打包代码

为了通过依赖图来实现最终生成的打包代码，我们可以先模拟处理生成打包代码的过程：

首先存在以下两个函数：

```js
function indexjs() {
  // index.js
  // 模拟 cjs require 函数
  import { foo } from "./foo.js";
  foo();
  console.log("basic test");
}

function foojs() {
  // foo.js
  export function foo() {
    console.log("foo load");
  }
}
```

我们需要模拟 `cjs` 导入规范来将 `foo` 进行导入，模拟过程如下：

```js
// 实现 require 函数
function require(path) {
  const modules = {
    "./index.js": indexjs,
    "./foo.js": foojs,
  };

  const module = {
    exports: {},
  };
  const fn = modules[path];
  fn(require, module, module.exports);
  return module.exports;
}
// 执行入口文件
// indexjs();
require("./index.js");

function indexjs(require, module, exports) {
  // index.js
  // 模拟 cjs require 函数
  const { foo } = require("./foo.js");
  foo();
  console.log("basic test");
}

function foojs(require, module, exports) {
  // foo.js
  function foo() {
    console.log("foo load");
  }

  module.exports = {
    foo,
  };
}
// foo load
// basic test
```

而我们最终会生成一个 `IIFE` 函数，如下所示：

```js
(function (modules) {
  function require(path) {
    const module = {
      exports: {},
    };
    const fn = modules[path];
    fn(require, module, module.exports);
    return module.exports;
  }
  require("./index.js");
})({
  "./index.js": function (require, module, exports) {
    // index.js
    // 模拟 cjs require 函数
    const { foo } = require("./foo.js");
    foo();
    console.log("basic test");
  },
  "./foo.js": function (require, module, exports) {
    // foo.js
    function foo() {
      console.log("foo load");
    }

    module.exports = {
      foo,
    };
  },
});
// foo load
// basic test
```

因此我们只要将构建获取的依赖图谱在转换成上述代码即可，一般通过字符串替换或者模板替换生成。这里我们选择使用 [ejs](https://www.npmjs.com/package/ejs) 模板生成器来处理。

执行以下代码进行安装 `pnpm add ejs -F webpack`，然后创建模板文件 `bundle.ejs` ，同时需要通过 [babel](https://babeljs.io/docs/en/babel-core#transformfromastasync) 的 `transformFromAstAsync` 方法将代码转义成 `ejs` 代码，具体如下所示：

```js
// Compiler.js
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

// 模板文件如下 bundle.ejs
(function (modules) {
  function require(path) {
    const module = {
      exports: {},
    };
    const fn = modules[path];
    fn(require, module, module.exports);
    return module.exports;
  }
  require("./index.js");
})({
  <% data.forEach((info) => { %>
    "<%- info['filePath'] %>": function(require, module, exports){
      <%- info['code'] %>
    },
  <% }); %>
});
```

执行 `npx nx build basic` 执行 `example/basic` 目录下的打包命令，可以看到生成的打包文件如下所示：

![image-20221214004245953](https://raw.githubusercontent.com/fengnzl/HexoImages/master/blog/202212140042033.png)

这里我们可以看到生成的打包文件还存在一些问题，这里路径和执行时候的文件并没有关联上，因此我们需要通过在打包过程中生成一个 `mapping` 对象来找到对应引入的文件，且可以避免同名文件不同文件夹下的命名冲突。最终我们打包的模板应该是类似这种形式：

```js
// example/basic/simulateBundle2.js
(function (modules) {
  function require(id) {
    const module = {
      exports: {},
    };
    const [fn, mapping] = modules[id];

    function localRequire(filePath) {
      const id = mapping[filePath];
      return require(id);
    }
    fn(localRequire, module, module.exports);
    return module.exports;
  }
  require(0);
})({
  0: [
    function (require, module, exports) {
      // index.js
      // 模拟 cjs require 函数
      const { foo } = require("./foo.js");
      foo();
      console.log("basic test");
    },
    {
      "./foo.js": 1,
    },
  ],
  1: [
    function (require, module, exports) {
      // foo.js
      function foo() {
        console.log("foo load");
      }
      module.exports = {
        foo,
      };
    },
    {},
  ],
});
// foo load
// basic test
```

因此我们这次主要处理生成 `mapping` 信息和修改 `bundle.ejs` 模板文件，以下为主要的改动。

```js
// bundle.ejs
(function (modules) {
  //...
})({
  <% data.forEach((info) => { %>
    "<%- info['id'] %>": [function(require, module, exports){
      <%- info['code'] %>
    },<%- JSON.stringify(info['mapping']) %>],
  <% }); %>
});
      
// Compiler.js
createGraph() {
  // 获取文件名全路径
  const entryFullName = join(executePath, this.options.entry);
  const mainAsset = this.createAssets(entryFullName);
  const queue = [mainAsset];
  for (const asset of queue) {
    asset.deps.forEach((fullPath) => {
      // 获取依赖文件内容
      const child = this.createAssets(fullPath);
      // 根据依赖的全路径 获取相对路径
      const relativePath = this.modules.get(fullPath);
      // 更新 asset mapping 数据
      asset.mapping[relativePath] = child.id;
      queue.push(child);
    });
  }
  return queue;
}
build(graph) {
  //...
  // 根据依赖图生成所要往模板里面填充的数据
  const data = graph.map((asset) => {
    const { code, id, mapping } = asset;
    console.log(mapping, id, code);
    return {
      code,
      id,
      mapping,
    };
  });
}
```

当修改完成之后我们再次执行 `npx nx build basic` 就可以看到在 `example/basic/dist` 文件下已经有 `bundle.js` 的生成，且可正常运行。

## loader 实现

> Webpack enables use of [loaders](https://webpack.js.org/concepts/loaders) to preprocess files. This allows you to bundle any static resource way beyond JavaScript. You can easily write your own loaders using Node.js.

通过官网我们可知 `loader` 主要作用是预处理打包文件，从而我们可以打包除了 Javascript 的文件。我们在 `webpack.config.js`  文件配置 `loader`  之后，其调用顺序为从后往前，且可以在函数内部通过 `this` 来获取 `loader` 相关的 `API`。

首先我们在默认配置文件增加如下配置：

```js
// webpack/src/config.js
import jsonLoader from "./jsonLoader.js";
// 默认 config 配置
export const DefaultBuildConfig = {
  //...
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

```

然后在 `webpack/src/jsonLoader.js` 中编写简单的 `loader`

```js
export default function (source) {
  // 获取配置 loader 时传递的 options 参数
  const options = this.getOptions();
  console.log("loader---", options);
  return `export default ${JSON.stringify(source)}`;
}
```

最后我们在 `Compiler.js` 中新增通过 loader 进行文件预处理的代码即可，主要新增代码如下所示

```js
constructor(options) {
  //...
  this.moduleRules = this.getModuleRules();
  // loader 调用时候的上下文，上面绑定一些 api
  this.loaderContext = {
    addDependency() {},
  };
}
getModuleRules() {
  const module = this.options.module;
  if (!module || !module.rules) return [];
  return module.rules;
}
preprocessFile(source, filePath) {
  this.moduleRules.forEach((rule) => {
    const { test, use } = rule;
    if (test.test(filePath)) {
      const useArray = asArray(use);
      // loader 从后向前调用
      useArray.reverse().forEach(({ options, loader }) => {
        this.loaderContext.getOptions = () => options;
        source = loader.call(this.loaderContext, source);
      });
    }
  });
  return source;
}
```

最后我们执行打包命令 `npx nx build basic` 即可看到文件能正常打包，命令行也输出了我们要获取的 `options` 配置

![image-20221215000843277](https://raw.githubusercontent.com/fengnzl/HexoImages/master/blog/202212150008420.png)

## 扩展知识

### 调试 webpack

**使用 ndb 调试**

使用 VScode 断点调试 webpack。有时候我们在查看源码的时候需要编写对应的案例，然后进入到源码执行流程中才能更好理解，因此我们下面来简述如何调试源码，以 webpack 为例，其他工具库调试类似。

- 本地下载工具库源码，并安装调试工具

  ```bash
  // 以 webpack 为例
  $ git clone https://github.com/webpack/webpack.git
  $ cd webpack // 进入 webpack 目录
  $ npm i or yarn // 安装依赖
  $ npm install -g ndb //  安装 node 环境下简单易用的调试工具
  ```

- 创建调试项目

首先我们创建一个调试文件夹  webpack-debug ，然后编写最基础的调试案例

```bash
// 以 webpack 为例
$ mkdir webpack-debug && cd webpack-debug
$ npm init -y // 初始化
$ mkdir src && touch src/index.js
$ touch webpack.config.js // 创建 webpack.config.js
```

`index.js`  文件中内容，我们编写一个最简单的输出

```js
console.log("hello webpack");
```

`webpack.config.js` 同样编写一个最简单的配置

```js
module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
  },
};
```

- 创建本地 webpack 源码副本

  首先我们在 webpack 目录下执行 `npm link` 链接本地 webpack。然后在 webpack-debug 文件夹下通过执行 `npm link webpack` 安装本地 webpack。如果执行命令的时候报 `premission denied` 错误信息，我们可以查看[官方文档](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)来进行修复。

- 打断点及运行命令

  首先我们需要在工具仓库目录查看入口并打上断点，如在 webpack 文件夹下 `lib/webpack.js` 文件中打上断点。然后在 webpack-debug 文件夹中执行 `ndb npx webpack` 来进行调试，这时候我们可以看到一个 chromium 已经运行起来。

  ![ndb-npx-webpack](https://raw.githubusercontent.com/fengnzl/HexoImages/master/blog/image-20221211002648308%E7%9A%84%E5%89%AF%E6%9C%AC.png)

  **自己模拟运行调用函数**
  
  由于使用 `ndb` 的方法调试会经常崩溃，因此我们也可以直接用 VScode 自带的调试工具，首先我们在 webpack 目录下增加 debug 目录，并添加对应的基础文件。
  
  ```js
  // debug/src/foo.js
  export const foo = () => {
  	console.log("this is foo");
  };
  
  // debug/src/index.js
  import { foo } from "./foo";
  
  foo();
  console.log("debug webpack");
  // debug/webpack.config.js
  const path = require("path");
  module.exports = {
  	mode: "development",
  	entry: "./index.js",
  	output: {
  		filename: "bundle.js",
  		path: path.join(__dirname, "./dist")
  	}
  };
  
  // debug/start.js
  const webpack = require("../lib/webpack");
  const config = require("./webpack.config");
  
  // 加载基本配置
  const compiler = webpack(config);
  // 执行打包操作
  compiler.run();
  ```
  
  为了确定可以正确打包，我们可以先用全局的 webpack 执行构建操作：
  
  ```bash
  $ webpack ./src/index.js -c webpack.config.js
  ```

​		执行以上代码之后可以看到正常打包的文件，这时我们我们在 `debug/src/index.js` 文件中打上断点，并通过 `F5` 进入调试模式，如果没有进入，那么需要我们创建 `launch.json`

![image-20221211141519601](https://raw.githubusercontent.com/fengnzl/HexoImages/master/blog/202212111415699.png)

其中 `${file}` 表示当前文件。

**使用 node 调试命令**

当我们执行 `webpack` 命令时实际上运行的是 `node_modules` 下面 `.bin` 的 `webpack` 中的代码，因此我们可以运行以下命令 `node --inspect-brk ./node_modules/.bin/webpack ` 当执行 `node --inspect-brk` 命令之后，node 会自动断点断在代码文件的第一行，这时我们打开 chrome，输入以下网址 `chrome://inspect` 点击这里的 `inspect` 就可以进入调试。如果执行上面语句报错的话，我们可以直接执行 `node --inspect-brk ./node_modules/webpack/bin/webpack.js`

![image-20221211215218464](https://raw.githubusercontent.com/fengnzl/HexoImages/master/blog/202212112152606.png)
