import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 引擎全是纯函数，不需要浏览器环境
    environment: 'node',
    include: ['test/**/*.test.js'],
    // 阈值：低于此值 CI 失败。起步设在当前实际水平，
    // 随代码演进往上调，不下调。
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      // 这两个文件在 Node 里跑不起来——不是不写测试，是**写不了**：
      //   app.js        唯一操作 DOM 的文件
      //   three-view.js 需要 WebGL 上下文与真实的 resize / pointer 事件
      // vitest 跑在 environment: 'node'，import three 就炸。
      //
      // 它们的实际行为由 scripts/ui-audit/acceptance.js 在真浏览器里覆盖
      // （16 条清单：手势、模式切换、导出、resize 恢复…），
      // 那比 mock 更接近用户真实操作。
      //
      // 别为了刷覆盖率去 mock WebGL——那测的是 mock 自己，不是代码。
      exclude: ['src/app.js', 'src/three-view.js'],
      reporter: ['text', 'lcov'],
      // 定在当前实测水平之上，只往上调不下调。低于阈值 CI 失败。
      thresholds: { lines: 95, functions: 95, branches: 88, statements: 95 },
    },
  },
});