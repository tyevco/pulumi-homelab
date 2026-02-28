import { GrpcCallback, GrpcCall, getResourceType } from "./helpers";
import { stackResource } from "./resources/stack";
import { traefikStaticConfigResource } from "./resources/traefikStaticConfig";
import { traefikRouteResource } from "./resources/traefikRoute";
import { opnsenseFirewallRuleResource } from "./resources/opnsenseFirewallRule";
import { opnsenseAliasResource } from "./resources/opnsenseAlias";

import * as grpc from "@grpc/grpc-js";

interface ResourceHandler {
  check: (call: GrpcCall<any, any>, callback: GrpcCallback<any>) => Promise<void>;
  diff: (call: GrpcCall<any, any>, callback: GrpcCallback<any>) => Promise<void>;
  create: (call: GrpcCall<any, any>, callback: GrpcCallback<any>) => Promise<void>;
  read: (call: GrpcCall<any, any>, callback: GrpcCallback<any>) => Promise<void>;
  update: (call: GrpcCall<any, any>, callback: GrpcCallback<any>) => Promise<void>;
  delete: (call: GrpcCall<any, any>, callback: GrpcCallback<any>) => Promise<void>;
}

const resourceHandlers: Record<string, ResourceHandler> = {
  "homelab:index:Stack": stackResource,
  "dockge:index:DockgeStack": stackResource, // backward compat
  "homelab:index:TraefikStaticConfig": traefikStaticConfigResource,
  "homelab:index:TraefikRoute": traefikRouteResource,
  "homelab:index:OpnsenseFirewallRule": opnsenseFirewallRuleResource,
  "homelab:index:OpnsenseAlias": opnsenseAliasResource,
};

function getHandler(call: GrpcCall<any, any>): ResourceHandler | undefined {
  const resourceType = getResourceType(call);
  return resourceHandlers[resourceType];
}

function unknownResourceError(call: GrpcCall<any, any>): grpc.ServiceError {
  const resourceType = getResourceType(call);
  return {
    code: grpc.status.UNIMPLEMENTED,
    details: `Unknown resource type: ${resourceType}`,
    message: `Unknown resource type: ${resourceType}`,
    metadata: new grpc.Metadata(),
    name: "ServiceError",
  };
}

export function dispatchCheck(call: GrpcCall<any, any>, callback: GrpcCallback<any>) {
  const handler = getHandler(call);
  if (!handler) {
    callback(unknownResourceError(call));
    return;
  }
  handler.check(call, callback);
}

export function dispatchDiff(call: GrpcCall<any, any>, callback: GrpcCallback<any>) {
  const handler = getHandler(call);
  if (!handler) {
    callback(unknownResourceError(call));
    return;
  }
  handler.diff(call, callback);
}

export function dispatchCreate(call: GrpcCall<any, any>, callback: GrpcCallback<any>) {
  const handler = getHandler(call);
  if (!handler) {
    callback(unknownResourceError(call));
    return;
  }
  handler.create(call, callback);
}

export function dispatchRead(call: GrpcCall<any, any>, callback: GrpcCallback<any>) {
  const handler = getHandler(call);
  if (!handler) {
    callback(unknownResourceError(call));
    return;
  }
  handler.read(call, callback);
}

export function dispatchUpdate(call: GrpcCall<any, any>, callback: GrpcCallback<any>) {
  const handler = getHandler(call);
  if (!handler) {
    callback(unknownResourceError(call));
    return;
  }
  handler.update(call, callback);
}

export function dispatchDelete(call: GrpcCall<any, any>, callback: GrpcCallback<any>) {
  const handler = getHandler(call);
  if (!handler) {
    callback(unknownResourceError(call));
    return;
  }
  handler.delete(call, callback);
}
