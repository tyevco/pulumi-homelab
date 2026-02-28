import { makeCheckCall, makeDiffCall, callHandler } from "./testUtils";
import { opnsenseUnboundAclResource } from "../src/resources/opnsenseUnboundAcl";

const providerProto = require("@pulumi/pulumi/proto/provider_pb");

describe("opnsenseUnboundAcl check", () => {
  it("returns failure when name is missing", async () => {
    const call = makeCheckCall({ networks: "10.0.0.0/8" });
    const { err, response } = await callHandler(opnsenseUnboundAclResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("name");
  });

  it("returns failure when networks is missing", async () => {
    const call = makeCheckCall({ name: "lan-acl" });
    const { err, response } = await callHandler(opnsenseUnboundAclResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("networks");
  });

  it("returns two failures when both name and networks are missing", async () => {
    const call = makeCheckCall({});
    const { err, response } = await callHandler(opnsenseUnboundAclResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(2);
    const props = failures.map((f: any) => f.getProperty());
    expect(props).toContain("name");
    expect(props).toContain("networks");
  });

  it("returns no failures when required fields are present", async () => {
    const call = makeCheckCall({ name: "lan-acl", networks: "10.0.0.0/8" });
    const { err, response } = await callHandler(opnsenseUnboundAclResource.check, call);

    expect(err).toBeNull();
    expect(response.getFailuresList().length).toBe(0);
  });

  it("defaults enabled to true, action to allow", async () => {
    const call = makeCheckCall({ name: "test", networks: "10.0.0.0/8" });
    const { response } = await callHandler(opnsenseUnboundAclResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.enabled).toBe(true);
    expect(inputs.action).toBe("allow");
  });

  it("preserves explicit enabled=false", async () => {
    const call = makeCheckCall({ name: "test", networks: "10.0.0.0/8", enabled: false });
    const { response } = await callHandler(opnsenseUnboundAclResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.enabled).toBe(false);
  });

  it("preserves explicit action=deny", async () => {
    const call = makeCheckCall({ name: "test", networks: "10.0.0.0/8", action: "deny" });
    const { response } = await callHandler(opnsenseUnboundAclResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.action).toBe("deny");
  });
});

describe("opnsenseUnboundAcl diff", () => {
  it("returns DIFF_NONE when no fields changed", async () => {
    const props = { name: "test", networks: "10.0.0.0/8", enabled: true };
    const call = makeDiffCall(props, props);
    const { response } = await callHandler(opnsenseUnboundAclResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
    expect(response.getDiffsList().length).toBe(0);
  });

  it("detects single field change", async () => {
    const olds = { name: "test", networks: "10.0.0.0/8" };
    const news = { name: "test", networks: "192.168.0.0/16" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundAclResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["networks"]);
  });

  it("detects multiple field changes", async () => {
    const olds = { name: "old", networks: "10.0.0.0/8", action: "allow" };
    const news = { name: "new", networks: "192.168.0.0/16", action: "deny" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundAclResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    const diffs = response.getDiffsList();
    expect(diffs).toContain("name");
    expect(diffs).toContain("networks");
    expect(diffs).toContain("action");
  });

  it("detects boolean enabled change", async () => {
    const olds = { name: "test", networks: "10.0.0.0/8", enabled: true };
    const news = { name: "test", networks: "10.0.0.0/8", enabled: false };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundAclResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["enabled"]);
  });

  it("skips when both old and new are undefined", async () => {
    const olds = { name: "test", networks: "10.0.0.0/8" };
    const news = { name: "test", networks: "10.0.0.0/8" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseUnboundAclResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
  });
});
