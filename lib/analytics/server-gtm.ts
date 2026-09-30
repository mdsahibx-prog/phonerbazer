import 'server-only'

import { createHmac } from 'node:crypto'
import type { CanonicalCommerceEvent } from './events'
import { DEFAULT_ANALYTICS_PROJECT_CONFIG, normalizeAnalyticsProjectKey } from './project-config'

export type ServerGtmConfig = {
  enabled: boolean
  endpoint: string
}

export type ServerGtmHealth = {
  configured: boolean
  valid: boolean
  reachable: boolean
  endpoint: string
  latencyMs: number | null
  reason: 'NOT_CONFIGURED' | 'INVALID_ENDPOINT' | 'REACHABLE' | 'UNREACHABLE'
}

export const SERVER_GTM_CONTRACT_VERSION = '1.0'
export const SERVER_GTM_SIGNATURE_HEADER = 'x-phonerbazar-signature'
export const SERVER_GTM_TIMESTAMP_HEADER = 'x-phonerbazar-timestamp'
export const SERVER_GTM_KEY_ID_HEADER = 'x-phonerbazar-key-id'
export const SERVER_GTM_SCHEMA_HEADER = 'x-phonerbazar-schema'
export const SERVER_GTM_VERSION_HEADER = 'x-phonerbazar-version'
export const SERVER_GTM_EVENT_ID_HEADER = 'x-phonerbazar-event-id'
export const DEFAULT_SERVER_GTM_HMAC_KEY_ID = 'v1'
export const SERVER_GTM_MAX_CLOCK_SKEW_SECONDS = 300

const MAX_ENDPOINT_LENGTH = 2048

export function normalizeServerGtmEndpoint(value: string | null | undefined) {
  const endpoint = (value || '').trim().replace(/\/+$/, '')
  if (!endpoint) return ''
  if (endpoint.length > MAX_ENDPOINT_LENGTH) return ''
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:') return ''
    if (url.username || url.password || url.search || url.hash) return ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

export function isValidServerGtmEndpoint(value: string | null | undefined) {
  const raw = (value || '').trim()
  return raw === '' || normalizeServerGtmEndpoint(raw) === raw.replace(/\/+$/, '')
}

export function serverGtmHealthFromConfig(config: ServerGtmConfig): ServerGtmHealth {
  if (!config.endpoint) return { configured: false, valid: true, reachable: false, endpoint: '', latencyMs: null, reason: 'NOT_CONFIGURED' }
  const normalized = normalizeServerGtmEndpoint(config.endpoint)
  if (!normalized) return { configured: true, valid: false, reachable: false, endpoint: config.endpoint, latencyMs: null, reason: 'INVALID_ENDPOINT' }
  return { configured: true, valid: true, reachable: false, endpoint: normalized, latencyMs: null, reason: 'UNREACHABLE' }
}

function serverGtmHmacSecret() {
  return process.env.SERVER_GTM_HMAC_SECRET?.trim() || ''
}

export function serverGtmSigningConfigured() {
  return Boolean(serverGtmHmacSecret())
}

export function serverGtmKeyId() {
  return process.env.SERVER_GTM_HMAC_KEY_ID?.trim() || DEFAULT_SERVER_GTM_HMAC_KEY_ID
}

/**
 * The endpoint is treated as an opaque server-side GTM ingress.
 * The app never stores provider credentials in the database.
 *
 * The transport uses a versioned, provider-neutral envelope plus an HMAC
 * signature. The shared HMAC secret stays in deployment secrets and must be
 * provisioned separately in the server GTM environment.
 */
export function buildServerGtmEnvelope(
  event: CanonicalCommerceEvent,
  projectKey = DEFAULT_ANALYTICS_PROJECT_CONFIG.projectKey,
  environment: 'development' | 'preview' | 'production' = 'production',
) {
  const normalizedProjectKey = normalizeAnalyticsProjectKey(projectKey)
  return {
    schema: `${normalizedProjectKey}.analytics.event`,
    version: SERVER_GTM_CONTRACT_VERSION,
    project_key: normalizedProjectKey,
    environment,
    event: {
      id: event.eventId,
      name: event.eventName,
      version: event.eventVersion,
      occurred_at: event.occurredAt,
      session_id: event.sessionId,
      anonymous_id: event.anonymousId,
      page_url: event.pageUrl,
      page_path: event.pagePath,
      referrer: event.referrer,
      source: event.source,
      medium: event.medium,
      campaign: event.campaign,
      device: event.device,
      consent: event.consent,
      commerce: event.commerce,
      metadata: event.metadata,
      test_mode: event.testMode === true,
    },
  }
}

export function buildServerGtmRequest(
  event: CanonicalCommerceEvent,
  projectKey = DEFAULT_ANALYTICS_PROJECT_CONFIG.projectKey,
  environment: 'development' | 'preview' | 'production' = 'production',
) {
  const body = JSON.stringify(buildServerGtmEnvelope(event, projectKey, environment))
  const timestamp = String(Math.floor(Date.now() / 1000))
  const keyId = serverGtmKeyId()
  const secret = serverGtmHmacSecret()
  const signature = secret
    ? createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('base64url')
    : ''

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    [SERVER_GTM_TIMESTAMP_HEADER]: timestamp,
    [SERVER_GTM_KEY_ID_HEADER]: keyId,
    [SERVER_GTM_SCHEMA_HEADER]: `${normalizeAnalyticsProjectKey(projectKey)}.analytics.event`,
    [SERVER_GTM_VERSION_HEADER]: SERVER_GTM_CONTRACT_VERSION,
    [SERVER_GTM_EVENT_ID_HEADER]: event.eventId,
  }
  if (signature) headers[SERVER_GTM_SIGNATURE_HEADER] = signature

  return {
    body,
    headers,
    signed: Boolean(signature),
    timestamp,
    keyId,
  }
}
