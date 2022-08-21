import { ensureDir } from "https://deno.land/std@0.152.0/fs/mod.ts";
import {
  dirname,
  join,
  globToRegExp,
} from "https://deno.land/std@0.152.0/path/mod.ts";
import { parseDenoPath, rewriteDenoImports } from "../import.ts";
import { processAsset, processCss } from "../process.ts";
import { bundle } from "https://deno.land/x/emit@0.5.0/mod.ts";

interface DepInfo {
  name: string;
  version: string;
  file: string;
}

export class DenoDependency {
  readonly root = "./__cache/@deps/@deno";

  async sync(path: string) {
    const dep = parseDenoPath(path.replace(/^\/@deno/, ""));
    if (!dep) {
      return;
    }
    const content = await this.downloadSource(dep);
    const localPath = join(this.root, `${dep.name}@${dep.version}${dep.file}`);
    await ensureDir(dirname(localPath));
    if (typeof content === "string") {
      if (localPath.endsWith(".css")) {
        const code = processCss(content);
        await Deno.writeTextFile(localPath, code);
      } else {
        await Deno.writeTextFile(localPath, rewriteDenoImports(content, path));
      }
    } else {
      const assetPath = join(
        this.root,
        "__assets",
        `${dep.name}@${dep.version}${dep.file}`
      );
      const code = processAsset(assetPath);
      await Deno.writeFile(assetPath, new Uint8Array(content));
      await Deno.writeTextFile(localPath, code);
    }
  }

  async downloadSource(dep: DepInfo) {
    const url =
      dep.name === "std"
        ? `https://deno.land/std@${dep.version}${dep.file}`
        : `https://deno.land/x/${dep.name}@${dep.version}${dep.file}`;
    const isScript = globToRegExp("*.(ts|tsx|js|jsx|json|css)").test(dep.file);
    return isScript
      ? (await bundle(new URL(url), { compilerOptions: { sourceMap: false } }))
          .code
      : (await bundle(new URL(url), { compilerOptions: { sourceMap: false } }))
          .code;
  }
}
