import fetch from "cross-fetch";

jest.mock("cross-fetch", () => {
  const mockFetch = jest.fn();
  return {
    __esModule: true,
    default: mockFetch,
  };
});

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

function mockResponse(body: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

// We need fresh modules for singleton tests, so import dynamically in those tests.
// For translation function tests, import normally.
import {
  ruleToApi,
  ruleFromApi,
  aliasToApi,
  aliasFromApi,
  hostOverrideToApi,
  hostOverrideFromApi,
  forwardToApi,
  forwardFromApi,
  aclToApi,
  aclFromApi,
  dnsblToApi,
  dnsblFromApi,
} from "../src/opnsenseClient";

describe("ruleToApi", () => {
  it("maps camelCase fields to snake_case", () => {
    const result = ruleToApi({
      sourceNet: "10.0.0.0/24",
      sourcePort: "443",
      destinationNet: "192.168.1.0/24",
      destinationPort: "8080",
    });
    expect(result).toEqual({
      source_net: "10.0.0.0/24",
      source_port: "443",
      destination_net: "192.168.1.0/24",
      destination_port: "8080",
    });
  });

  it("converts booleans to '1' and '0'", () => {
    const result = ruleToApi({ log: true, quick: false, disabled: true });
    expect(result).toEqual({ log: "1", quick: "0", disabled: "1" });
  });

  it("converts false booleans to '0'", () => {
    const result = ruleToApi({ log: false, quick: false, disabled: false });
    expect(result).toEqual({ log: "0", quick: "0", disabled: "0" });
  });

  it("converts sequence number to string", () => {
    const result = ruleToApi({ sequence: 10 });
    expect(result).toEqual({ sequence: "10" });
  });

  it("omits undefined fields", () => {
    const result = ruleToApi({ action: "pass" });
    expect(result).toEqual({ action: "pass" });
    expect(Object.keys(result)).toEqual(["action"]);
  });

  it("passes through string fields directly", () => {
    const result = ruleToApi({
      description: "Allow HTTPS",
      interface: "lan",
      ipprotocol: "inet",
      protocol: "TCP",
      action: "pass",
      direction: "in",
    });
    expect(result).toEqual({
      description: "Allow HTTPS",
      interface: "lan",
      ipprotocol: "inet",
      protocol: "TCP",
      action: "pass",
      direction: "in",
    });
  });
});

describe("ruleFromApi", () => {
  it("maps snake_case to camelCase", () => {
    const result = ruleFromApi({
      source_net: "10.0.0.0/24",
      source_port: "443",
      destination_net: "192.168.1.0/24",
      destination_port: "8080",
    });
    expect(result).toEqual({
      sourceNet: "10.0.0.0/24",
      sourcePort: "443",
      destinationNet: "192.168.1.0/24",
      destinationPort: "8080",
    });
  });

  it("converts '1' to true and '0' to false", () => {
    const result = ruleFromApi({ log: "1", quick: "0", disabled: "1" });
    expect(result).toEqual({ log: true, quick: false, disabled: true });
  });

  it("converts string sequence to number", () => {
    const result = ruleFromApi({ sequence: "15" });
    expect(result).toEqual({ sequence: 15 });
  });

  it("round-trips with ruleToApi", () => {
    const original = {
      description: "Test",
      interface: "wan",
      ipprotocol: "inet",
      protocol: "TCP",
      sourceNet: "any",
      destinationPort: "443",
      action: "pass",
      direction: "in",
      log: true,
      quick: true,
      disabled: false,
      sequence: 5,
    };
    const api = ruleToApi(original);
    const back = ruleFromApi(api);
    expect(back).toEqual(original);
  });

  it("omits undefined API fields", () => {
    const result = ruleFromApi({ action: "block" });
    expect(result).toEqual({ action: "block" });
    expect(Object.keys(result)).toEqual(["action"]);
  });
});

describe("aliasToApi", () => {
  it("maps alias fields correctly", () => {
    const result = aliasToApi({
      name: "blocklist",
      type: "host",
      content: "1.2.3.4\n5.6.7.8",
      description: "Bad hosts",
    });
    expect(result).toEqual({
      name: "blocklist",
      type: "host",
      content: "1.2.3.4\n5.6.7.8",
      description: "Bad hosts",
    });
  });

  it("converts enabled boolean to '1'/'0'", () => {
    expect(aliasToApi({ enabled: true }).enabled).toBe("1");
    expect(aliasToApi({ enabled: false }).enabled).toBe("0");
  });

  it("omits undefined fields", () => {
    const result = aliasToApi({ name: "test" });
    expect(result).toEqual({ name: "test" });
  });
});

describe("aliasFromApi", () => {
  it("maps alias fields correctly", () => {
    const result = aliasFromApi({
      name: "blocklist",
      type: "host",
      content: "1.2.3.4",
      description: "Bad hosts",
    });
    expect(result).toEqual({
      name: "blocklist",
      type: "host",
      content: "1.2.3.4",
      description: "Bad hosts",
    });
  });

  it("converts enabled '1'/'0' to boolean", () => {
    expect(aliasFromApi({ enabled: "1" }).enabled).toBe(true);
    expect(aliasFromApi({ enabled: "0" }).enabled).toBe(false);
  });

  it("round-trips with aliasToApi", () => {
    const original = {
      name: "myalias",
      type: "network",
      content: "10.0.0.0/8",
      description: "Private nets",
      enabled: true,
    };
    const api = aliasToApi(original);
    const back = aliasFromApi(api);
    expect(back).toEqual(original);
  });
});

describe("configureOpnsenseClient / ensureOpnsenseConfigured", () => {
  it("throws when not configured", () => {
    jest.isolateModules(() => {
      const { ensureOpnsenseConfigured } = require("../src/opnsenseClient");
      expect(() => ensureOpnsenseConfigured()).toThrow("OPNsense provider not configured");
    });
  });

  it("returns config after configuring", () => {
    jest.isolateModules(() => {
      const { configureOpnsenseClient, ensureOpnsenseConfigured } = require("../src/opnsenseClient");
      const config = { url: "https://fw.local", apiKey: "key", apiSecret: "secret" };
      configureOpnsenseClient(config);
      expect(ensureOpnsenseConfigured()).toEqual(config);
    });
  });

  it("stores and returns config with insecure flag", () => {
    jest.isolateModules(() => {
      const { configureOpnsenseClient, ensureOpnsenseConfigured } = require("../src/opnsenseClient");
      const config = { url: "https://fw.local", apiKey: "k", apiSecret: "s", insecure: true };
      configureOpnsenseClient(config);
      const result = ensureOpnsenseConfigured();
      expect(result.insecure).toBe(true);
    });
  });
});

describe("withFirewallApply", () => {
  beforeEach(() => {
    jest.isolateModules(() => {});
    mockedFetch.mockReset();
  });

  function setupConfiguredModule() {
    // We need to get a fresh module with fetch already mocked
    const client = require("../src/opnsenseClient");
    client.configureOpnsenseClient({
      url: "https://fw.local",
      apiKey: "testkey",
      apiSecret: "testsecret",
    });
    return client;
  }

  it("calls savepoint, fn, apply, cancelRollback in order", async () => {
    const client = setupConfiguredModule();
    const callOrder: string[] = [];

    mockedFetch
      .mockResolvedValueOnce(mockResponse({ revision: "rev-123" })) // savepoint
      .mockResolvedValueOnce(mockResponse({ uuid: "rule-1" })) // fn (addRule)
      .mockResolvedValueOnce(mockResponse({ status: "ok" })) // apply
      .mockResolvedValueOnce(mockResponse({})); // cancelRollback

    const result = await client.withFirewallApply(async () => {
      callOrder.push("fn");
      return "result-value";
    });

    expect(result).toBe("result-value");
    expect(mockedFetch).toHaveBeenCalledTimes(3); // savepoint + apply + cancelRollback (fn doesn't call fetch here)
    // Verify savepoint was called first
    const savepointCall = mockedFetch.mock.calls[0];
    expect(savepointCall[0]).toContain("/api/firewall/filter/savepoint");
  });

  it("propagates fn error without calling apply", async () => {
    const client = setupConfiguredModule();

    mockedFetch.mockResolvedValueOnce(mockResponse({ revision: "rev-456" })); // savepoint

    await expect(
      client.withFirewallApply(async () => {
        throw new Error("mutation failed");
      }),
    ).rejects.toThrow("mutation failed");

    // Only savepoint was called, not apply
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});

describe("CRUD functions", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  function setupConfiguredModule() {
    const client = require("../src/opnsenseClient");
    client.configureOpnsenseClient({
      url: "https://fw.local",
      apiKey: "mykey",
      apiSecret: "mysecret",
    });
    return client;
  }

  describe("addFirewallRule", () => {
    it("sends POST with correct body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ uuid: "new-uuid" }));

      const result = await client.addFirewallRule({ action: "pass", interface: "lan" });

      expect(result).toEqual({ uuid: "new-uuid" });
      expect(mockedFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/firewall/filter/addRule");
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body)).toEqual({ rule: { action: "pass", interface: "lan" } });
    });

    it("includes auth header", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ uuid: "u1" }));

      await client.addFirewallRule({});

      const [, opts] = mockedFetch.mock.calls[0] as [string, any];
      const expectedAuth = `Basic ${Buffer.from("mykey:mysecret").toString("base64")}`;
      expect(opts.headers["Authorization"]).toBe(expectedAuth);
    });
  });

  describe("getFirewallRule", () => {
    it("sends GET to correct URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ rule: { action: "block" } }));

      const result = await client.getFirewallRule("uuid-123");

      expect(result).toEqual({ rule: { action: "block" } });
      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/firewall/filter/getRule/uuid-123");
      expect(opts.method).toBe("GET");
    });
  });

  describe("setFirewallRule", () => {
    it("sends POST with rule body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.setFirewallRule("uuid-456", { action: "reject" });

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/firewall/filter/setRule/uuid-456");
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body)).toEqual({ rule: { action: "reject" } });
    });
  });

  describe("delFirewallRule", () => {
    it("sends POST to delete URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.delFirewallRule("uuid-789");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/firewall/filter/delRule/uuid-789");
      expect(opts.method).toBe("POST");
    });
  });

  describe("addAlias", () => {
    it("sends POST with alias body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ uuid: "alias-1" }));

      const result = await client.addAlias({ name: "blocklist", type: "host" });

      expect(result).toEqual({ uuid: "alias-1" });
      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/firewall/alias/addItem");
      expect(JSON.parse(opts.body)).toEqual({ alias: { name: "blocklist", type: "host" } });
    });
  });

  describe("getAlias", () => {
    it("sends GET to correct URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ alias: { name: "test" } }));

      const result = await client.getAlias("alias-uuid");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/firewall/alias/getItem/alias-uuid");
      expect(opts.method).toBe("GET");
    });
  });

  describe("setAlias", () => {
    it("sends POST with alias body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.setAlias("alias-2", { name: "updated" });

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/firewall/alias/setItem/alias-2");
      expect(JSON.parse(opts.body)).toEqual({ alias: { name: "updated" } });
    });
  });

  describe("delAlias", () => {
    it("sends POST to delete URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.delAlias("alias-3");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/firewall/alias/delItem/alias-3");
      expect(opts.method).toBe("POST");
    });
  });

  describe("error handling", () => {
    it("throws on non-2xx response", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ message: "Forbidden" }, 403));

      await expect(client.addFirewallRule({})).rejects.toThrow("OPNsense API POST /api/firewall/filter/addRule failed (403): Forbidden");
    });

    it("handles non-JSON error body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error("not json"); },
        text: async () => "Internal Server Error",
      } as unknown as Response);

      await expect(client.getFirewallRule("x")).rejects.toThrow("Internal Server Error");
    });
  });

  describe("addHostOverride", () => {
    it("sends POST with correct body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ uuid: "ho-1" }));

      const result = await client.addHostOverride({ hostname: "test", domain: "example.com" });

      expect(result).toEqual({ uuid: "ho-1" });
      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/addHostOverride");
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body)).toEqual({ hostoverride: { hostname: "test", domain: "example.com" } });
    });
  });

  describe("getHostOverride", () => {
    it("sends GET to correct URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ hostoverride: { hostname: "test" } }));

      await client.getHostOverride("ho-uuid");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/getHostOverride/ho-uuid");
      expect(opts.method).toBe("GET");
    });
  });

  describe("setHostOverride", () => {
    it("sends POST with body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.setHostOverride("ho-2", { hostname: "updated" });

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/setHostOverride/ho-2");
      expect(JSON.parse(opts.body)).toEqual({ hostoverride: { hostname: "updated" } });
    });
  });

  describe("delHostOverride", () => {
    it("sends POST to delete URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.delHostOverride("ho-3");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/delHostOverride/ho-3");
      expect(opts.method).toBe("POST");
    });
  });

  describe("addForward", () => {
    it("sends POST with correct body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ uuid: "fwd-1" }));

      const result = await client.addForward({ server: "8.8.8.8" });

      expect(result).toEqual({ uuid: "fwd-1" });
      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/addForward");
      expect(JSON.parse(opts.body)).toEqual({ forward: { server: "8.8.8.8" } });
    });
  });

  describe("getForward", () => {
    it("sends GET to correct URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ forward: { server: "8.8.8.8" } }));

      await client.getForward("fwd-uuid");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/getForward/fwd-uuid");
      expect(opts.method).toBe("GET");
    });
  });

  describe("setForward", () => {
    it("sends POST with body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.setForward("fwd-2", { server: "1.1.1.1" });

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/setForward/fwd-2");
      expect(JSON.parse(opts.body)).toEqual({ forward: { server: "1.1.1.1" } });
    });
  });

  describe("delForward", () => {
    it("sends POST to delete URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.delForward("fwd-3");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/delForward/fwd-3");
      expect(opts.method).toBe("POST");
    });
  });

  describe("addAcl", () => {
    it("sends POST with correct body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ uuid: "acl-1" }));

      const result = await client.addAcl({ name: "lan", networks: "10.0.0.0/8" });

      expect(result).toEqual({ uuid: "acl-1" });
      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/addAcl");
      expect(JSON.parse(opts.body)).toEqual({ acl: { name: "lan", networks: "10.0.0.0/8" } });
    });
  });

  describe("getAcl", () => {
    it("sends GET to correct URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ acl: { name: "lan" } }));

      await client.getAcl("acl-uuid");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/getAcl/acl-uuid");
      expect(opts.method).toBe("GET");
    });
  });

  describe("setAcl", () => {
    it("sends POST with body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.setAcl("acl-2", { name: "updated" });

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/setAcl/acl-2");
      expect(JSON.parse(opts.body)).toEqual({ acl: { name: "updated" } });
    });
  });

  describe("delAcl", () => {
    it("sends POST to delete URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.delAcl("acl-3");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/delAcl/acl-3");
      expect(opts.method).toBe("POST");
    });
  });

  describe("addDnsbl", () => {
    it("sends POST with correct body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ uuid: "dnsbl-1" }));

      const result = await client.addDnsbl({ description: "test blocklist" });

      expect(result).toEqual({ uuid: "dnsbl-1" });
      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/addDnsbl");
      expect(JSON.parse(opts.body)).toEqual({ dnsbl: { description: "test blocklist" } });
    });
  });

  describe("getDnsbl", () => {
    it("sends GET to correct URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ dnsbl: { description: "test" } }));

      await client.getDnsbl("dnsbl-uuid");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/getDnsbl/dnsbl-uuid");
      expect(opts.method).toBe("GET");
    });
  });

  describe("setDnsbl", () => {
    it("sends POST with body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.setDnsbl("dnsbl-2", { description: "updated" });

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/setDnsbl/dnsbl-2");
      expect(JSON.parse(opts.body)).toEqual({ dnsbl: { description: "updated" } });
    });
  });

  describe("delDnsbl", () => {
    it("sends POST to delete URL", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({}));

      await client.delDnsbl("dnsbl-3");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://fw.local/api/unbound/settings/delDnsbl/dnsbl-3");
      expect(opts.method).toBe("POST");
    });
  });
});

describe("withUnboundReconfigure", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  function setupConfiguredModule() {
    const client = require("../src/opnsenseClient");
    client.configureOpnsenseClient({
      url: "https://fw.local",
      apiKey: "testkey",
      apiSecret: "testsecret",
    });
    return client;
  }

  it("calls fn then reconfigure in order", async () => {
    const client = setupConfiguredModule();

    mockedFetch.mockResolvedValueOnce(mockResponse({})); // reconfigure

    const result = await client.withUnboundReconfigure(async () => {
      return "result-value";
    });

    expect(result).toBe("result-value");
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const [url] = mockedFetch.mock.calls[0] as [string, any];
    expect(url).toContain("/api/unbound/service/reconfigure");
  });

  it("propagates fn error without calling reconfigure", async () => {
    const client = setupConfiguredModule();

    await expect(
      client.withUnboundReconfigure(async () => {
        throw new Error("mutation failed");
      }),
    ).rejects.toThrow("mutation failed");

    expect(mockedFetch).toHaveBeenCalledTimes(0);
  });
});

describe("hostOverrideToApi", () => {
  it("converts booleans to '1'/'0'", () => {
    const result = hostOverrideToApi({ enabled: true, addptr: false });
    expect(result.enabled).toBe("1");
    expect(result.addptr).toBe("0");
  });

  it("converts numbers to strings", () => {
    const result = hostOverrideToApi({ mxprio: 10, ttl: 300 });
    expect(result.mxprio).toBe("10");
    expect(result.ttl).toBe("300");
  });

  it("passes through string fields", () => {
    const result = hostOverrideToApi({ hostname: "test", domain: "example.com", rr: "A", server: "1.2.3.4" });
    expect(result).toEqual({ hostname: "test", domain: "example.com", rr: "A", server: "1.2.3.4" });
  });

  it("omits undefined fields", () => {
    const result = hostOverrideToApi({ domain: "example.com" });
    expect(result).toEqual({ domain: "example.com" });
  });
});

describe("hostOverrideFromApi", () => {
  it("converts '1'/'0' to booleans", () => {
    const result = hostOverrideFromApi({ enabled: "1", addptr: "0" });
    expect(result.enabled).toBe(true);
    expect(result.addptr).toBe(false);
  });

  it("converts string numbers to integers", () => {
    const result = hostOverrideFromApi({ mxprio: "10", ttl: "300" });
    expect(result.mxprio).toBe(10);
    expect(result.ttl).toBe(300);
  });

  it("round-trips with hostOverrideToApi", () => {
    const original = {
      enabled: true,
      hostname: "myhost",
      domain: "example.com",
      rr: "A",
      server: "1.2.3.4",
      mxprio: 10,
      ttl: 300,
      addptr: true,
      description: "Test",
    };
    const api = hostOverrideToApi(original);
    const back = hostOverrideFromApi(api);
    expect(back).toEqual(original);
  });
});

describe("forwardToApi", () => {
  it("converts booleans to '1'/'0'", () => {
    const result = forwardToApi({ enabled: true, forwardTcpUpstream: false, forwardFirst: true });
    expect(result.enabled).toBe("1");
    expect(result.forward_tcp_upstream).toBe("0");
    expect(result.forward_first).toBe("1");
  });

  it("converts port to string", () => {
    const result = forwardToApi({ port: 853 });
    expect(result.port).toBe("853");
  });

  it("passes through string fields", () => {
    const result = forwardToApi({ type: "dot", domain: "example.com", server: "1.1.1.1", verify: "cloudflare-dns.com" });
    expect(result).toEqual({ type: "dot", domain: "example.com", server: "1.1.1.1", verify: "cloudflare-dns.com" });
  });

  it("omits undefined fields", () => {
    const result = forwardToApi({ server: "8.8.8.8" });
    expect(result).toEqual({ server: "8.8.8.8" });
  });
});

describe("forwardFromApi", () => {
  it("converts '1'/'0' to booleans", () => {
    const result = forwardFromApi({ enabled: "1", forward_tcp_upstream: "0", forward_first: "1" });
    expect(result.enabled).toBe(true);
    expect(result.forwardTcpUpstream).toBe(false);
    expect(result.forwardFirst).toBe(true);
  });

  it("converts string port to integer", () => {
    const result = forwardFromApi({ port: "853" });
    expect(result.port).toBe(853);
  });

  it("round-trips with forwardToApi", () => {
    const original = {
      enabled: true,
      type: "dot",
      domain: "example.com",
      server: "1.1.1.1",
      port: 853,
      verify: "cloudflare-dns.com",
      forwardTcpUpstream: true,
      forwardFirst: false,
      description: "CloudFlare DoT",
    };
    const api = forwardToApi(original);
    const back = forwardFromApi(api);
    expect(back).toEqual(original);
  });
});

describe("aclToApi", () => {
  it("converts enabled boolean to '1'/'0'", () => {
    expect(aclToApi({ enabled: true }).enabled).toBe("1");
    expect(aclToApi({ enabled: false }).enabled).toBe("0");
  });

  it("passes through string fields", () => {
    const result = aclToApi({ name: "lan", action: "allow", networks: "10.0.0.0/8", description: "LAN" });
    expect(result).toEqual({ name: "lan", action: "allow", networks: "10.0.0.0/8", description: "LAN" });
  });

  it("omits undefined fields", () => {
    const result = aclToApi({ name: "test" });
    expect(result).toEqual({ name: "test" });
  });
});

describe("aclFromApi", () => {
  it("converts enabled '1'/'0' to boolean", () => {
    expect(aclFromApi({ enabled: "1" }).enabled).toBe(true);
    expect(aclFromApi({ enabled: "0" }).enabled).toBe(false);
  });

  it("round-trips with aclToApi", () => {
    const original = {
      enabled: true,
      name: "myacl",
      action: "allow",
      networks: "10.0.0.0/8",
      description: "LAN access",
    };
    const api = aclToApi(original);
    const back = aclFromApi(api);
    expect(back).toEqual(original);
  });
});

describe("dnsblToApi", () => {
  it("converts booleans to '1'/'0'", () => {
    const result = dnsblToApi({ enabled: true, nxdomain: false });
    expect(result.enabled).toBe("1");
    expect(result.nxdomain).toBe("0");
  });

  it("converts cacheTtl to string", () => {
    const result = dnsblToApi({ cacheTtl: 72000 });
    expect(result.cache_ttl).toBe("72000");
  });

  it("maps camelCase to snake_case", () => {
    const result = dnsblToApi({ sourceNets: "10.0.0.0/8" });
    expect(result.source_nets).toBe("10.0.0.0/8");
  });

  it("omits undefined fields", () => {
    const result = dnsblToApi({ description: "test" });
    expect(result).toEqual({ description: "test" });
  });
});

describe("dnsblFromApi", () => {
  it("converts '1'/'0' to booleans", () => {
    const result = dnsblFromApi({ enabled: "1", nxdomain: "0" });
    expect(result.enabled).toBe(true);
    expect(result.nxdomain).toBe(false);
  });

  it("converts cache_ttl to integer", () => {
    const result = dnsblFromApi({ cache_ttl: "72000" });
    expect(result.cacheTtl).toBe(72000);
  });

  it("maps snake_case to camelCase", () => {
    const result = dnsblFromApi({ source_nets: "10.0.0.0/8" });
    expect(result.sourceNets).toBe("10.0.0.0/8");
  });

  it("round-trips with dnsblToApi", () => {
    const original = {
      enabled: true,
      type: "dnsbl",
      lists: "list1,list2",
      allowlists: "good.com",
      blocklists: "bad.com",
      wildcards: "*.ads.com",
      sourceNets: "10.0.0.0/8",
      address: "127.0.0.1",
      nxdomain: true,
      cacheTtl: 72000,
      description: "My blocklist",
    };
    const api = dnsblToApi(original);
    const back = dnsblFromApi(api);
    expect(back).toEqual(original);
  });
});

describe("translation edge cases", () => {
  it("ruleToApi returns empty object for empty input", () => {
    expect(ruleToApi({})).toEqual({});
  });

  it("ruleFromApi returns empty object for empty input", () => {
    expect(ruleFromApi({})).toEqual({});
  });

  it("ruleToApi converts undefined boolean to '0' via fromBool", () => {
    // fromBool(undefined) returns "0"
    // But ruleToApi only sets fields when !== undefined, so undefined booleans are omitted
    const result = ruleToApi({ log: undefined });
    expect(result.log).toBeUndefined();
  });

  it("ruleToApi handles sequence 0 correctly", () => {
    const result = ruleToApi({ sequence: 0 });
    expect(result.sequence).toBe("0");
  });

  it("ruleFromApi handles sequence '0' correctly", () => {
    const result = ruleFromApi({ sequence: "0" });
    expect(result.sequence).toBe(0);
  });

  it("hostOverrideToApi handles mxprio 0 correctly", () => {
    const result = hostOverrideToApi({ mxprio: 0, ttl: 0 });
    expect(result.mxprio).toBe("0");
    expect(result.ttl).toBe("0");
  });

  it("hostOverrideFromApi handles '0' for numeric fields", () => {
    const result = hostOverrideFromApi({ mxprio: "0", ttl: "0" });
    expect(result.mxprio).toBe(0);
    expect(result.ttl).toBe(0);
  });

  it("forwardToApi handles port 0 correctly", () => {
    const result = forwardToApi({ port: 0 });
    expect(result.port).toBe("0");
  });

  it("dnsblToApi handles cacheTtl 0 correctly", () => {
    const result = dnsblToApi({ cacheTtl: 0 });
    expect(result.cache_ttl).toBe("0");
  });

  it("dnsblFromApi handles cache_ttl '0' correctly", () => {
    const result = dnsblFromApi({ cache_ttl: "0" });
    expect(result.cacheTtl).toBe(0);
  });

  it("aliasToApi returns empty object for empty input", () => {
    expect(aliasToApi({})).toEqual({});
  });

  it("aliasFromApi returns empty object for empty input", () => {
    expect(aliasFromApi({})).toEqual({});
  });
});

describe("request error handling edge cases", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  function setupConfiguredModule() {
    const client = require("../src/opnsenseClient");
    client.configureOpnsenseClient({
      url: "https://fw.local/",
      apiKey: "mykey",
      apiSecret: "mysecret",
    });
    return client;
  }

  it("strips trailing slashes from base URL", async () => {
    const client = setupConfiguredModule();
    mockedFetch.mockResolvedValueOnce(mockResponse({ uuid: "test" }));

    await client.addFirewallRule({ action: "pass" });

    const [url] = mockedFetch.mock.calls[0] as [string, any];
    expect(url).toBe("https://fw.local/api/firewall/filter/addRule");
    expect(url).not.toContain("//api");
  });

  it("handles 204 response as undefined", async () => {
    const client = setupConfiguredModule();
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => { throw new Error("no body"); },
      text: async () => "",
    } as unknown as Response);

    await client.delFirewallRule("uuid-test");
    // Should not throw
  });

  it("parses JSON error response with 'error' field", async () => {
    const client = setupConfiguredModule();
    mockedFetch.mockResolvedValueOnce(mockResponse({ error: "unauthorized" }, 401));

    await expect(client.addFirewallRule({})).rejects.toThrow("unauthorized");
  });
});
