import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseDotenv(content: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2] ?? "";

    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1).replace(/\\n/g, "\n");
    } else if (
      value.startsWith("'") &&
      value.endsWith("'") &&
      value.length >= 2
    ) {
      value = value.slice(1, -1);
    } else {
      const commentIndex = value.indexOf(" #");
      if (commentIndex >= 0) {
        value = value.slice(0, commentIndex).trim();
      }
    }

    parsed[key] = value;
  }

  return parsed;
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) return false;

  const content = readFileSync(path, "utf8");
  const parsed = parseDotenv(content);

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] == null) {
      process.env[key] = value;
    }
  }

  return true;
}

export function loadWorkerEnv(): string[] {
  const cwd = process.cwd();
  const candidates = [
    resolve(cwd, ".env"),
    resolve(cwd, "apps/worker/.env"),
    resolve(cwd, "packages/db/prisma/.env"),
    resolve(cwd, "../../packages/db/prisma/.env"),
  ];

  const loaded: string[] = [];
  for (const path of [...new Set(candidates)]) {
    if (loadEnvFile(path)) {
      loaded.push(path);
    }
  }

  return loaded;
}
