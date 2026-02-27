import * as pulumi from "@pulumi/pulumi";

export interface ContainerInfo {
  name: string;
  service: string;
  image: string;
  state: string;
  status: string;
  health: string;
  ports: string[];
}

export type DockgeContainerInfo = ContainerInfo;

export interface StackArgs {
  /** The stack name. Must be unique on the Dockge server. */
  name: pulumi.Input<string>;
  /** The Docker Compose YAML content for this stack. */
  composeYaml: pulumi.Input<string>;
  /** Optional .env file content for the stack. */
  envFile?: pulumi.Input<string>;
  /** Optional docker-compose.override.yml content for the stack. */
  composeOverride?: pulumi.Input<string>;
  /** Whether the stack should autostart (default: false). */
  autostart?: pulumi.Input<boolean>;
  /** Optional display name for the stack. */
  displayName?: pulumi.Input<string>;
  /** Whether the stack should be running (default: true). */
  running?: pulumi.Input<boolean>;
}

export type DockgeStackArgs = StackArgs;

/**
 * Manages a Docker Compose stack on a Dockge server via the REST API.
 * Supports creating, updating, starting, stopping, and deleting stacks.
 *
 * ## Example Usage
 *
 * ```typescript
 * const stack = new homelab.Stack("my-app", {
 *   name: "my-app",
 *   composeYaml: `
 * services:
 *   web:
 *     image: nginx:latest
 *     ports:
 *       - "8080:80"
 * `,
 *   running: true,
 * });
 * ```
 */
export class Stack extends pulumi.CustomResource {
  public readonly name!: pulumi.Output<string>;
  public readonly composeYaml!: pulumi.Output<string>;
  public readonly envFile!: pulumi.Output<string>;
  public readonly composeOverride!: pulumi.Output<string>;
  public readonly autostart!: pulumi.Output<boolean>;
  public readonly displayName!: pulumi.Output<string>;
  public readonly running!: pulumi.Output<boolean>;
  public readonly status!: pulumi.Output<string>;
  public readonly containers!: pulumi.Output<ContainerInfo[]>;

  constructor(name: string, args: StackArgs, opts?: pulumi.CustomResourceOptions) {
    super("homelab:index:Stack", name, {
      status: undefined,
      containers: undefined,
      ...args,
    }, {
      ...opts,
      aliases: [{ type: "dockge:index:DockgeStack" }],
    });
  }
}

export class DockgeStack extends Stack {}
