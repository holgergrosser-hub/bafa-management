/**
 * Netlify Function: Proxy to Anthropic Messages API.
 *
 * Why: The Anthropic API key must not be exposed in the browser.
 *
 * Required env var on Netlify:
 * - ANTHROPIC_API_KEY
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

exports.handler = async (event) => {
  // CORS preflight (useful for local dev / non-same-origin setups)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'error', message: 'Method not allowed' })
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'error',
        message: 'Server ist nicht konfiguriert (ANTHROPIC_API_KEY fehlt).'
      })
    }
  }

  let clientPayload
  try {
    clientPayload = event.body ? JSON.parse(event.body) : {}
  } catch (_) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'error', message: 'Ungültiger JSON-Body.' })
    }
  }

  // Minimal validation
  const prompt = clientPayload?.prompt
  if (!prompt || typeof prompt !== 'string') {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'error', message: 'Feld "prompt" fehlt.' })
    }
  }

  const model = typeof clientPayload?.model === 'string' && clientPayload.model.trim()
    ? clientPayload.model.trim()
    : 'claude-sonnet-4-20250514'

  const max_tokens = Number.isFinite(clientPayload?.max_tokens)
    ? clientPayload.max_tokens
    : 1000

  try {
    const resp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model,
        max_tokens,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const text = await resp.text()
    let json
    try {
      json = text ? JSON.parse(text) : {}
    } catch (_) {
      json = { raw: text }
    }

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'error',
          message: json?.error?.message || 'Anthropic API Fehler',
          details: json
        })
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'success', anthropic: json })
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'error', message: e?.message || String(e) })
    }
  }
}
