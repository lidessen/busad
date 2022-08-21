import { join, dirname } from "https://deno.land/std@0.152.0/path/mod.ts";
import { join as joinUrl } from "https://deno.land/std@0.152.0/path/posix.ts";
import { ensureDir } from "https://deno.land/std@0.152.0/fs/ensure_dir.ts";

interface WebFetcherOptions {
  base: string;
  localPath: string;
}

export class WebFetcher {
  constructor(private readonly options: WebFetcherOptions) {}

  async sync(path: string) {
    await ensureDir(dirname(this.localPath(path)));
    if (!(await this.exists(path))) {
      await this.download(path);
    }

    return this.localPath(path);
  }

  private localPath(path: string) {
    return join(this.options.localPath, path);
  }

  private webUrl(path: string) {
    const url = new URL(this.options.base);
    url.pathname = joinUrl(url.pathname, path);
    return url;
  }

  private async exists(path: string) {
    try {
      await Deno.stat(this.localPath(path));
      return true;
    } catch (_error) {
      return false;
    }
  }

  private async download(path: string) {
    const content = await fetch(this.webUrl(path));
    const buffers = await content.arrayBuffer();
    await Deno.writeFile(this.localPath(path), new Uint8Array(buffers));
  }
}
