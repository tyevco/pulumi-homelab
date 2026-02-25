import * as grpc from "@grpc/grpc-js";

const structProto = require("google-protobuf/google/protobuf/struct_pb");

export function structToObject(struct: any): Record<string, any> {
  if (!struct) return {};
  return struct.toJavaScript();
}

export function objectToStruct(obj: Record<string, any>): any {
  // Clean out undefined values before converting
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return structProto.Struct.fromJavaScript(cleaned);
}

export function makeCheckFailure(property: string, reason: string): any {
  const providerProto = require("@pulumi/pulumi/proto/provider_pb");
  const failure = new providerProto.CheckFailure();
  failure.setProperty(property);
  failure.setReason(reason);
  return failure;
}

export function grpcError(code: grpc.status, message: string): grpc.ServiceError {
  return { code, details: message, message, metadata: new grpc.Metadata(), name: "ServiceError" };
}

export type GrpcCallback<T> = grpc.sendUnaryData<T>;
export type GrpcCall<Req, Res> = grpc.ServerUnaryCall<Req, Res>;

/**
 * Extract the resource type token from a gRPC request URN.
 * URN format: urn:pulumi:stack::project::type::name
 * Since Pulumi SDK v3.132.0, getType() is available directly.
 */
export function getResourceType(call: any): string {
  // Try getType() first (available since SDK v3.132.0)
  if (typeof call.request.getType === "function") {
    const type = call.request.getType();
    if (type) return type;
  }
  // Fallback: parse from URN
  const urn = call.request.getUrn?.();
  if (urn) {
    // urn:pulumi:stack::project::provider:module:Type::name
    const parts = urn.split("::");
    if (parts.length >= 3) {
      return parts[2];
    }
  }
  return "";
}
