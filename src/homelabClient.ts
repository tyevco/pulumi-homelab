import fetch from "cross-fetch";

export interface HomelabClientConfig {
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

export interface StackInfo {
  name: string;
  status: string;
  composeYaml: string;
  envFile: string;
  composeOverride: string;
  autostart: boolean;
  displayName: string;
  containers: ContainerInfo[];
}

let currentConfig: HomelabClientConfig | null = null;

export function configureClient(config: HomelabClientConfig): void {
  currentConfig = config;
}

export function ensureConfigured(): HomelabClientConfig {
  if (!currentConfig) {
    throw new Error(
      "Homelab provider not configured. Set homelab:url and homelab:apiKey via pulumi config."
    );
  }
  return currentConfig;
}

// Traefik interfaces
export interface TraefikStaticInfo {
  content: string;
  lastModified: string;
}

export interface TraefikRouteInfo {
  name: string;
  content: string;
  lastModified: string;
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
    throw new Error(`Homelab API ${method} ${path} failed (${res.status}): ${message}`);
  }

  return res.json();
}

export async function listStacks(): Promise<StackInfo[]> {
  return request<StackInfo[]>("GET", "/api/stacks");
}

export async function getStack(name: string): Promise<StackInfo> {
  return request<StackInfo>("GET", `/api/stacks/${encodeURIComponent(name)}`);
}

export async function createStack(
  name: string,
  composeYaml: string,
  envFile?: string,
  start?: boolean,
  composeOverride?: string,
  autostart?: boolean,
  displayName?: string,
): Promise<StackInfo> {
  return request<StackInfo>("POST", "/api/stacks", {
    name,
    composeYaml,
    envFile: envFile || "",
    start: start !== false,
    composeOverride: composeOverride || "",
    autostart: autostart || false,
    displayName: displayName || "",
  });
}

export async function updateStack(
  name: string,
  composeYaml: string,
  envFile?: string,
  composeOverride?: string,
  autostart?: boolean,
  displayName?: string,
): Promise<StackInfo> {
  return request<StackInfo>("PUT", `/api/stacks/${encodeURIComponent(name)}`, {
    composeYaml,
    envFile: envFile || "",
    composeOverride: composeOverride !== undefined ? composeOverride : undefined,
    autostart: autostart !== undefined ? autostart : undefined,
    displayName: displayName !== undefined ? displayName : undefined,
  });
}

export async function deleteStack(name: string): Promise<void> {
  await request<void>("DELETE", `/api/stacks/${encodeURIComponent(name)}`);
}

export async function startStack(name: string): Promise<StackInfo> {
  return request<StackInfo>("POST", `/api/stacks/${encodeURIComponent(name)}/start`);
}

export async function stopStack(name: string): Promise<StackInfo> {
  return request<StackInfo>("POST", `/api/stacks/${encodeURIComponent(name)}/stop`);
}

// Traefik API functions
export async function getTraefikStatic(): Promise<TraefikStaticInfo> {
  return request<TraefikStaticInfo>("GET", "/api/traefik/static");
}

export async function putTraefikStatic(content: string): Promise<TraefikStaticInfo> {
  return request<TraefikStaticInfo>("PUT", "/api/traefik/static", { content });
}

export async function listTraefikRoutes(): Promise<TraefikRouteInfo[]> {
  return request<TraefikRouteInfo[]>("GET", "/api/traefik/routes");
}

export async function getTraefikRoute(name: string): Promise<TraefikRouteInfo> {
  return request<TraefikRouteInfo>("GET", `/api/traefik/routes/${encodeURIComponent(name)}`);
}

export async function putTraefikRoute(name: string, content: string): Promise<TraefikRouteInfo> {
  return request<TraefikRouteInfo>("PUT", `/api/traefik/routes/${encodeURIComponent(name)}`, { content });
}

export async function deleteTraefikRoute(name: string): Promise<void> {
  await request<void>("DELETE", `/api/traefik/routes/${encodeURIComponent(name)}`);
}

// LXC interfaces
export interface LxcContainerInfo {
  name: string;
  status: number;
  type: string;
  ip: string;
  autostart: boolean;
  pid: number;
  memory: string;
  config: string;
}

// LXC API functions
export async function listLxcContainers(): Promise<LxcContainerInfo[]> {
  return request<LxcContainerInfo[]>("GET", "/api/lxc");
}

export async function getLxcContainer(name: string): Promise<LxcContainerInfo> {
  return request<LxcContainerInfo>("GET", `/api/lxc/${encodeURIComponent(name)}`);
}

export async function createLxcContainer(
  name: string,
  dist: string,
  release: string,
  arch: string,
): Promise<LxcContainerInfo> {
  return request<LxcContainerInfo>("POST", "/api/lxc", { name, dist, release, arch });
}

export async function deleteLxcContainer(name: string): Promise<void> {
  await request<void>("DELETE", `/api/lxc/${encodeURIComponent(name)}`);
}

export async function saveLxcConfig(name: string, config: string): Promise<LxcContainerInfo> {
  return request<LxcContainerInfo>("PUT", `/api/lxc/${encodeURIComponent(name)}/config`, { config });
}

export async function startLxcContainer(name: string): Promise<LxcContainerInfo> {
  return request<LxcContainerInfo>("POST", `/api/lxc/${encodeURIComponent(name)}/start`);
}

export async function stopLxcContainer(name: string): Promise<LxcContainerInfo> {
  return request<LxcContainerInfo>("POST", `/api/lxc/${encodeURIComponent(name)}/stop`);
}
