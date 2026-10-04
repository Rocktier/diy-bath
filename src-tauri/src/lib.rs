// 引擎与界面全部在前端（纯 JS + SVG），Rust 侧只是个空壳。
// 这里刻意不注册任何 command / plugin：
//   - 引擎是纯函数，在 Node 里就能测，不需要绕到 Rust
//   - 少一个 capability 就少一份攻击面
//   - 以后真需要读写文件时再加，那时再评估协议与权限
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("启动失败");
}