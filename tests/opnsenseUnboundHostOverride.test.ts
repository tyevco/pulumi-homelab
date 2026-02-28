import { makeCheckCall, makeDiffCall, callHandler } from "./testUtils";
import { opnsenseUnboundHostOverrideResource } from "../src/resources/opnsenseUnboundHostOverride";

const providerProto = require("@pulumi/pulumi/proto/provider_pb");

describe("opnsenseUnboundHostOverride check", () => {
  it("returns failure when domain is missing", async () => {
    const call = makeCheckCall({ server: "1.2.3.4" });
    const { err, response } = await callHandler(opnsenseUnboundHostOverrideResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("domain");
  });

  it("returns no failures when domain is present", async () => {
    const call = makeCheckCall({ domain: "example.com" });
    const { err, response } = await callHandler(opnsenseUnboundHostOverrideResource.check, call);

    expect(err).toBeNull();
    expect(response.getFailuresList().length).toBe(0);
  });

  it("defaults enabled to true, rr to A, addptr to true", async () => {
    const call = makeCheckCall({ domain: "example.com" });
    const { response } = await callHandler(opnsenseUnboundHostOverrideResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.enabled).toBe(true);
    expect(inputs.rr).toBe("A");
    expect(inputs.addptr).toBe(true);
  });

  it("preserves explicit enabled=false", async () => {
    const call = makeCheckCall({ domain: "example.com", enabled: false });
    const { response } = await callHandler(opnsenseUnboundHostOverrideResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.enabled).toBe(false);
  });

  it("preserves explicit rr=AAAA", async () => {
    const call = makeCheckCall({ domain: "example.com", rr: "AAAA" });
    const { response } = await callHandler(opnsenseUnboundHostOverrideResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.rr).toBe("AAAA");
  });

  it("preserves explicit addptr=false", async () => {
    const call = makeCheckCall({ domain: "example.com", addptr: false });
    const { response } = await callHandler(opnsenseUnboundHostOverrideResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.addptr).toBe(false);
  });
});

describe("opnsenseUnboundHostOverride diff", () => {
  it("returns DIFF_NONE when no fields changed", async () => {
    const props = { domain: "example.com", rr: "A", enabled: true };
    const call = makeDiffCall(props, props);
    const { response } = await callHandler(opnsenseUnboundHostOverrideResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
    expect(response.getDiffsList().length).toBe(0);
  });

  it("detects single field change", async () => {
    const olds = { domain: "example.com", server: "1.2.3.4" };
    const news = { domain: "example.com", server: "5.6.7.8" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundHostOverrideResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["server"]);
  });

  it("detects multiple field changes", async () => {
    const olds = { domain: "old.com", hostname: "host1", rr: "A" };
    const news = { domain: "new.com", hostname: "host2", rr: "AAAA" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundHostOverrideResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    const diffs = response.getDiffsList();
    expect(diffs).toContain("domain");
    expect(diffs).toContain("hostname");
    expect(diffs).toContain("rr");
  });

  it("detects boolean addptr change", async () => {
    const olds = { domain: "example.com", addptr: true };
    const news = { domain: "example.com", addptr: false };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundHostOverrideResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["addptr"]);
  });

  it("skips when both old and new are undefined", async () => {
    const olds = { domain: "example.com" };
    const news = { domain: "example.com" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundHostOverrideResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
  });
});
