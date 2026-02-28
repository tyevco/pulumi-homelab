import { makeCheckCall, makeDiffCall, callHandler } from "./testUtils";
import { traefikRouteResource } from "../src/resources/traefikRoute";
import { traefikStaticConfigResource } from "../src/resources/traefikStaticConfig";

const providerProto = require("@pulumi/pulumi/proto/provider_pb");

describe("TraefikRoute check", () => {
  it("returns failure when name is missing", async () => {
    const call = makeCheckCall({ content: "http:\n  routers: {}" });
    const { err, response } = await callHandler(traefikRouteResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("name");
  });

  it("returns failure when name has invalid characters", async () => {
    const call = makeCheckCall({ name: "My Route!", content: "http:\n  routers: {}" });
    const { err, response } = await callHandler(traefikRouteResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("name");
    expect(failures[0].getReason()).toContain("^[a-z0-9_-]+$");
  });

  it("returns failure when content is missing", async () => {
    const call = makeCheckCall({ name: "my-route" });
    const { err, response } = await callHandler(traefikRouteResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("content");
  });

  it("returns failure when content is invalid YAML", async () => {
    const call = makeCheckCall({ name: "my-route", content: "key: [unterminated" });
    const { err, response } = await callHandler(traefikRouteResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("content");
    expect(failures[0].getReason()).toContain("Invalid YAML");
  });

  it("returns no failures with valid inputs", async () => {
    const call = makeCheckCall({ name: "my-route", content: "http:\n  routers: {}" });
    const { err, response } = await callHandler(traefikRouteResource.check, call);

    expect(err).toBeNull();
    expect(response.getFailuresList().length).toBe(0);
  });

  it("accepts name with hyphens, underscores, and digits", async () => {
    const call = makeCheckCall({ name: "route-1_test", content: "key: value" });
    const { err, response } = await callHandler(traefikRouteResource.check, call);

    expect(err).toBeNull();
    expect(response.getFailuresList().length).toBe(0);
  });
});

describe("TraefikRoute diff", () => {
  it("returns DIFF_NONE when no fields changed", async () => {
    const props = { name: "my-route", content: "http:\n  routers: {}" };
    const call = makeDiffCall(props, props);
    const { response } = await callHandler(traefikRouteResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
    expect(response.getDiffsList().length).toBe(0);
  });

  it("detects name change as UPDATE_REPLACE", async () => {
    const olds = { name: "old-route", content: "http:\n  routers: {}" };
    const news = { name: "new-route", content: "http:\n  routers: {}" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(traefikRouteResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getReplacesList()).toContain("name");
    const detailedDiff = response.getDetaileddiffMap();
    const nameDiff = detailedDiff.get("name");
    expect(nameDiff).toBeDefined();
    expect(nameDiff.getKind()).toBe(providerProto.PropertyDiff.Kind.UPDATE_REPLACE);
  });

  it("detects content change as UPDATE", async () => {
    const olds = { name: "my-route", content: "http:\n  routers: {}" };
    const news = { name: "my-route", content: "http:\n  services: {}" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(traefikRouteResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("content");
    const detailedDiff = response.getDetaileddiffMap();
    const contentDiff = detailedDiff.get("content");
    expect(contentDiff).toBeDefined();
    expect(contentDiff.getKind()).toBe(providerProto.PropertyDiff.Kind.UPDATE);
  });

  it("detects both name and content changed", async () => {
    const olds = { name: "old", content: "old: config" };
    const news = { name: "new", content: "new: config" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(traefikRouteResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("name");
    expect(response.getDiffsList()).toContain("content");
    expect(response.getReplacesList()).toContain("name");
  });
});

describe("TraefikStaticConfig check", () => {
  it("returns failure when content is missing", async () => {
    const call = makeCheckCall({});
    const { err, response } = await callHandler(traefikStaticConfigResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("content");
  });

  it("returns failure when content is invalid YAML", async () => {
    const call = makeCheckCall({ content: "key: [unterminated" });
    const { err, response } = await callHandler(traefikStaticConfigResource.check, call);

    expect(err).toBeNull();
    const failures = response.getFailuresList();
    expect(failures.length).toBe(1);
    expect(failures[0].getProperty()).toBe("content");
    expect(failures[0].getReason()).toContain("Invalid YAML");
  });

  it("returns no failures with valid content", async () => {
    const call = makeCheckCall({ content: "entryPoints:\n  web:\n    address: ':80'" });
    const { err, response } = await callHandler(traefikStaticConfigResource.check, call);

    expect(err).toBeNull();
    expect(response.getFailuresList().length).toBe(0);
  });
});

describe("TraefikStaticConfig diff", () => {
  it("returns DIFF_NONE when content unchanged", async () => {
    const props = { content: "entryPoints:\n  web:\n    address: ':80'" };
    const call = makeDiffCall(props, props);
    const { response } = await callHandler(traefikStaticConfigResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_NONE);
    expect(response.getDiffsList().length).toBe(0);
  });

  it("returns DIFF_SOME when content changed", async () => {
    const olds = { content: "entryPoints:\n  web:\n    address: ':80'" };
    const news = { content: "entryPoints:\n  web:\n    address: ':8080'" };
    const call = makeDiffCall(olds, news);
    const { response } = await callHandler(traefikStaticConfigResource.diff, call);

    expect(response.getChanges()).toBe(providerProto.DiffResponse.DiffChanges.DIFF_SOME);
    expect(response.getDiffsList()).toContain("content");
    const detailedDiff = response.getDetaileddiffMap();
    const contentDiff = detailedDiff.get("content");
    expect(contentDiff).toBeDefined();
    expect(contentDiff.getKind()).toBe(providerProto.PropertyDiff.Kind.UPDATE);
  });
});
