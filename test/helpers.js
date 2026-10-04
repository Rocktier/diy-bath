// 测试断言的薄封装。
//
// 存在的唯一理由：让 166 个既有测试用例从自研 runner 迁到 vitest 时，
// 一行都不用改。测试文件只 import 这四个函数，不直接碰 vitest。
import { it, expect } from 'vitest';

export function test(name, fn) {
  it(name, fn);
}

export function eq(actual, expected, msg = '') {
  expect(actual, msg).toBe(expected);
}

/**
 * 浮点容差比较。
 *
 * 刻意不用 expect().toBeCloseTo()：那是「小数位」语义（|a-b| < 0.5×10^-p），
 * 和这里要的「容差」语义（|a-b| <= tol）不是一回事。
 * 迁移前后的容差行为必须完全一致，否则测试含义会悄悄变掉。
 */
export function close(actual, expected, tol = 0.001, msg = '') {
  if (typeof actual !== 'number' || !Number.isFinite(actual)) {
    throw new Error(`${msg}\n  期望: ${expected} ±${tol}\n  实际: ${actual}（不是有限数）`);
  }
  if (Math.abs(actual - expected) > tol) {
    throw new Error(`${msg}\n  期望: ${expected} ±${tol}\n  实际: ${actual}`);
  }
}

export function throws(fn, msg = '应当抛错但没有') {
  expect(fn, msg).toThrow();
}

/** 直接透出 expect，供个别需要更丰富断言的测试使用 */
export { expect };