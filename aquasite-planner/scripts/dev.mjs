import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const incoming = process.argv.slice(2);
const args = [];

for (let index = 0; index < incoming.length; index += 1) {
  const arg = incoming[index];
  if (arg === "--strictPort") continue;
  if (arg === "--host") {
    args.push("--hostname", incoming[index + 1]);
    index += 1;
    continue;
  }
  args.push(arg);
}

const child = spawn(process.execPath, [nextBin, "dev", ...args], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
