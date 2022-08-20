import { WebFetcher } from "./web.ts";

export interface GithubFetcherOptions {
  repo: string;
  entry: string;
  branch?: string;
}

export class GithubFetcher {
  private readonly webFetcher: WebFetcher;
  constructor(private readonly options: GithubFetcherOptions) {
    this.webFetcher = new WebFetcher({
      base: this.base,
      localPath: "./__source",
    });
  }

  async sync(path: string) {
    return await this.webFetcher.sync(path);
  }

  get entryPath() {
    return `${this.base}/${this.options.entry}`;
  }

  get base() {
    return `https://raw.githubusercontent.com/${this.options.repo}/${
      this.options.branch ?? "main"
    }`;
  }
}
