import { makeCheckCall, makeDiffCall, callHandler } from "./testUtils";
import { opnsenseAliasResource } from "../src/resources/opnsenseAlias";

const providerProto = require("@pulumi/pulumi/proto/provider_pb");

describe("opnsenseAlias check", () => {
  it("returns failure when name is missing", async () => {
    const call = makeCheckCall({ type: "host" });
    const { err, response } = await callHandler(opnsenseAliasResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("name");
  });

  it("returns failure when type is missing", async () => {
    const call = makeCheckCall({ name: "blocklist" });
    const { err, response } = await callHandler(opnsenseAliasResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("type");
  });

  it("returns two failures when both name and type are missing", async () => {
    const call = makeCheckCall({});
    const { err, response } = await callHandler(opnsenseAliasResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(2);
    const props = failures.map((f: any) => f.getProperty());
    expect(props).toContain("name");
    expect(props).toContain("type");
  });

  it("defaults enabled to true", async () => {
    const call = makeCheckCall({ name: "test", type: "host" });
    const { response } = await callHandler(opnsenseAliasResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.enabled).toBe(true);
  });

  it("preserves explicit enabled=false", async () => {
    const call = makeCheckCall({ name: "test", type: "host", enabled: false });
    const { response } = await callHandler(opnsenseAliasResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.enabled).toBe(false);
  });

  it("returns no failures when required fields are present", async () => {
    const call = makeCheckCall({ name: "myalias", type: "network" });
    const { err, response } = await callHandler(opnsenseAliasResource.check, call);

    expect(err).toBeNull();
    expect(response.getFailuresList().length).toBe(0);
  });
});

describe("opnsenseAlias diff", () => {
  it("returns DIFF_NONE when no fields changed", async () => {
    const props = { name: "test", type: "host", enabled: true };
    const call = makeDiffCall(props, props);
    const { response } = await callHandler(opnsenseAliasResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
    expect(response.getDiffsList().length).toBe(0);
  });

  it("detects single field change", async () => {
    const olds = { name: "test", type: "host" };
    const news = { name: "test", type: "network" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseAliasResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["type"]);
  });

  it("detects multiple field changes", async () => {
    const olds = { name: "old", type: "host", description: "old desc" };
    const news = { name: "new", type: "network", description: "new desc" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseAliasResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    const diffs = response.getDiffsList();
    expect(diffs).toContain("name");
    expect(diffs).toContain("type");
    expect(diffs).toContain("description");
  });

  it("detects boolean enabled change", async () => {
    const olds = { name: "test", type: "host", enabled: true };
    const news = { name: "test", type: "host", enabled: false };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(opnsenseAliasResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toEqual(["enabled"]);
  });
});
