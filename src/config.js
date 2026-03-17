// KONFIGURATION - Nach Deployment anpassen!
export const CONFIG = {
  // Google Apps Script Web App URL - NACH DEPLOYMENT EINTRAGEN
  GAS_URL: 'HIER_GOOGLE_APPS_SCRIPT_URL_EINTRAGEN',
  
  // Anthropic API (wird direkt vom Browser aufgerufen)
  ANTHROPIC_API: 'https://api.anthropic.com/v1/messages',
  
  // BAFA-spezifische Konstanten
  BAFA_ID: '123889',
  BERATER_NAME: 'Holger Grosser',
  BERATER_FIRMA: 'QM-Dienstleistungen',
  BERATER_ADRESSE: 'Simonstr. 14, 90763 Fürth',
};

function getGasUrl_() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('gasUrl');
      if (saved && String(saved).trim()) return String(saved).trim();
    }
  } catch (_) {
    // ignore
  }
  return CONFIG.GAS_URL;
}

function assertGasUrlConfigured_(gasUrl) {
  const s = String(gasUrl || '').trim();
  if (!s || s.includes('HIER_GOOGLE_APPS_SCRIPT_URL_EINTRAGEN')) {
    throw new Error('Google Apps Script URL fehlt. Bitte in Einstellungen eintragen und speichern.');
  }
}

async function readJson_(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    throw new Error('Ungültige JSON-Antwort vom Backend.');
  }
}

// API-Aufruf an Google Apps Script
export async function gasRequest(action, data = {}) {
  const payload = { action, ...data };
  
  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));
  
  try {
    const gasUrl = getGasUrl_();
    assertGasUrlConfigured_(gasUrl);

    const response = await fetch(gasUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Backend-Fehler (${response.status})`);
    }

    const json = await readJson_(response);
    return json;
  } catch (error) {
    console.error('GAS Request Fehler:', error);
    throw error;
  }
}

// GET-Aufruf
export async function gasGet(action, params = {}) {
  const gasUrl = getGasUrl_();
  assertGasUrlConfigured_(gasUrl);

  const url = new URL(gasUrl);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Backend-Fehler (${response.status})`);
    }
    return await readJson_(response);
  } catch (error) {
    console.error('GAS GET Fehler:', error);
    throw error;
  }
}
