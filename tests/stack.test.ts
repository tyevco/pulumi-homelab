import { makeCheckCall, makeDiffCall, callHandler } from "./testUtils";
import { stackResource } from "../src/resources/stack";

const providerProto = require("@pulumi/pulumi/proto/provider_pb");

describe("stack check", () => {
  it("returns failure when name is missing", async () => {
    const call = makeCheckCall({ composeYaml: "version: '3'" });
    const { err, response } = await callHandler(stackResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("name");
  });

  it("returns failure when composeYaml is missing", async () => {
    const call = makeCheckCall({ name: "mystack" });
    const { err, response } = await callHandler(stackResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("composeYaml");
  });

  it("returns two failures when both name and composeYaml are missing", async () => {
    const call = makeCheckCall({});
    const { err, response } = await callHandler(stackResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(2);
    const props = failures.map((f: any) => f.getProperty());
    expect(props).toContain("name");
    expect(props).toContain("composeYaml");
  });

  it("defaults running to true", async () => {
    const call = makeCheckCall({ name: "test", composeYaml: "version: '3'" });
    const { response } = await callHandler(stackResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.running).toBe(true);
  });

  it("preserves explicit running=false", async () => {
    const call = makeCheckCall({ name: "test", composeYaml: "version: '3'", running: false });
    const { response } = await callHandler(stackResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.running).toBe(false);
  });

  it("returns no failures when required fields are present", async () => {
    const call = makeCheckCall({ name: "mystack", composeYaml: "version: '3'" });
    const { err, response } = await callHandler(stackResource.check, call);

    expect(err).toBeNull();
    expect(response.getFailuresList().length).toBe(0);
  });
});

describe("stack diff", () => {
  it("returns DIFF_NONE when no fields changed", async () => {
    const props = { name: "test", composeYaml: "version: '3'", running: true };
    const call = makeDiffCall(props, props);
    const { response } = await callHandler(stackResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
    expect(response.getDiffsList().length).toBe(0);
  });

  it("detects name change as UPDATE_REPLACE", async () => {
    const olds = { name: "old-stack", composeYaml: "version: '3'", running: true };
    const news = { name: "new-stack", composeYaml: "version: '3'", running: true };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(stackResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getReplacesList()).toContain("name");
    const detailedDiff = response.getDetaileddiffMap();
    const nameDiff = detailedDiff.get("name");
    expect(nameDiff).toBeDefined();
    expect(nameDiff.getKind()).toBe(providerProto.PropertyDiff.Kind.UPDATE_REPLACE);
  });

  it("detects composeYaml change with granular compose diffs", async () => {
    const olds = {
      name: "test",
      composeYaml: "services:\n  web:\n    image: nginx:1.0",
      running: true,
    };
    const news = {
      name: "test",
      composeYaml: "services:\n  web:\n    image: nginx:2.0",
      running: true,
    };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(stackResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("composeYaml");
    const detailedDiff = response.getDetaileddiffMap();
    const imageDiff = detailedDiff.get("compose.services.web.image");
    expect(imageDiff).toBeDefined();
    expect(imageDiff.getKind()).toBe(providerProto.PropertyDiff.Kind.UPDATE);
  });

  it("detects envFile change with per-variable diffs", async () => {
    const olds = {
      name: "test",
      composeYaml: "version: '3'",
      running: true,
      envFile: "FOO=bar",
    };
    const news = {
      name: "test",
      composeYaml: "version: '3'",
      running: true,
      envFile: "FOO=baz\nNEW=val",
    };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(stackResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("envFile");
    const detailedDiff = response.getDetaileddiffMap();
    expect(detailedDiff.get("envFile.FOO")).toBeDefined();
    expect(detailedDiff.get("envFile.NEW")).toBeDefined();
  });

  it("detects running change", async () => {
    const olds = { name: "test", composeYaml: "version: '3'", running: true };
    const news = { name: "test", composeYaml: "version: '3'", running: false };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(stackResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("running");
  });

  it("detects autostart change", async () => {
    const olds = { name: "test", composeYaml: "version: '3'", running: true, autostart: false };
    const news = { name: "test", composeYaml: "version: '3'", running: true, autostart: true };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(stackResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("autostart");
  });

  it("detects displayName change", async () => {
    const olds = { name: "test", composeYaml: "version: '3'", running: true, displayName: "Old" };
    const news = { name: "test", composeYaml: "version: '3'", running: true, displayName: "New" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(stackResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("displayName");
  });

  it("detects multiple changes at once", async () => {
    const olds = {
      name: "test",
      composeYaml: "services:\n  web:\n    image: nginx",
      running: true,
      autostart: false,
      displayName: "Old",
    };
    const news = {
      name: "test",
      composeYaml: "services:\n  web:\n    image: apache",
      running: false,
      autostart: true,
      displayName: "New",
    };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(stackResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    const diffs = response.getDiffsList();
    expect(diffs).toContain("composeYaml");
    expect(diffs).toContain("running");
    expect(diffs).toContain("autostart");
    expect(diffs).toContain("displayName");
  });

  it("detects composeOverride change", async () => {
    const olds = {
      name: "test",
      composeYaml: "services:\n  web:\n    image: nginx",
      running: true,
    };
    const news = {
      name: "test",
      composeYaml: "services:\n  web:\n    image: nginx",
      running: true,
      composeOverride: "services:\n  web:\n    ports:\n      - '8080:80'",
    };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(stackResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("composeOverride");
  });
});
