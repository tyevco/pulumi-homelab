import * as pulumi from "@pulumi/pulumi";

const PLUGIN_VERSION: string = require("./package.json").version;
const PLUGIN_DOWNLOAD_URL = "github://api.github.com/tyevco/pulumi-homelab";

export interface LxcContainerArgs {
  /** The container name. Must match ^[a-z0-9_.-]+$. */
  name: pulumi.Input<string>;
  /** The Linux distribution (e.g., ubuntu, debian, alpine). */
  dist: pulumi.Input<string>;
  /** The distribution release (e.g., jammy, bookworm). */
  release: pulumi.Input<string>;
  /** The architecture (e.g., amd64, arm64). */
  arch: pulumi.Input<string>;
  /** Optional LXC container configuration file content. */
  config?: pulumi.Input<string>;
  /** Whether the container should autostart (default: false). */
  autostart?: pulumi.Input<boolean>;
}

export class LxcContainer extends pulumi.CustomResource {
  public readonly name!: pulumi.Output<string>;
  public readonly dist!: pulumi.Output<string>;
  public readonly release!: pulumi.Output<string>;
  public readonly arch!: pulumi.Output<string>;
  public readonly config!: pulumi.Output<string>;
  public readonly autostart!: pulumi.Output<boolean>;
  public readonly status!: pulumi.Output<number>;
  public readonly ip!: pulumi.Output<string>;
  public readonly pid!: pulumi.Output<number>;
  public readonly memory!: pulumi.Output<string>;

  constructor(name: string, args: LxcContainerArgs, opts?: pulumi.CustomResourceOptions) {
    super("homelab:index:LxcContainer", name, {
      status: undefined,
      ip: undefined,
      pid: undefined,
      memory: undefined,
      ...args,
    }, {
      version: PLUGIN_VERSION,
      pluginDownloadURL: PLUGIN_DOWNLOAD_URL,
      ...opts,
    });
  }
}
