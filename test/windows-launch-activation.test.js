const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const read = file => fs.readFileSync(path.join(__dirname, "../TokenTrackerWin", file), "utf8");

// Keep entrypoint routing covered on every platform; the test below exercises
// the actual Windows named-pipe transport separately.
test("Windows entrypoint opens the dashboard on a manual cold start", () => {
  const source = read("Program.cs");
  const listener = source.indexOf("SingleInstance.StartListener(");
  const messagePump = source.indexOf("Application.Run(ctx);");
  assert.ok(listener >= 0 && messagePump > listener);
  const launch = source.slice(listener, messagePump);

  assert.match(
    launch,
    /if\s*\(deepLink is not null\)\s*ctx\.HandleDeepLink\(deepLink\);\s*else if\s*\(!launchedAtStartup\)\s*wpfApp\.Dispatcher\.BeginInvoke\(new Action\(ctx\.ActivateDashboard\)\);/,
    "manual cold starts must schedule dashboard activation before the message pump, independently of the pet preference",
  );
});

test("Windows entrypoint recognizes the quiet startup argument", () => {
  assert.match(read("LaunchAtStartup.cs"), /StartupArgument\s*=\s*"--startup";/);
  assert.match(
    read("Program.cs"),
    /var launchedAtStartup\s*=\s*args\.Any\(a\s*=>\s*string\.Equals\(a,\s*LaunchAtStartup\.StartupArgument,\s*StringComparison\.OrdinalIgnoreCase\)\);/,
    "the registered startup argument must select the quiet launch branches regardless of casing",
  );
});

test("Windows entrypoint forwards a secondary manual launch and keeps startup quiet", () => {
  const source = read("Program.cs");
  const existingInstance = source.indexOf("if (!isNew)");
  const primaryInstance = source.indexOf("UrlProtocol.EnsureRegistered();");
  assert.ok(existingInstance >= 0 && primaryInstance > existingInstance);
  const secondary = source.slice(existingInstance, primaryInstance);

  assert.match(
    secondary,
    /if\s*\(deepLink is not null\)\s*\{[\s\S]*?SingleInstance\.TryForwardToPrimary\(deepLink\);[\s\S]*?\}\s*else if\s*\(!launchedAtStartup\)\s*\{[\s\S]*?SingleInstance\.TryForwardToPrimary\(SingleInstance\.ActivateMessage\);[\s\S]*?\}\s*return;/,
    "secondary manual launches must forward activation, startup must stay quiet, and deep links must keep their payload before the process exits",
  );
});

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
