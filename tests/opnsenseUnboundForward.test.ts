import { makeCheckCall, makeDiffCall, callHandler } from "./testUtils";
import { opnsenseUnboundForwardResource } from "../src/resources/opnsenseUnboundForward";

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
