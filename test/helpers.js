const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function eq(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg}\n  期望: ${expected}\n  实际: ${actual}`);
  }
}

export function close(actual, expected, tol = 0.001, msg = '') {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tol) {
    throw new Error(`${msg}\n  期望: ${expected} ±${tol}\n  实际: ${actual}`);
  }
}

export function throws(fn, msg = '应当抛错但没有') {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(msg);
}

export function runAll() {
  let pass = 0;
  const failures = [];
  for (const t of tests) {
    try {
      t.fn();
      pass++;
      console.log(`  ok   ${t.name}`);
    } catch (e) {
      failures.push(t.name);
      console.error(`  FAIL ${t.name}\n       ${e.message.replace(/\n/g, '\n       ')}`);
    }
  }
  console.log(`\n${pass} passed, ${failures.length} failed`);
  if (failures.length) process.exit(1);
}