import { makeCheckCall, makeDiffCall, callHandler } from "./testUtils";
import { opnsenseUnboundDnsblResource } from "../src/resources/opnsenseUnboundDnsbl";

const providerProto = require("@pulumi/pulumi/proto/provider_pb");

describe("opnsenseUnboundDnsbl check", () => {
  it("returns failure when description is missing", async () => {
    const call = makeCheckCall({ type: "dnsbl" });
    const { err, response } = await callHandler(opnsenseUnboundDnsblResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("description");
  });

  it("returns no failures when description is present", async () => {
    const call = makeCheckCall({ description: "My blocklist" });
    const { err, response } = await callHandler(opnsenseUnboundDnsblResource.check, call);

    expect(err).toBeNull();
    expect(response.getFailuresList().length).toBe(0);
  });

  it("defaults enabled to true, cacheTtl to 72000", async () => {
    const call = makeCheckCall({ description: "test" });
    const { response } = await callHandler(opnsenseUnboundDnsblResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.enabled).toBe(true);
    expect(inputs.cacheTtl).toBe(72000);
  });

  it("preserves explicit enabled=false", async () => {
    const call = makeCheckCall({ description: "test", enabled: false });
    const { response } = await callHandler(opnsenseUnboundDnsblResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.enabled).toBe(false);
  });

  it("preserves explicit cacheTtl", async () => {
    const call = makeCheckCall({ description: "test", cacheTtl: 3600 });
    const { response } = await callHandler(opnsenseUnboundDnsblResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.cacheTtl).toBe(3600);
  });
});

describe("opnsenseUnboundDnsbl diff", () => {
  it("returns DIFF_NONE when no fields changed", async () => {
    const props = { description: "test", enabled: true, cacheTtl: 72000 };
    const call = makeDiffCall(props, props);
    const { response } = await callHandler(opnsenseUnboundDnsblResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
    expect(response.getDiffsList().length).toBe(0);
  });

  it("detects single field change", async () => {
    const olds = { description: "old" };
    const news = { description: "new" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundDnsblResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["description"]);
  });

  it("detects multiple field changes", async () => {
    const olds = { description: "old", type: "dnsbl", lists: "list1" };
    const news = { description: "new", type: "other", lists: "list2" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundDnsblResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    const diffs = response.getDiffsList();
    expect(diffs).toContain("description");
    expect(diffs).toContain("type");
    expect(diffs).toContain("lists");
  });

  it("detects boolean nxdomain change", async () => {
    const olds = { description: "test", nxdomain: false };
    const news = { description: "test", nxdomain: true };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundDnsblResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["nxdomain"]);
  });

  it("detects cacheTtl change", async () => {
    const olds = { description: "test", cacheTtl: 72000 };
    const news = { description: "test", cacheTtl: 3600 };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundDnsblResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["cacheTtl"]);
  });

  it("skips when both old and new are undefined", async () => {
    const olds = { description: "test" };
    const news = { description: "test" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundDnsblResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
  });
});
