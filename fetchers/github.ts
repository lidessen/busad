import { WebFetcher } from "./web.ts";

export interface GitHubFetcherOptions {
  repo: string;
  entry: string;
  branch?: string;
  branchQuery?: string;
}

export class GitHubFetcher {
  private readonly webFetcher: WebFetcher;
  constructor(private readonly options: GitHubFetcherOptions) {
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
    return `https://raw.githubusercontent.com/${this.options.repo}`;
  }
}
