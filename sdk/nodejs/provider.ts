import * as pulumi from "@pulumi/pulumi";

/**
 * The provider type for the Dockge package. By default, resources use package-wide configuration
 * settings, however an explicit `Provider` instance may be created and passed during resource
 * construction to achieve fine-grained programmatic control over provider settings.
 */
export class Provider extends pulumi.ProviderResource {
  declare readonly url: pulumi.Output<string>;
  declare readonly apiKey: pulumi.Output<string>;

  constructor(name: string, args: ProviderArgs, opts?: pulumi.ResourceOptions) {
    const inputs: pulumi.Inputs = {
      url: args.url,
      apiKey: args.apiKey,
    };
    super("dockge", name, inputs, opts);
  }
}

export interface ProviderArgs {
  /** The URL of the Dockge server (e.g., http://192.168.1.100:5001) */
  url: pulumi.Input<string>;
  /** API key for authenticating with the Dockge REST API */
  apiKey: pulumi.Input<string>;
}
