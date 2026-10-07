import { defineConfig } from 'vite';

/**
 * Vite 默认监听整个项目根目录，`src-tauri/target/` 也在里面。
 *
 * 而 `tauri dev` 会在 `npm run dev` 还活着的时候往那个目录里写 Rust 产物，
 * Windows 上写文件时句柄是独占的，Vite 的 watcher 立刻 EBUSY 崩掉：
 *
 *   Error: EBUSY: resource busy or locked, watch '.../src-tauri/target/release/
 *   build/.../build_script_build-....exe'
 *
 * 表现是开发服务器毫无预兆地退出，日志里只有这一行栈，
 * 而当时正在跑的是 npm 命令，很容易误以为是自己的代码有问题。
 * 连带后果：`npm run tauri:dev` 之后 vite 就没了，热重载跟着失效。
 *
 * 这里明确把 Rust 的构建目录排除掉。只影响 dev 的文件监听，
 * 不碰 build 的产物——产物完整性由 `npm run check:bundle` 单独守。
 */
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/src-tauri/target/**'],
    },
  },
});