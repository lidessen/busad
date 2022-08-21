import * as esbuild from "https://deno.land/x/esbuild@v0.15.5/mod.js";
import { serve } from "https://deno.land/std@0.152.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.152.0/http/file_server.ts";
import {
  join,
  relative,
  dirname,
} from "https://deno.land/std@0.152.0/path/mod.ts";
import { join as joinUrl } from "https://deno.land/std@0.152.0/path/posix.ts";
import { ensureDir } from "https://deno.land/std@0.152.0/fs/mod.ts";
import { GitHubFetcher, GitHubFetcherOptions } from "./fetchers/github.ts";
import { rewriteDenoImports, rewriteGitHubImports } from "./import.ts";
import { processAsset, processCss } from "./process.ts";
import { DenoDependency } from "./dep/deno.ts";

interface Options {
  source: GitHubFetcherOptions;
  port?: number;
}

class Busad {
  private readonly fetcher: GitHubFetcher;
  private readonly denoDeps: DenoDependency;
  private readonly cachePath = "__cache";
  private readonly assetPath = "__assets";
  constructor(private readonly options: Options) {
    this.fetcher = new GitHubFetcher(options.source);
    this.denoDeps = new DenoDependency();
  }

  async buildTsx(file: string) {
    const localPath = await this.fetcher.sync(file);
    try {
      const content = await getTextContent(localPath);
      let { code } = await esbuild.transform(content, {
        loader: "tsx",
      });
      code = rewriteGitHubImports(code);
      code = rewriteDenoImports(code);
      await Deno.writeTextFile(join(this.cachePath, file), code);
    } catch (error) {
      console.log(error);
    }
  }

  async buildCss(file: string) {
    const localPath = await this.fetcher.sync(file);
    try {
      const content = await getTextContent(localPath);
      const code = processCss(content);
      await Deno.writeTextFile(join(this.cachePath, file), code);
    } catch (error) {
      console.log(error);
    }
  }

  async buildAsset(file: string) {
    const localPath = await this.fetcher.sync(file);
    try {
      const assetPath = join(this.assetPath, file);
      const cachePath = join(this.cachePath, file);
      await ensureDir(dirname(assetPath));
      await ensureDir(dirname(cachePath));
      await Deno.copyFile(localPath, assetPath);
      const code = processAsset(joinUrl("/@__assets", file));
      await Deno.writeTextFile(cachePath, code);
    } catch (error) {
      console.log(error);
    }
  }

  async handler(req: Request) {
    const url = new URL(req.url);
    const branch =
      url.searchParams.get("branch") ?? this.options.source.branch ?? "main";
    await ensureDir(join(this.cachePath, branch));
    const path = url.pathname;
    try {
      if (path === "/") {
        await this.generateIndex(branch);
        return await serveFile(req, join(this.cachePath, branch, "index.html"));
      }
      if (path.startsWith("/@__assets")) {
        return await serveFile(
          req,
          join(this.assetPath, relative("/@__assets", path))
        );
      }
      if (path.startsWith("/@deno")) {
        await this.denoDeps.sync(path);
        const headers = new Headers();
        headers.append("content-type", "application/javascript");
        return new Response(
          await Deno.readTextFile(
            join(this.denoDeps.root, relative("/@deno", path))
          ),
          {
            headers,
          }
        );
      }
      if (path.endsWith(".ts") || path.endsWith(".tsx")) {
        await this.buildTsx(path);
        const headers = new Headers();
        headers.append("content-type", "application/javascript");
        return new Response(
          await Deno.readTextFile(join(this.cachePath, path)),
          {
            headers,
          }
        );
      }
      if (path.endsWith(".css")) {
        await this.buildCss(path);
        const headers = new Headers();
        headers.append("content-type", "application/javascript");
        return new Response(
          await Deno.readTextFile(join(this.cachePath, path)),
          {
            headers,
          }
        );
      }
      await this.buildAsset(path);
      const headers = new Headers();
      headers.append("content-type", "application/javascript");
      return new Response(await Deno.readTextFile(join(this.cachePath, path)), {
        headers,
      });
    } catch (_error) {
      const headers = new Headers();
      headers.append("content-type", "text/html");
      return new Response(
        removeIntent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document</title>
      </head>
      <body>
          File not found!
      </body>
      </html>`),
        {
          headers,
        }
      );
    }
  }

  async generateIndex(branch: string) {
    const indexPath = join(this.cachePath, branch, "index.html");
    if (await exists(indexPath)) {
      return;
    }

    const code = removeIntent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document</title>
      </head>
      <body>
          <script type="module" src="./${branch}/${this.options.source.entry}"></script>
      </body>
      </html>`);

    await Deno.writeTextFile(indexPath, code);
  }

  serve() {
    serve(this.handler.bind(this), { port: this.options.port ?? 3000 });
  }
}

async function getTextContent(file: string) {
  return await Deno.readTextFile(file);
}

function removeIntent(text: string) {
  const rows = text.split(/\r?\n/);
  const indentLenght = /$\t+/.exec(rows[0])?.[0].length ?? 0;
  return rows.map((row) => row.substring(indentLenght, row.length)).join("\n");
}

async function exists(filepath: string) {
  try {
    await Deno.stat(filepath);
    return true;
  } catch (_error) {
    return false;
  }
}

export function busad(options: Options) {
  return new Busad(options);
}