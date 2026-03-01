import { makeCheckCall, makeDiffCall, callHandler } from "./testUtils";
import { lxcContainerResource } from "../src/resources/lxcContainer";

const providerProto = require("@pulumi/pulumi/proto/provider_pb");

describe("lxcContainer check", () => {
  it("returns failure when name is missing", async () => {
    const call = makeCheckCall({ dist: "ubuntu", release: "jammy", arch: "amd64" });
    const { err, response } = await callHandler(lxcContainerResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("name");
  });

  it("returns failure when name has invalid characters", async () => {
    const call = makeCheckCall({ name: "INVALID NAME!", dist: "ubuntu", release: "jammy", arch: "amd64" });
    const { err, response } = await callHandler(lxcContainerResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("name");
    expect(failures[0].getReason()).toContain("must match");
  });

  it("returns failure when dist is missing", async () => {
    const call = makeCheckCall({ name: "test", release: "jammy", arch: "amd64" });
    const { err, response } = await callHandler(lxcContainerResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("dist");
  });

  it("returns failure when release is missing", async () => {
    const call = makeCheckCall({ name: "test", dist: "ubuntu", arch: "amd64" });
    const { err, response } = await callHandler(lxcContainerResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("release");
  });

  it("returns failure when arch is missing", async () => {
    const call = makeCheckCall({ name: "test", dist: "ubuntu", release: "jammy" });
    const { err, response } = await callHandler(lxcContainerResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("arch");
  });

  it("returns multiple failures when all required fields missing", async () => {
    const call = makeCheckCall({});
    const { err, response } = await callHandler(lxcContainerResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(4);
    const props = failures.map((f: any) => f.getProperty());
    expect(props).toContain("name");
    expect(props).toContain("dist");
    expect(props).toContain("release");
    expect(props).toContain("arch");
  });

  it("defaults autostart to false", async () => {
    const call = makeCheckCall({ name: "test", dist: "ubuntu", release: "jammy", arch: "amd64" });
    const { response } = await callHandler(lxcContainerResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.autostart).toBe(false);
  });

  it("preserves explicit autostart value", async () => {
    const call = makeCheckCall({ name: "test", dist: "ubuntu", release: "jammy", arch: "amd64", autostart: true });
    const { response } = await callHandler(lxcContainerResource.check, call);

    const inputs = response.getInputs().toJavaScript();
    expect(inputs.autostart).toBe(true);
  });

  it("returns no failures when all required fields are present", async () => {
    const call = makeCheckCall({ name: "test", dist: "ubuntu", release: "jammy", arch: "amd64" });
    const { err, response } = await callHandler(lxcContainerResource.check, call);

    expect(err).toBeNull();
    expect(response.getFailuresList().length).toBe(0);
  });
});

describe("lxcContainer diff", () => {
  it("returns DIFF_NONE when no fields changed", async () => {
    const props = { name: "test", dist: "ubuntu", release: "jammy", arch: "amd64", autostart: false };
    const call = makeDiffCall(props, props);
    const { response } = await callHandler(lxcContainerResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
    expect(response.getDiffsList().length).toBe(0);
  });

  it("marks name change as UPDATE_REPLACE", async () => {
    const olds = { name: "old", dist: "ubuntu", release: "jammy", arch: "amd64" };
    const news = { name: "new", dist: "ubuntu", release: "jammy", arch: "amd64" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(lxcContainerResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("name");
    expect(response.getReplacesList()).toContain("name");
  });

  it("marks dist change as UPDATE_REPLACE", async () => {
    const olds = { name: "test", dist: "ubuntu", release: "jammy", arch: "amd64" };
    const news = { name: "test", dist: "debian", release: "jammy", arch: "amd64" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(lxcContainerResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getReplacesList()).toContain("dist");
  });

  it("marks release change as UPDATE_REPLACE", async () => {
    const olds = { name: "test", dist: "ubuntu", release: "jammy", arch: "amd64" };
    const news = { name: "test", dist: "ubuntu", release: "noble", arch: "amd64" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(lxcContainerResource.diff, call);

    expect(response.getReplacesList()).toContain("release");
  });

  it("marks arch change as UPDATE_REPLACE", async () => {
    const olds = { name: "test", dist: "ubuntu", release: "jammy", arch: "amd64" };
    const news = { name: "test", dist: "ubuntu", release: "jammy", arch: "arm64" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(lxcContainerResource.diff, call);

    expect(response.getReplacesList()).toContain("arch");
  });

  it("marks config change as UPDATE (not replace)", async () => {
    const olds = { name: "test", dist: "ubuntu", release: "jammy", arch: "amd64", config: "old" };
    const news = { name: "test", dist: "ubuntu", release: "jammy", arch: "amd64", config: "new" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(lxcContainerResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("config");
    expect(response.getReplacesList()).not.toContain("config");
  });

  it("marks autostart change as UPDATE (not replace)", async () => {
    const olds = { name: "test", dist: "ubuntu", release: "jammy", arch: "amd64", autostart: false };
    const news = { name: "test", dist: "ubuntu", release: "jammy", arch: "amd64", autostart: true };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(lxcContainerResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("autostart");
    expect(response.getReplacesList()).not.toContain("autostart");
  });

  it("detects multiple changes", async () => {
    const olds = { name: "old", dist: "ubuntu", release: "jammy", arch: "amd64", config: "a" };
    const news = { name: "new", dist: "debian", release: "bookworm", arch: "arm64", config: "b" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(lxcContainerResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    const diffs = response.getDiffsList();
    expect(diffs).toContain("name");
    expect(diffs).toContain("dist");
    expect(diffs).toContain("release");
    expect(diffs).toContain("arch");
    expect(diffs).toContain("config");
  });

  it("skips when both old and new config are undefined", async () => {
    const olds = { name: "test", dist: "ubuntu", release: "jammy", arch: "amd64" };
    const news = { name: "test", dist: "ubuntu", release: "jammy", arch: "amd64" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(lxcContainerResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
  });
});
