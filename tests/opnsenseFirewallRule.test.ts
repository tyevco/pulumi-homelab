import { makeCheckCall, makeDiffCall, callHandler } from "./testUtils";
import { opnsenseFirewallRuleResource } from "../src/resources/opnsenseFirewallRule";

const providerProto = require("@pulumi/pulumi/proto/provider_pb");

describe("opnsenseFirewallRule check", () => {
  it("returns failure when action is missing", async () => {
    const call = makeCheckCall({ interface: "lan" });
    const { err, response } = await callHandler(opnsenseFirewallRuleResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("action");
  });

  it("returns failure when interface is missing", async () => {
    const call = makeCheckCall({ action: "pass" });
    const { err, response } = await callHandler(opnsenseFirewallRuleResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("interface");
  });

  it("returns two failures when both action and interface are missing", async () => {
    const call = makeCheckCall({});
    const { err, response } = await callHandler(opnsenseFirewallRuleResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(2);
    const props = failures.map((f: any) => f.getProperty());
    expect(props).toContain("action");
    expect(props).toContain("interface");
  });

  it("applies defaults for ipprotocol, protocol, direction, quick", async () => {
    const call = makeCheckCall({ action: "pass", interface: "lan" });
    const { response } = await callHandler(opnsenseFirewallRuleResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.ipprotocol).toBe("inet");
    expect(inputs.protocol).toBe("any");
    expect(inputs.direction).toBe("in");
    expect(inputs.quick).toBe(true);
  });

  it("preserves explicit values over defaults", async () => {
    const call = makeCheckCall({
      action: "block",
      interface: "wan",
      ipprotocol: "inet6",
      protocol: "TCP",
      direction: "out",
      quick: false,
    });
    const { response } = await callHandler(opnsenseFirewallRuleResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.ipprotocol).toBe("inet6");
    expect(inputs.protocol).toBe("TCP");
    expect(inputs.direction).toBe("out");
    expect(inputs.quick).toBe(false);
  });

  it("returns no failures when required fields are present", async () => {
    const call = makeCheckCall({ action: "pass", interface: "lan" });
    const { err, response } = await callHandler(opnsenseFirewallRuleResource.check, call);

    expect(err).toBeNull();
    expect(response.getFailuresList().length).toBe(0);
  });
});

describe("opnsenseFirewallRule diff", () => {
  it("returns DIFF_NONE when no fields changed", async () => {
    const props = { action: "pass", interface: "lan", ipprotocol: "inet" };
    const call = makeDiffCall(props, props);
    const { response } = await callHandler(opnsenseFirewallRuleResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
    expect(response.getDiffsList().length).toBe(0);
  });

  it("detects single field change", async () => {
    const olds = { action: "pass", interface: "lan" };
    const news = { action: "block", interface: "lan" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseFirewallRuleResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["action"]);
  });

  it("detects multiple field changes", async () => {
    const olds = { action: "pass", interface: "lan", protocol: "any" };
    const news = { action: "block", interface: "wan", protocol: "TCP" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseFirewallRuleResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    const diffs = response.getDiffsList();
    expect(diffs).toContain("action");
    expect(diffs).toContain("interface");
    expect(diffs).toContain("protocol");
    expect(diffs.length).toBe(3);
  });

  it("detects boolean field change", async () => {
    const olds = { action: "pass", interface: "lan", quick: true };
    const news = { action: "pass", interface: "lan", quick: false };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseFirewallRuleResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["quick"]);
  });

  it("detects undefined vs value as a change", async () => {
    const olds = { action: "pass", interface: "lan" };
    const news = { action: "pass", interface: "lan", description: "new desc" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseFirewallRuleResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("description");
  });

  it("skips when both old and new are undefined", async () => {
    // Neither has sourcePort defined — should NOT count as a diff
    const olds = { action: "pass", interface: "lan" };
    const news = { action: "pass", interface: "lan" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseFirewallRuleResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
  });
});
