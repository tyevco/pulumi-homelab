import fetch from "cross-fetch";

export interface DockgeClientConfig {
  url: string;
  apiKey: string;
}

export interface ContainerInfo {
  name: string;
  service: string;
  image: string;
  state: string;
  status: string;
  health: string;
  ports: string[];
}

export interface DockgeStackInfo {
  name: string;
  status: string;
  composeYaml: string;
  envFile: string;
  containers: ContainerInfo[];
}

let currentConfig: DockgeClientConfig | null = null;

export function configureDockgeClient(config: DockgeClientConfig): void {
  currentConfig = config;
}

export function ensureConfigured(): DockgeClientConfig {
  if (!currentConfig) {
    throw new Error(
      "Dockge provider not configured. Set dockge:url and dockge:apiKey via pulumi config."
    );
  }
  return currentConfig;
}

function baseUrl(): string {
  const config = ensureConfigured();
  return config.url.replace(/\/+$/, "");
}

function headers(): Record<string, string> {
  const config = ensureConfigured();
  return {
    "Authorization": `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as any;
  }

  if (!res.ok) {
    const text = await res.text();
    let message: string;
    try {
      const json = JSON.parse(text);
      message = json.error || text;
    } catch {
      message = text;
    }
    throw new Error(`Dockge API ${method} ${path} failed (${res.status}): ${message}`);
  }

  return res.json();
}

export async function listStacks(): Promise<DockgeStackInfo[]> {
  return request<DockgeStackInfo[]>("GET", "/api/stacks");
}

export async function getStack(name: string): Promise<DockgeStackInfo> {
  return request<DockgeStackInfo>("GET", `/api/stacks/${encodeURIComponent(name)}`);
}

export async function createStack(
  name: string,
  composeYaml: string,
  envFile?: string,
  start?: boolean
): Promise<DockgeStackInfo> {
  return request<DockgeStackInfo>("POST", "/api/stacks", {
    name,
    composeYaml,
    envFile: envFile || "",
    start: start !== false,
  });
}

export async function updateStack(
  name: string,
  composeYaml: string,
  envFile?: string
): Promise<DockgeStackInfo> {
  return request<DockgeStackInfo>("PUT", `/api/stacks/${encodeURIComponent(name)}`, {
    composeYaml,
    envFile: envFile || "",
  });
}

export async function deleteStack(name: string): Promise<void> {
  await request<void>("DELETE", `/api/stacks/${encodeURIComponent(name)}`);
}

export async function startStack(name: string): Promise<DockgeStackInfo> {
  return request<DockgeStackInfo>("POST", `/api/stacks/${encodeURIComponent(name)}/start`);
}

export async function stopStack(name: string): Promise<DockgeStackInfo> {
  return request<DockgeStackInfo>("POST", `/api/stacks/${encodeURIComponent(name)}/stop`);
}
