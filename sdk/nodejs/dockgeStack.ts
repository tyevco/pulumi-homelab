import * as pulumi from "@pulumi/pulumi";

export interface DockgeContainerInfo {
  name: string;
  service: string;
  image: string;
  state: string;
  status: string;
  health: string;
  ports: string[];
}

export interface DockgeStackArgs {
  /** The stack name. Must be unique on the Dockge server. */
  name: pulumi.Input<string>;
  /** The Docker Compose YAML content for this stack. */
  composeYaml: pulumi.Input<string>;
  /** Optional .env file content for the stack. */
  envFile?: pulumi.Input<string>;
  /** Whether the stack should be running (default: true). */
  running?: pulumi.Input<boolean>;
}

/**
 * Manages a Docker Compose stack on a Dockge server via the REST API.
 * Supports creating, updating, starting, stopping, and deleting stacks.
 *
 * ## Example Usage
 *
 * ```typescript
 * const stack = new dockge.DockgeStack("my-app", {
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
export class DockgeStack extends pulumi.CustomResource {
  declare readonly name: pulumi.Output<string>;
  declare readonly composeYaml: pulumi.Output<string>;
  declare readonly envFile: pulumi.Output<string>;
  declare readonly running: pulumi.Output<boolean>;
  declare readonly status: pulumi.Output<string>;
  declare readonly containers: pulumi.Output<DockgeContainerInfo[]>;

  constructor(name: string, args: DockgeStackArgs, opts?: pulumi.CustomResourceOptions) {
    super("dockge:index:DockgeStack", name, {
      status: undefined,
      containers: undefined,
      ...args,
    }, opts);
  }
}
