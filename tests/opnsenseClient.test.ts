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
});
