import { makeCheckCall, makeDiffCall, makeCreateCall, makeReadCall, makeUpdateCall, makeDeleteCall, callHandler } from "./testUtils";
import { opnsenseUnboundForwardResource } from "../src/resources/opnsenseUnboundForward";

jest.mock("../src/opnsenseClient", () => ({
  ensureOpnsenseConfigured: jest.fn(),
  withUnboundReconfigure: jest.fn((fn: () => Promise<any>) => fn()),
  addForward: jest.fn(),
  getForward: jest.fn(),
  setForward: jest.fn(),
  delForward: jest.fn(),
  forwardToApi: jest.fn((inputs: any) => ({ server: inputs.server })),
  forwardFromApi: jest.fn((data: any) => ({ server: data.server, enabled: data.enabled === "1" })),
}));

const opnsenseClient = require("../src/opnsenseClient");

const providerProto = require("@pulumi/pulumi/proto/provider_pb");

describe("opnsenseUnboundForward check", () => {
  it("returns failure when server is missing", async () => {
    const call = makeCheckCall({ domain: "example.com" });
    const { err, response } = await callHandler(opnsenseUnboundForwardResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("server");
  });

  it("returns no failures when server is present", async () => {
    const call = makeCheckCall({ server: "8.8.8.8" });
    const { err, response } = await callHandler(opnsenseUnboundForwardResource.check, call);

    expect(err).toBeNull();
    expect(response.getFailuresList().length).toBe(0);
  });

  it("defaults enabled, type, forwardTcpUpstream, forwardFirst", async () => {
    const call = makeCheckCall({ server: "8.8.8.8" });
    const { response } = await callHandler(opnsenseUnboundForwardResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.enabled).toBe(true);
    expect(inputs.type).toBe("forward");
    expect(inputs.forwardTcpUpstream).toBe(false);
    expect(inputs.forwardFirst).toBe(false);
  });

  it("preserves explicit type=dot", async () => {
    const call = makeCheckCall({ server: "1.1.1.1", type: "dot" });
    const { response } = await callHandler(opnsenseUnboundForwardResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.type).toBe("dot");
  });

  it("preserves explicit forwardTcpUpstream=true", async () => {
    const call = makeCheckCall({ server: "8.8.8.8", forwardTcpUpstream: true });
    const { response } = await callHandler(opnsenseUnboundForwardResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.forwardTcpUpstream).toBe(true);
  });

  it("preserves explicit forwardFirst=true", async () => {
    const call = makeCheckCall({ server: "8.8.8.8", forwardFirst: true });
    const { response } = await callHandler(opnsenseUnboundForwardResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.forwardFirst).toBe(true);
  });
});

describe("opnsenseUnboundForward diff", () => {
  it("returns DIFF_NONE when no fields changed", async () => {
    const props = { server: "8.8.8.8", type: "forward", enabled: true };
    const call = makeDiffCall(props, props);
    const { response } = await callHandler(opnsenseUnboundForwardResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
    expect(response.getDiffsList().length).toBe(0);
  });

  it("detects single field change", async () => {
    const olds = { server: "8.8.8.8" };
    const news = { server: "1.1.1.1" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundForwardResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["server"]);
  });

  it("detects multiple field changes", async () => {
    const olds = { server: "8.8.8.8", type: "forward", domain: "example.com" };
    const news = { server: "1.1.1.1", type: "dot", domain: "other.com" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundForwardResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    const diffs = response.getDiffsList();
    expect(diffs).toContain("server");
    expect(diffs).toContain("type");
    expect(diffs).toContain("domain");
  });

  it("detects boolean forwardTcpUpstream change", async () => {
    const olds = { server: "8.8.8.8", forwardTcpUpstream: false };
    const news = { server: "8.8.8.8", forwardTcpUpstream: true };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundForwardResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["forwardTcpUpstream"]);
  });

  it("skips when both old and new are undefined", async () => {
    const olds = { server: "8.8.8.8" };
    const news = { server: "8.8.8.8" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundForwardResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
  });
});

describe("opnsenseUnboundForward create", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("returns preview outputs without calling API", async () => {
    const call = makeCreateCall({ server: "8.8.8.8" }, true);
    const { err, response } = await callHandler(opnsenseUnboundForwardResource.create, call);

    expect(err).toBeNull();
    expect(response.getId()).toBe("preview");
    expect(opnsenseClient.addForward).not.toHaveBeenCalled();
  });

  it("creates forward via withUnboundReconfigure", async () => {
    opnsenseClient.addForward.mockResolvedValue({ uuid: "fwd-uuid-1" });

    const call = makeCreateCall({ server: "8.8.8.8" });
    const { err, response } = await callHandler(opnsenseUnboundForwardResource.create, call);

    expect(err).toBeNull();
    expect(response.getId()).toBe("fwd-uuid-1");
    expect(opnsenseClient.withUnboundReconfigure).toHaveBeenCalled();
  });

  it("returns error on API failure", async () => {
    opnsenseClient.addForward.mockRejectedValue(new Error("connection refused"));

    const call = makeCreateCall({ server: "8.8.8.8" });
    const { err } = await callHandler(opnsenseUnboundForwardResource.create, call);

    expect(err).not.toBeNull();
    expect(err.message).toContain("Failed to create forward");
  });
});

describe("opnsenseUnboundForward read", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("reads forward and returns outputs", async () => {
    opnsenseClient.getForward.mockResolvedValue({ forward: { server: "8.8.8.8", enabled: "1" } });

    const call = makeReadCall("fwd-uuid-1");
    const { err, response } = await callHandler(opnsenseUnboundForwardResource.read, call);

    expect(err).toBeNull();
    expect(response.getId()).toBe("fwd-uuid-1");
  });

  it("returns empty response on 404", async () => {
    opnsenseClient.getForward.mockRejectedValue(new Error("OPNsense API failed (404): not found"));

    const call = makeReadCall("gone-uuid");
    const { err, response } = await callHandler(opnsenseUnboundForwardResource.read, call);

    expect(err).toBeNull();
    expect(response.getId()).toBeFalsy();
  });

  it("returns error on non-404 failure", async () => {
    opnsenseClient.getForward.mockRejectedValue(new Error("connection timeout"));

    const call = makeReadCall("fwd-uuid-1");
    const { err } = await callHandler(opnsenseUnboundForwardResource.read, call);

    expect(err).not.toBeNull();
    expect(err.message).toContain("Failed to read forward");
  });
});

describe("opnsenseUnboundForward update", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("returns preview outputs without calling API", async () => {
    const call = makeUpdateCall("fwd-uuid-1", { server: "8.8.8.8" }, { server: "1.1.1.1" }, true);
    const { err } = await callHandler(opnsenseUnboundForwardResource.update, call);

    expect(err).toBeNull();
    expect(opnsenseClient.setForward).not.toHaveBeenCalled();
  });

  it("updates forward via withUnboundReconfigure", async () => {
    opnsenseClient.setForward.mockResolvedValue(undefined);

    const call = makeUpdateCall("fwd-uuid-1", { server: "8.8.8.8" }, { server: "1.1.1.1" });
    const { err } = await callHandler(opnsenseUnboundForwardResource.update, call);

    expect(err).toBeNull();
    expect(opnsenseClient.withUnboundReconfigure).toHaveBeenCalled();
  });

  it("returns error on API failure", async () => {
    opnsenseClient.setForward.mockRejectedValue(new Error("server error"));

    const call = makeUpdateCall("fwd-uuid-1", {}, { server: "1.1.1.1" });
    const { err } = await callHandler(opnsenseUnboundForwardResource.update, call);

    expect(err).not.toBeNull();
    expect(err.message).toContain("Failed to update forward");
  });
});

describe("opnsenseUnboundForward delete", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("deletes forward via withUnboundReconfigure", async () => {
    opnsenseClient.delForward.mockResolvedValue(undefined);

    const call = makeDeleteCall("fwd-uuid-1");
    const { err } = await callHandler(opnsenseUnboundForwardResource.delete, call);

    expect(err).toBeNull();
    expect(opnsenseClient.withUnboundReconfigure).toHaveBeenCalled();
  });

  it("ignores 404 on delete", async () => {
    opnsenseClient.delForward.mockRejectedValue(new Error("OPNsense API failed (404): not found"));

    const call = makeDeleteCall("gone-uuid");
    const { err } = await callHandler(opnsenseUnboundForwardResource.delete, call);

    expect(err).toBeNull();
  });

  it("returns error on non-404 failure", async () => {
    opnsenseClient.delForward.mockRejectedValue(new Error("connection refused"));

    const call = makeDeleteCall("fwd-uuid-1");
    const { err } = await callHandler(opnsenseUnboundForwardResource.delete, call);

    expect(err).not.toBeNull();
    expect(err.message).toContain("Failed to delete forward");
  });
});
