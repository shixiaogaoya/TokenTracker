const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { test } = require("node:test");

test("Windows relaunch activation and deep links use distinct named-pipe handlers", {
  skip: process.platform !== "win32",
}, () => {
  const output = execFileSync("pwsh", [
    "-NoProfile",
    "-NonInteractive",
    "-File",
    path.join(__dirname, "fixtures/windows-launch-activation.ps1"),
    "-SourcePath",
    path.join(__dirname, "../TokenTrackerWin/SingleInstance.cs"),
  ], { encoding: "utf8", timeout: 30000 });

  assert.match(output, /PASS: activation and deep links remain distinct/);
});
