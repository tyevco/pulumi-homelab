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

// Unbound reconfigure workflow
export async function withUnboundReconfigure<T>(fn: () => Promise<T>): Promise<T> {
  const result = await fn();
  await request<any>("POST", "/api/unbound/service/reconfigure");
  return result;
}

// Unbound Host Override CRUD
export interface HostOverrideData {
  enabled?: string;
  hostname?: string;
  domain?: string;
  rr?: string;
  server?: string;
  mxprio?: string;
  mx?: string;
  txtdata?: string;
  ttl?: string;
  addptr?: string;
  description?: string;
}

export async function addHostOverride(hostoverride: HostOverrideData): Promise<{ uuid: string }> {
  const res = await request<{ uuid: string }>("POST", "/api/unbound/settings/addHostOverride", { hostoverride });
  return res;
}

export async function getHostOverride(uuid: string): Promise<{ hostoverride: HostOverrideData }> {
  const res = await request<{ hostoverride: HostOverrideData }>("GET", `/api/unbound/settings/getHostOverride/${uuid}`);
  return res;
}

export async function setHostOverride(uuid: string, hostoverride: HostOverrideData): Promise<void> {
  await request<any>("POST", `/api/unbound/settings/setHostOverride/${uuid}`, { hostoverride });
}

export async function delHostOverride(uuid: string): Promise<void> {
  await request<any>("POST", `/api/unbound/settings/delHostOverride/${uuid}`);
}

// Unbound Forward (Query Forwarding) CRUD
export interface ForwardData {
  enabled?: string;
  type?: string;
  domain?: string;
  server?: string;
  port?: string;
  verify?: string;
  forward_tcp_upstream?: string;
  forward_first?: string;
  description?: string;
}

export async function addForward(forward: ForwardData): Promise<{ uuid: string }> {
  const res = await request<{ uuid: string }>("POST", "/api/unbound/settings/addForward", { forward });
  return res;
}

export async function getForward(uuid: string): Promise<{ forward: ForwardData }> {
  const res = await request<{ forward: ForwardData }>("GET", `/api/unbound/settings/getForward/${uuid}`);
  return res;
}

export async function setForward(uuid: string, forward: ForwardData): Promise<void> {
  await request<any>("POST", `/api/unbound/settings/setForward/${uuid}`, { forward });
}

export async function delForward(uuid: string): Promise<void> {
  await request<any>("POST", `/api/unbound/settings/delForward/${uuid}`);
}

// Unbound ACL CRUD
export interface AclData {
  enabled?: string;
  name?: string;
  action?: string;
  networks?: string;
  description?: string;
}

export async function addAcl(acl: AclData): Promise<{ uuid: string }> {
  const res = await request<{ uuid: string }>("POST", "/api/unbound/settings/addAcl", { acl });
  return res;
}

export async function getAcl(uuid: string): Promise<{ acl: AclData }> {
  const res = await request<{ acl: AclData }>("GET", `/api/unbound/settings/getAcl/${uuid}`);
  return res;
}

export async function setAcl(uuid: string, acl: AclData): Promise<void> {
  await request<any>("POST", `/api/unbound/settings/setAcl/${uuid}`, { acl });
}

export async function delAcl(uuid: string): Promise<void> {
  await request<any>("POST", `/api/unbound/settings/delAcl/${uuid}`);
}

// Unbound DNSBL CRUD
export interface DnsblData {
  enabled?: string;
  type?: string;
  lists?: string;
  allowlists?: string;
  blocklists?: string;
  wildcards?: string;
  source_nets?: string;
  address?: string;
  nxdomain?: string;
  cache_ttl?: string;
  description?: string;
}

export async function addDnsbl(dnsbl: DnsblData): Promise<{ uuid: string }> {
  const res = await request<{ uuid: string }>("POST", "/api/unbound/settings/addDnsbl", { dnsbl });
  return res;
}

export async function getDnsbl(uuid: string): Promise<{ dnsbl: DnsblData }> {
  const res = await request<{ dnsbl: DnsblData }>("GET", `/api/unbound/settings/getDnsbl/${uuid}`);
  return res;
}

export async function setDnsbl(uuid: string, dnsbl: DnsblData): Promise<void> {
  await request<any>("POST", `/api/unbound/settings/setDnsbl/${uuid}`, { dnsbl });
}

export async function delDnsbl(uuid: string): Promise<void> {
  await request<any>("POST", `/api/unbound/settings/delDnsbl/${uuid}`);
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

// Host Override translation
export function hostOverrideToApi(inputs: Record<string, any>): HostOverrideData {
  const data: HostOverrideData = {};
  if (inputs.enabled !== undefined) data.enabled = fromBool(inputs.enabled);
  if (inputs.hostname !== undefined) data.hostname = inputs.hostname;
  if (inputs.domain !== undefined) data.domain = inputs.domain;
  if (inputs.rr !== undefined) data.rr = inputs.rr;
  if (inputs.server !== undefined) data.server = inputs.server;
  if (inputs.mxprio !== undefined) data.mxprio = String(inputs.mxprio);
  if (inputs.mx !== undefined) data.mx = inputs.mx;
  if (inputs.txtdata !== undefined) data.txtdata = inputs.txtdata;
  if (inputs.ttl !== undefined) data.ttl = String(inputs.ttl);
  if (inputs.addptr !== undefined) data.addptr = fromBool(inputs.addptr);
  if (inputs.description !== undefined) data.description = inputs.description;
  return data;
}

export function hostOverrideFromApi(data: HostOverrideData): Record<string, any> {
  const result: Record<string, any> = {};
  if (data.enabled !== undefined) result.enabled = toBool(data.enabled);
  if (data.hostname !== undefined) result.hostname = data.hostname;
  if (data.domain !== undefined) result.domain = data.domain;
  if (data.rr !== undefined) result.rr = data.rr;
  if (data.server !== undefined) result.server = data.server;
  if (data.mxprio !== undefined) result.mxprio = parseInt(data.mxprio, 10);
  if (data.mx !== undefined) result.mx = data.mx;
  if (data.txtdata !== undefined) result.txtdata = data.txtdata;
  if (data.ttl !== undefined) result.ttl = parseInt(data.ttl, 10);
  if (data.addptr !== undefined) result.addptr = toBool(data.addptr);
  if (data.description !== undefined) result.description = data.description;
  return result;
}

// Forward translation
export function forwardToApi(inputs: Record<string, any>): ForwardData {
  const data: ForwardData = {};
  if (inputs.enabled !== undefined) data.enabled = fromBool(inputs.enabled);
  if (inputs.type !== undefined) data.type = inputs.type;
  if (inputs.domain !== undefined) data.domain = inputs.domain;
  if (inputs.server !== undefined) data.server = inputs.server;
  if (inputs.port !== undefined) data.port = String(inputs.port);
  if (inputs.verify !== undefined) data.verify = inputs.verify;
  if (inputs.forwardTcpUpstream !== undefined) data.forward_tcp_upstream = fromBool(inputs.forwardTcpUpstream);
  if (inputs.forwardFirst !== undefined) data.forward_first = fromBool(inputs.forwardFirst);
  if (inputs.description !== undefined) data.description = inputs.description;
  return data;
}

export function forwardFromApi(data: ForwardData): Record<string, any> {
  const result: Record<string, any> = {};
  if (data.enabled !== undefined) result.enabled = toBool(data.enabled);
  if (data.type !== undefined) result.type = data.type;
  if (data.domain !== undefined) result.domain = data.domain;
  if (data.server !== undefined) result.server = data.server;
  if (data.port !== undefined) result.port = parseInt(data.port, 10);
  if (data.verify !== undefined) result.verify = data.verify;
  if (data.forward_tcp_upstream !== undefined) result.forwardTcpUpstream = toBool(data.forward_tcp_upstream);
  if (data.forward_first !== undefined) result.forwardFirst = toBool(data.forward_first);
  if (data.description !== undefined) result.description = data.description;
  return result;
}

// ACL translation
export function aclToApi(inputs: Record<string, any>): AclData {
  const data: AclData = {};
  if (inputs.enabled !== undefined) data.enabled = fromBool(inputs.enabled);
  if (inputs.name !== undefined) data.name = inputs.name;
  if (inputs.action !== undefined) data.action = inputs.action;
  if (inputs.networks !== undefined) data.networks = inputs.networks;
  if (inputs.description !== undefined) data.description = inputs.description;
  return data;
}

export function aclFromApi(data: AclData): Record<string, any> {
  const result: Record<string, any> = {};
  if (data.enabled !== undefined) result.enabled = toBool(data.enabled);
  if (data.name !== undefined) result.name = data.name;
  if (data.action !== undefined) result.action = data.action;
  if (data.networks !== undefined) result.networks = data.networks;
  if (data.description !== undefined) result.description = data.description;
  return result;
}

// DNSBL translation
export function dnsblToApi(inputs: Record<string, any>): DnsblData {
  const data: DnsblData = {};
  if (inputs.enabled !== undefined) data.enabled = fromBool(inputs.enabled);
  if (inputs.type !== undefined) data.type = inputs.type;
  if (inputs.lists !== undefined) data.lists = inputs.lists;
  if (inputs.allowlists !== undefined) data.allowlists = inputs.allowlists;
  if (inputs.blocklists !== undefined) data.blocklists = inputs.blocklists;
  if (inputs.wildcards !== undefined) data.wildcards = inputs.wildcards;
  if (inputs.sourceNets !== undefined) data.source_nets = inputs.sourceNets;
  if (inputs.address !== undefined) data.address = inputs.address;
  if (inputs.nxdomain !== undefined) data.nxdomain = fromBool(inputs.nxdomain);
  if (inputs.cacheTtl !== undefined) data.cache_ttl = String(inputs.cacheTtl);
  if (inputs.description !== undefined) data.description = inputs.description;
  return data;
}

export function dnsblFromApi(data: DnsblData): Record<string, any> {
  const result: Record<string, any> = {};
  if (data.enabled !== undefined) result.enabled = toBool(data.enabled);
  if (data.type !== undefined) result.type = data.type;
  if (data.lists !== undefined) result.lists = data.lists;
  if (data.allowlists !== undefined) result.allowlists = data.allowlists;
  if (data.blocklists !== undefined) result.blocklists = data.blocklists;
  if (data.wildcards !== undefined) result.wildcards = data.wildcards;
  if (data.source_nets !== undefined) result.sourceNets = data.source_nets;
  if (data.address !== undefined) result.address = data.address;
  if (data.nxdomain !== undefined) result.nxdomain = toBool(data.nxdomain);
  if (data.cache_ttl !== undefined) result.cacheTtl = parseInt(data.cache_ttl, 10);
  if (data.description !== undefined) result.description = data.description;
  return result;
}
