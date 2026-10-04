// 防止 release 构建时弹控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    diy_bath_lib::run();
}