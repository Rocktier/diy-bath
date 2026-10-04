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
      // app.js 是唯一操作 DOM 的文件，需要浏览器环境才能覆盖，
      // 阶段二再补 playwright 之类的方案。引擎部分要求接近全覆盖。
      exclude: ['src/app.js'],
      reporter: ['text', 'lcov'],
      // 定在当前实测水平之上：语句 99.76% / 分支 91.8% / 函数 97.22%。
      // 只往上调，不下调。低于阈值 CI 失败。
      thresholds: { lines: 95, functions: 95, branches: 88, statements: 95 },
    },
  },
});