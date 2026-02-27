import * as fs from "fs";
import * as path from "path";
import * as grpc from "@grpc/grpc-js";
import { structToObject, objectToStruct, unwrapSecret } from "./helpers";
import { configureClient } from "./dockgeClient";
import { dispatchCheck, dispatchDiff, dispatchCreate, dispatchRead, dispatchUpdate, dispatchDelete } from "./provider";

const providerProto = require("@pulumi/pulumi/proto/provider_pb");
const providerGrpc = require("@pulumi/pulumi/proto/provider_grpc_pb");
const pluginProto = require("@pulumi/pulumi/proto/plugin_pb");
const emptyProto = require("google-protobuf/google/protobuf/empty_pb");

const schema = fs.readFileSync(
  path.join(__dirname, "..", "schema.json"),
  "utf-8"
);

const providerImpl = {
  getPluginInfo(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    const response = new pluginProto.PluginInfo();
    response.setVersion("0.1.0");
    callback(null, response);
  },

  getSchema(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    const response = new providerProto.GetSchemaResponse();
    response.setSchema(schema);
    callback(null, response);
  },

  configure(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    const args = structToObject(call.request.getArgs());

    // Extract provider configuration (unwrap secrets)
    // Accept both homelab:config:* and legacy dockge:config:* prefixes
    const url = unwrapSecret(args["url"] || args["homelab:config:url"] || args["dockge:config:url"]) || "";
    const apiKey = unwrapSecret(args["apiKey"] || args["homelab:config:apiKey"] || args["dockge:config:apiKey"]) || "";

    if (url && apiKey) {
      configureClient({ url, apiKey });
    }

    const response = new providerProto.ConfigureResponse();
    response.setAcceptsecrets(true);
    response.setSupportspreview(true);
    callback(null, response);
  },

  checkConfig(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    const news = structToObject(call.request.getNews());
    const failures: any[] = [];

    const url = news["url"] || "";
    const apiKey = news["apiKey"] || "";

    if (!url) {
      const failure = new providerProto.CheckFailure();
      failure.setProperty("url");
      failure.setReason("url is required. Set it via `pulumi config set homelab:url <url>`");
      failures.push(failure);
    }

    if (!apiKey) {
      const failure = new providerProto.CheckFailure();
      failure.setProperty("apiKey");
      failure.setReason("apiKey is required. Set it via `pulumi config set --secret homelab:apiKey <key>`");
      failures.push(failure);
    }

    const response = new providerProto.CheckResponse();
    response.setInputs(call.request.getNews());
    failures.forEach((f) => response.addFailures(f));
    callback(null, response);
  },

  diffConfig(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    const response = new providerProto.DiffResponse();
    callback(null, response);
  },

  check(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    dispatchCheck(call, callback);
  },

  diff(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    dispatchDiff(call, callback);
  },

  create(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    dispatchCreate(call, callback);
  },

  read(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    dispatchRead(call, callback);
  },

  update(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    dispatchUpdate(call, callback);
  },

  delete(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    dispatchDelete(call, callback);
  },

  invoke(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    const tok = call.request.getTok();
    callback({
      code: grpc.status.UNIMPLEMENTED,
      message: `Unknown function: ${tok}`,
    });
  },

  cancel(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    callback(null, new emptyProto.Empty());
  },
};

// Start gRPC server
const server = new grpc.Server();
server.addService(providerGrpc.ResourceProviderService, providerImpl);

server.bindAsync(
  "127.0.0.1:0",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error(`Failed to bind: ${err}`);
      process.exit(1);
    }

    // Pulumi reads the port from stdout
    console.log(port);
  }
);
