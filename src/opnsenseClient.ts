import fetch from "cross-fetch";
import * as https from "https";

export interface OpnsenseClientConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
  insecure?: boolean;
}

let currentConfig: OpnsenseClientConfig | null = null;

export function configureOpnsenseClient(config: OpnsenseClientConfig): void {
  currentConfig = config;
}

export function ensureOpnsenseConfigured(): OpnsenseClientConfig {
  if (!currentConfig) {
    throw new Error(
      "OPNsense provider not configured. Set homelab:opnsenseUrl, homelab:opnsenseApiKey, and homelab:opnsenseApiSecret via pulumi config."
    );
  }
  return currentConfig;
}

function baseUrl(): string {
  const config = ensureOpnsenseConfigured();
  return config.url.replace(/\/+$/, "");
}

function authHeader(): string {
  const config = ensureOpnsenseConfigured();
  const credentials = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
  return `Basic ${credentials}`;
}

function fetchOptions(): Record<string, any> {
  const config = ensureOpnsenseConfigured();
  const opts: Record<string, any> = {};
  if (config.insecure) {
    opts.agent = new https.Agent({ rejectUnauthorized: false });
  }
  return opts;
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": authHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    ...fetchOptions(),
  });

  if (res.status === 204) {
    return undefined as any;
  }

  if (!res.ok) {
    const text = await res.text();
    let message: string;
    try {
      const json = JSON.parse(text);
      message = json.message || json.error || text;
    } catch {
      message = text;
    }
    throw new Error(`OPNsense API ${method} ${path} failed (${res.status}): ${message}`);
  }

  return res.json();
}

// Boolean translation helpers
function toBool(val: string | undefined): boolean {
  return val === "1";
}

function fromBool(val: boolean | undefined): string {
  if (val === undefined) return "0";
  return val ? "1" : "0";
}

// Savepoint/apply workflow
interface SavepointResponse {
  revision: string;
}

interface ApplyResponse {
  status: string;
}

async function createSavepoint(): Promise<string> {
  const res = await request<SavepointResponse>("POST", "/api/firewall/filter/savepoint");
  return res.revision;
}

async function applyChanges(revision: string): Promise<void> {
  await request<ApplyResponse>("POST", `/api/firewall/filter/apply/${revision}`);
}

async function cancelRollback(revision: string): Promise<void> {
  try {
    await request<any>("POST", `/api/firewall/filter/cancelRollback/${revision}`);
  } catch {
    // Best-effort: rollback cancellation failure is non-fatal
  }
}

export async function withFirewallApply<T>(fn: () => Promise<T>): Promise<T> {
  const revision = await createSavepoint();
  try {
    const result = await fn();
    await applyChanges(revision);
    await cancelRollback(revision);
    return result;
  } catch (err) {
    // If apply or the mutation fails, OPNsense will auto-revert after 60s
    throw err;
  }
}

// Firewall rule CRUD
export interface FirewallRuleData {
  description?: string;
  interface?: string;
  ipprotocol?: string;
  protocol?: string;
  source_net?: string;
  source_port?: string;
  destination_net?: string;
  destination_port?: string;
  action?: string;
  direction?: string;
  log?: string;
  quick?: string;
  disabled?: string;
  sequence?: string;
}

export interface FirewallRuleResponse {
  uuid?: string;
  rule?: FirewallRuleData;
}

export async function addFirewallRule(rule: FirewallRuleData): Promise<{ uuid: string }> {
  const res = await request<{ uuid: string }>("POST", "/api/firewall/filter/addRule", { rule });
  return res;
}

export async function getFirewallRule(uuid: string): Promise<{ rule: FirewallRuleData }> {
  const res = await request<{ rule: FirewallRuleData }>("GET", `/api/firewall/filter/getRule/${uuid}`);
  return res;
}

export async function setFirewallRule(uuid: string, rule: FirewallRuleData): Promise<void> {
  await request<any>("POST", `/api/firewall/filter/setRule/${uuid}`, { rule });
}

export async function delFirewallRule(uuid: string): Promise<void> {
  await request<any>("POST", `/api/firewall/filter/delRule/${uuid}`);
}

// Alias CRUD
export interface AliasData {
  name?: string;
  type?: string;
  content?: string;
  description?: string;
  enabled?: string;
}

export async function addAlias(alias: AliasData): Promise<{ uuid: string }> {
  const res = await request<{ uuid: string }>("POST", "/api/firewall/alias/addItem", { alias });
  return res;
}

export async function getAlias(uuid: string): Promise<{ alias: AliasData }> {
  const res = await request<{ alias: AliasData }>("GET", `/api/firewall/alias/getItem/${uuid}`);
  return res;
}

export async function setAlias(uuid: string, alias: AliasData): Promise<void> {
  await request<any>("POST", `/api/firewall/alias/setItem/${uuid}`, { alias });
}

export async function delAlias(uuid: string): Promise<void> {
  await request<any>("POST", `/api/firewall/alias/delItem/${uuid}`);
}

// Property translation: camelCase SDK fields <-> snake_case API fields
export function ruleToApi(inputs: Record<string, any>): FirewallRuleData {
  const rule: FirewallRuleData = {};
  if (inputs.description !== undefined) rule.description = inputs.description;
  if (inputs.interface !== undefined) rule.interface = inputs.interface;
  if (inputs.ipprotocol !== undefined) rule.ipprotocol = inputs.ipprotocol;
  if (inputs.protocol !== undefined) rule.protocol = inputs.protocol;
  if (inputs.sourceNet !== undefined) rule.source_net = inputs.sourceNet;
  if (inputs.sourcePort !== undefined) rule.source_port = inputs.sourcePort;
  if (inputs.destinationNet !== undefined) rule.destination_net = inputs.destinationNet;
  if (inputs.destinationPort !== undefined) rule.destination_port = inputs.destinationPort;
  if (inputs.action !== undefined) rule.action = inputs.action;
  if (inputs.direction !== undefined) rule.direction = inputs.direction;
  if (inputs.log !== undefined) rule.log = fromBool(inputs.log);
  if (inputs.quick !== undefined) rule.quick = fromBool(inputs.quick);
  if (inputs.disabled !== undefined) rule.disabled = fromBool(inputs.disabled);
  if (inputs.sequence !== undefined) rule.sequence = String(inputs.sequence);
  return rule;
}

export function ruleFromApi(rule: FirewallRuleData): Record<string, any> {
  const result: Record<string, any> = {};
  if (rule.description !== undefined) result.description = rule.description;
  if (rule.interface !== undefined) result.interface = rule.interface;
  if (rule.ipprotocol !== undefined) result.ipprotocol = rule.ipprotocol;
  if (rule.protocol !== undefined) result.protocol = rule.protocol;
  if (rule.source_net !== undefined) result.sourceNet = rule.source_net;
  if (rule.source_port !== undefined) result.sourcePort = rule.source_port;
  if (rule.destination_net !== undefined) result.destinationNet = rule.destination_net;
  if (rule.destination_port !== undefined) result.destinationPort = rule.destination_port;
  if (rule.action !== undefined) result.action = rule.action;
  if (rule.direction !== undefined) result.direction = rule.direction;
  if (rule.log !== undefined) result.log = toBool(rule.log);
  if (rule.quick !== undefined) result.quick = toBool(rule.quick);
  if (rule.disabled !== undefined) result.disabled = toBool(rule.disabled);
  if (rule.sequence !== undefined) result.sequence = parseInt(rule.sequence, 10);
  return result;
}

export function aliasToApi(inputs: Record<string, any>): AliasData {
  const alias: AliasData = {};
  if (inputs.name !== undefined) alias.name = inputs.name;
  if (inputs.type !== undefined) alias.type = inputs.type;
  if (inputs.content !== undefined) alias.content = inputs.content;
  if (inputs.description !== undefined) alias.description = inputs.description;
  if (inputs.enabled !== undefined) alias.enabled = fromBool(inputs.enabled);
  return alias;
}

export function aliasFromApi(alias: AliasData): Record<string, any> {
  const result: Record<string, any> = {};
  if (alias.name !== undefined) result.name = alias.name;
  if (alias.type !== undefined) result.type = alias.type;
  if (alias.content !== undefined) result.content = alias.content;
  if (alias.description !== undefined) result.description = alias.description;
  if (alias.enabled !== undefined) result.enabled = toBool(alias.enabled);
  return result;
}
