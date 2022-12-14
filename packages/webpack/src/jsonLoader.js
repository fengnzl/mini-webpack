export default function (source) {
  // 获取配置 loader 时传递的 options 参数
  const options = this.getOptions();
  console.log("loader---", options);
  return `export default ${JSON.stringify(source)}`;
}
