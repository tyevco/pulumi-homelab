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

function mock204() {
  return {
    ok: true,
    status: 204,
    json: async () => { throw new Error("no body"); },
    text: async () => "",
  } as unknown as Response;
}

describe("configureClient / ensureConfigured", () => {
  it("throws when not configured", () => {
    jest.isolateModules(() => {
      const { ensureConfigured } = require("../src/homelabClient");
      expect(() => ensureConfigured()).toThrow("Homelab provider not configured");
    });
  });

  it("returns config after configuring", () => {
    jest.isolateModules(() => {
      const { configureClient, ensureConfigured } = require("../src/homelabClient");
      const config = { url: "https://homelab.local", apiKey: "test-key" };
      configureClient(config);
      expect(ensureConfigured()).toEqual(config);
    });
  });
});

describe("Homelab client API", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  function setupConfiguredModule() {
    const client = require("../src/homelabClient");
    client.configureClient({
      url: "https://homelab.local",
      apiKey: "my-api-key",
    });
    return client;
  }

  it("sends Bearer token in Authorization header", async () => {
    const client = setupConfiguredModule();
    mockedFetch.mockResolvedValueOnce(mockResponse({ name: "test" }));

    await client.getStack("test");

    const [, opts] = mockedFetch.mock.calls[0] as [string, any];
    expect(opts.headers["Authorization"]).toBe("Bearer my-api-key");
  });

  describe("getStack", () => {
    it("sends GET to /api/stacks/:name", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ name: "mystack", status: "running" }));

      const result = await client.getStack("mystack");

      expect(result).toEqual({ name: "mystack", status: "running" });
      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/stacks/mystack");
      expect(opts.method).toBe("GET");
    });
  });

  describe("createStack", () => {
    it("sends POST to /api/stacks with body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ name: "new", status: "running" }));

      await client.createStack("new", "version: '3'", "FOO=bar", true, "", false, "");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/stacks");
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.name).toBe("new");
      expect(body.composeYaml).toBe("version: '3'");
      expect(body.envFile).toBe("FOO=bar");
      expect(body.start).toBe(true);
    });
  });

  describe("updateStack", () => {
    it("sends PUT to /api/stacks/:name", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ name: "web", status: "running" }));

      await client.updateStack("web", "version: '3'", "ENV=val");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/stacks/web");
      expect(opts.method).toBe("PUT");
      const body = JSON.parse(opts.body);
      expect(body.composeYaml).toBe("version: '3'");
      expect(body.envFile).toBe("ENV=val");
    });
  });

  describe("deleteStack", () => {
    it("sends DELETE to /api/stacks/:name", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mock204());

      await client.deleteStack("old");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/stacks/old");
      expect(opts.method).toBe("DELETE");
    });
  });

  describe("startStack", () => {
    it("sends POST to /api/stacks/:name/start", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ name: "web", status: "running" }));

      await client.startStack("web");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/stacks/web/start");
      expect(opts.method).toBe("POST");
    });
  });

  describe("stopStack", () => {
    it("sends POST to /api/stacks/:name/stop", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ name: "web", status: "stopped" }));

      await client.stopStack("web");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/stacks/web/stop");
      expect(opts.method).toBe("POST");
    });
  });

  describe("getTraefikStatic", () => {
    it("sends GET to /api/traefik/static", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ content: "yaml", lastModified: "now" }));

      const result = await client.getTraefikStatic();

      expect(result).toEqual({ content: "yaml", lastModified: "now" });
      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/traefik/static");
      expect(opts.method).toBe("GET");
    });
  });

  describe("putTraefikStatic", () => {
    it("sends PUT to /api/traefik/static with content", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ content: "new-yaml", lastModified: "later" }));

      await client.putTraefikStatic("new-yaml");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/traefik/static");
      expect(opts.method).toBe("PUT");
      expect(JSON.parse(opts.body)).toEqual({ content: "new-yaml" });
    });
  });

  describe("getTraefikRoute", () => {
    it("sends GET to /api/traefik/routes/:name", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ name: "myroute", content: "yaml" }));

      const result = await client.getTraefikRoute("myroute");

      expect(result).toEqual({ name: "myroute", content: "yaml" });
      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/traefik/routes/myroute");
      expect(opts.method).toBe("GET");
    });
  });

  describe("putTraefikRoute", () => {
    it("sends PUT to /api/traefik/routes/:name with content", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ name: "rt", content: "cfg" }));

      await client.putTraefikRoute("rt", "cfg");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/traefik/routes/rt");
      expect(opts.method).toBe("PUT");
      expect(JSON.parse(opts.body)).toEqual({ content: "cfg" });
    });
  });

  describe("deleteTraefikRoute", () => {
    it("sends DELETE to /api/traefik/routes/:name", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mock204());

      await client.deleteTraefikRoute("old-route");

      const [url, opts] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/traefik/routes/old-route");
      expect(opts.method).toBe("DELETE");
    });
  });

  describe("error handling", () => {
    it("throws on non-2xx with JSON error field", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mockResponse({ error: "Stack not found" }, 404));

      await expect(client.getStack("missing")).rejects.toThrow(
        "Homelab API GET /api/stacks/missing failed (404): Stack not found"
      );
    });

    it("throws on non-2xx with non-JSON error body", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error("not json"); },
        text: async () => "Internal Server Error",
      } as unknown as Response);

      await expect(client.getStack("broken")).rejects.toThrow("Internal Server Error");
    });

    it("returns undefined for 204 response", async () => {
      const client = setupConfiguredModule();
      mockedFetch.mockResolvedValueOnce(mock204());

      const result = await client.deleteStack("gone");
      expect(result).toBeUndefined();
    });
  });

  describe("URL trailing slash handling", () => {
    it("strips trailing slashes from base URL", async () => {
      const client = require("../src/homelabClient");
      client.configureClient({
        url: "https://homelab.local///",
        apiKey: "key",
      });
      mockedFetch.mockResolvedValueOnce(mockResponse({ name: "test" }));

      await client.getStack("test");

      const [url] = mockedFetch.mock.calls[0] as [string, any];
      expect(url).toBe("https://homelab.local/api/stacks/test");
    });
  });
});
