// Pulumi SDK for Homelab - manages homelab infrastructure via the Dockge REST API

// Provider
export { Provider, ProviderArgs } from "./provider";

// Resources
export { Stack, StackArgs, ContainerInfo } from "./stack";
export { TraefikStaticConfig, TraefikStaticConfigArgs } from "./traefikStaticConfig";
export { TraefikRoute, TraefikRouteArgs } from "./traefikRoute";
export { OpnsenseFirewallRule, OpnsenseFirewallRuleArgs } from "./opnsenseFirewallRule";
export { OpnsenseAlias, OpnsenseAliasArgs } from "./opnsenseAlias";

// Backward compatibility aliases
export { DockgeStack, DockgeStackArgs, DockgeContainerInfo } from "./stack";
