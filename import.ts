import { init, parse } from "https://esm.sh/es-module-lexer@1.0.3";
import {
  dirname,
  join as joinUrl,
} from "https://deno.land/std@0.152.0/path/posix.ts";
import { globToRegExp } from "https://deno.land/std@0.152.0/path/glob.ts";

await init;

export function rewriteGitHubImports(source: string) {
  const [imports] = parse(source);
  let prefix = 0;
  for (const item of imports) {
    const s = prefix + item.s;
    const e = prefix + item.e;
    const from = source.substring(s, e);
    if (from.startsWith("https://github.com")) {
      const { repo, branch, file } = parseGitHub(from);
      const newFrom = `/@github/${repo}/${branch}${file}`;

      source = `${source.slice(0, s)}${newFrom}${source.slice(
        e,
        source.length
      )}`;
      prefix += newFrom.length - from.length;
    }
  }

  return source;
}

export function rewriteDenoImports(source: string, base?: string) {
  const [imports] = parse(source);
  let prefix = 0;
  for (const item of imports) {
    const s = prefix + item.s;
    const e = prefix + item.e;
    const from = source.substring(s, e);
    if (from.startsWith("https://deno.land")) {
      const { name, version, file } = parseDeno(from)!;
      const newFrom = `/@deno/${
        name === "std" ? name : `x/${name}`
      }@${version}${file}`;

      source = `${source.slice(0, s)}${newFrom}${source.slice(
        e,
        source.length
      )}`;
      prefix += newFrom.length - from.length;
    }
    if (base && from.startsWith(".")) {
      const newFrom = joinUrl(dirname(base), from);
      source = `${source.slice(0, s)}${newFrom}${source.slice(
        e,
        source.length
      )}`;
      prefix += newFrom.length - from.length;
    }
  }

  return source;
}

export function parseGitHub(url: string) {
  const path = new URL(url).pathname.replace(/^\/+/, "");
  const parts = path.split("/");
  const repo = `${parts[0]}/${parts[1]}`;
  const branch = parts[3];
  const file = `/${parts.slice(4, parts.length).join("/")}`;

  return {
    repo,
    branch,
    file,
  };
}

export function parseDeno(url: string) {
  const path = new URL(url).pathname;
  return parseDenoPath(path);
}

export interface DenoDependency {
  name: string;
  version: string;
  file: string;
}

export function parseDenoPath(path: string): DenoDependency | null {
  if (path.startsWith("/x")) {
    // parse package name and version from deno import

    const {
      name,
      version = "latest",
      file,
    } = /\/x\/(?<name>\w+)(@(?<version>[0-9\.a-zA-Z-_]+))?(?<file>.*)/.exec(
      path
    )?.groups ?? {};
    return { name, version, file };
  }

  if (path.startsWith("/std")) {
    // parse package name and version from deno import

    const { version = "latest", file } =
      /\/std(@(?<version>[0-9\.a-zA-Z-_]+))?(?<file>.*)/.exec(path)?.groups ??
      {};
    return { name: "std", version, file };
  }

  return null;
}

export function isScript(path: string) {
  return globToRegExp("*.(ts|tsx|js|jsx|json)").test(path);
}
