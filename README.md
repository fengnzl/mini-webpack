# Mini Webpack

本仓库主要模拟实现一个最简单的 webpack ，这里只模拟了核心逻辑实现，使用的 [pnpm + nx](https://fengnzl.github.io/translation/setup-monorepo-with-PNPM-and-speed-it-up-with-Nx.html#%E6%B7%BB%E5%8A%A0-remix-%E5%BA%94%E7%94%A8%E7%A8%8B%E5%BA%8F) 管理的 monorepo，便于后续有相关模拟实现可以继续添加到本仓库。

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
import { DefaultBuildConfig } from "./config";

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
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
  },
};
```

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

当我们执行 `webpack` 命令时实际上运行的是 `node_modules` 下面 `.bin` 的 `webpack` 中的代码，因此我们可以运行以下命令 `node --inspect-brk ./node_modules/.bin/webpack ` 当执行 `node --inspect-brk` 命令之后，node 会自动断点断在代码文件的第一行，这时我们打开 chrome，输入以下网址 `chrome://inspect` 点击这里的 `inspect` 就可以进入调试。

![image-20221211215218464](https://raw.githubusercontent.com/fengnzl/HexoImages/master/blog/202212112152606.png)
