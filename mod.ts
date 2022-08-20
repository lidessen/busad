import * as esbuild from "https://deno.land/x/esbuild@v0.15.5/mod.js";
import { serve } from "https://deno.land/std@0.152.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.152.0/http/file_server.ts";
import { join, relative } from "https://deno.land/std@0.152.0/path/mod.ts";
import { join as joinUrl } from "https://deno.land/std@0.152.0/path/posix.ts";
import { ensureDir } from "https://deno.land/std@0.152.0/fs/mod.ts";
import { GithubFetcher, GithubFetcherOptions } from "./fetchers/github.ts";

interface Options {
  source: GithubFetcherOptions;
  port?: number;
}

class Busad {
  private readonly fetcher: GithubFetcher;
  private readonly cachePath = "__cache";
  private readonly assetPath = "__assets";
  constructor(private readonly options: Options) {
    this.fetcher = new GithubFetcher(options.source);
  }

  async buildTsx(file: string) {
    const localPath = await this.fetcher.sync(file);
    try {
      const content = await getTextContent(localPath);
      const { code } = await esbuild.transform(content, {
        loader: "tsx",
      });
      await Deno.writeTextFile(join(this.cachePath, file), code);
    } catch (error) {
      console.log(error);
    }
  }

  async buildCss(file: string) {
    const localPath = await this.fetcher.sync(file);
    try {
      const content = await getTextContent(localPath);
      const code = removeIntent(`
      const style = document.createElement('style')
      style.textContent = atob("${btoa(content)}")
      document.head.appendChild(style)
      `);
      await Deno.writeTextFile(join(this.cachePath, file), code);
    } catch (error) {
      console.log(error);
    }
  }

  async buildAsset(file: string) {
    const localPath = await this.fetcher.sync(file);
    try {
      ensureDir(this.assetPath);
      await Deno.copyFile(localPath, join(this.assetPath, file));
      const code = removeIntent(`
      const path = "${joinUrl("/@__assets", file)}"
      export default path
      `);
      await Deno.writeTextFile(join(this.cachePath, file), code);
    } catch (error) {
      console.log(error);
    }
  }

  async handler(req: Request) {
    const url = new URL(req.url);
    await ensureDir(this.cachePath);
    const path = url.pathname;
    try {
      if (path === "/") {
        await this.generateIndex();
        return await serveFile(req, join(this.cachePath, "index.html"));
      }
      if (path.startsWith("/@__assets")) {
        return await serveFile(req, join(this.assetPath, relative('/@__assets', path)));
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

  async generateIndex() {
    const indexPath = join(this.cachePath, "index.html");
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
          <script type="module" src="./${this.options.source.entry}"></script>
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