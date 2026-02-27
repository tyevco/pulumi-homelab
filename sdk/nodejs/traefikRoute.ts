import * as pulumi from "@pulumi/pulumi";

export interface TraefikRouteArgs {
  /** The route name (maps to filename: name -> configs/name.yml). Must match ^[a-z0-9_-]+$. */
  name: pulumi.Input<string>;
  /** The YAML content of the route configuration file. */
  content: pulumi.Input<string>;
}

/**
 * Manages a Traefik dynamic route configuration file via the Dockge REST API.
 */
export class TraefikRoute extends pulumi.CustomResource {
  public readonly name!: pulumi.Output<string>;
  public readonly content!: pulumi.Output<string>;
  public readonly lastModified!: pulumi.Output<string>;

  constructor(name: string, args: TraefikRouteArgs, opts?: pulumi.CustomResourceOptions) {
    super("homelab:index:TraefikRoute", name, {
      lastModified: undefined,
      ...args,
    }, opts);
  }
}
