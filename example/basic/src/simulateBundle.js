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
