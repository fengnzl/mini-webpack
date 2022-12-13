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
