// ============================================
// BAFA Förderung Management - Google Apps Script
// Backend für Datenverarbeitung & Google Drive
// ============================================

// KONFIGURATION
const CONFIG = {
  SPREADSHEET_ID: '', // Wird nach Sheet-Erstellung eingetragen
  DRIVE_FOLDER_ID: '1bu9og0iHmEx9v8-iMSqSdUCXg87aMHd-',
  // Optional: wird für Links im Projektleiter-Reminder verwendet.
  // Kann leer bleiben, wenn das Frontend `frontendBaseUrl` mitsendet.
  FRONTEND_BASE_URL: '',
  SHEET_NAMES: {
    KUNDEN: 'Kunden',
    PROJEKTE: 'Projekte',
    CHECKLISTE: 'Checkliste',
    LOG: 'Aktivitäten'
  }
};

// ============================================
// WEB APP ENDPOINTS
// ============================================

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    switch(action) {
      case 'getKunden':
        return jsonResponse(getKunden());
      case 'getKunde':
        return jsonResponse(getKunde(e.parameter.id));
      case 'getFoerderfaelle':
        return jsonResponse(getFoerderfaelle(e.parameter.kundeId));
      case 'getDashboard':
        return jsonResponse(getDashboardData());
      case 'getCheckliste':
        return jsonResponse(getCheckliste(e.parameter.kundeId));
      case 'getProjektleiterForm':
        return jsonResponse(getProjektleiterData(e.parameter.token));
      default:
        return jsonResponse({ status: 'error', message: 'Unbekannte Aktion: ' + action });
    }
  } catch (error) {
    console.error('doGet Fehler:', error);
    return jsonResponse({ status: 'error', message: error.message });
  }
}

function doPost(e) {
  try {
    const hasParameters = !!(e && e.parameter && Object.keys(e.parameter).length);
    const hasPostData = !!(e && e.postData);
    if (!e || (!hasPostData && !hasParameters)) {
      return jsonResponse({ status: 'error', message: 'Keine Daten empfangen' });
    }

    const data = parseRequestData_(e);
    if (!data || !data.action) {
      return jsonResponse({ status: 'error', message: 'Keine action angegeben' });
    }
    
    console.log('POST empfangen:', JSON.stringify(data));
    const action = data.action;
    
    switch(action) {
      case 'neuerKunde':
        return jsonResponse(neuerKunde(data));
      case 'updateKunde':
        return jsonResponse(updateKunde(data));
      case 'addFoerderfall':
        return jsonResponse(addFoerderfall(data));
      case 'kiExtraktion':
        return jsonResponse(kiExtraktion(data));
      case 'projektleiterDaten':
        return jsonResponse(projektleiterDaten(data));
      case 'erstelleProjektbericht':
        return jsonResponse(erstelleProjektbericht(data.kundeId));
      case 'erstelleEmail':
        return jsonResponse(erstelleEmail(data.kundeId));
      case 'sendeErinnerung':
        return jsonResponse(sendeErinnerung(data));
      case 'updateCheckliste':
        return jsonResponse(updateCheckliste(data));
      case 'erstelleOrdner':
        return jsonResponse(erstelleKundenOrdner(data.kundeId));
      default:
        return jsonResponse({ status: 'error', message: 'Unbekannte Aktion: ' + action });
    }
  } catch (error) {
    console.error('doPost Fehler:', error);
    return jsonResponse({ status: 'error', message: error.message });
  }
}

function parseRequestData_(e) {
  // Wichtig: Frontend sendet FormData OHNE Content-Type Header.
  // Apps Script parsed multipart/form-data Felder in e.parameter.
  // Wir unterstützen:
  // - FormData(payload="{...}")
  // - FormData(action=..., ...)
  // - Raw JSON body
  let data = {};

  if (e && e.parameter && Object.keys(e.parameter).length) {
    if (e.parameter.payload) {
      try {
        data = JSON.parse(e.parameter.payload);
      } catch (_) {
        data = {};
      }
    } else {
      data = e.parameter;
    }
  }

  if ((!data || !data.action) && e && e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (_) {
      // ignore
    }
  }

  // Known fields that often come as JSON strings
  if (data && typeof data.beratungszeiten === 'string') {
    try {
      data.beratungszeiten = JSON.parse(data.beratungszeiten);
    } catch (_) {}
  }

  return data;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// SHEET SETUP
// ============================================

function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
  // Kunden-Sheet
  let kundenSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.KUNDEN);
  if (!kundenSheet) {
    kundenSheet = ss.insertSheet(CONFIG.SHEET_NAMES.KUNDEN);
  }
  kundenSheet.getRange(1, 1, 1, 25).setValues([[
    'ID', 'Status', 'Firma', 'Ansprechpartner', 'Anrede', 'Vorname', 'Nachname',
    'Strasse', 'PLZ', 'Ort', 'Telefon', 'Email',
    'Rechtsform', 'Gruendungsdatum', 'Geschaeftsgegenstand', 'WZ_Klassifikation',
    'Unternehmenstyp', 'Anzahl_Beschaeftigte', 'Jahresbilanzsumme', 'Jahresumsatz',
    'UBF_Nummer', 'Bescheid_Datum', 'Vorlagefrist', 'Ordner_ID', 'Erstellt_am'
  ]]);
  kundenSheet.getRange(1, 1, 1, 25).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  kundenSheet.setFrozenRows(1);
  
  // Projekte-Sheet
  let projekteSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROJEKTE);
  if (!projekteSheet) {
    projekteSheet = ss.insertSheet(CONFIG.SHEET_NAMES.PROJEKTE);
  }
  projekteSheet.getRange(1, 1, 1, 15).setValues([[
    'ID', 'Kunde_ID', 'Projektleiter', 'PL_Email', 'PL_Token',
    'Projektstart', 'Projektende', 'Beratertage', 'Stunden_Gesamt',
    'Beratungszeiten_JSON', 'Aufgabenstellung', 'Was_wurde_gemacht',
    'Rechnung_Betrag', 'Rechnung_Datum', 'Status'
  ]]);
  projekteSheet.getRange(1, 1, 1, 15).setFontWeight('bold').setBackground('#34a853').setFontColor('white');
  projekteSheet.setFrozenRows(1);
  
  // Checkliste-Sheet
  let checkSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CHECKLISTE);
  if (!checkSheet) {
    checkSheet = ss.insertSheet(CONFIG.SHEET_NAMES.CHECKLISTE);
  }
  checkSheet.getRange(1, 1, 1, 12).setValues([[
    'Kunde_ID', 'Beraterbericht', 'Inhaltsverzeichnis', 'Verfahrensanweisung',
    'KMU_Erklaerung', 'Charta_Erklaerung', 'Rechnung', 'Kontoauszug',
    'Verwendungsnachweis', 'Projektbericht', 'Email_versendet', 'Alle_komplett'
  ]]);
  checkSheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#fbbc04').setFontColor('black');
  checkSheet.setFrozenRows(1);
  
  // Aktivitäten-Log
  let logSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!logSheet) {
    logSheet = ss.insertSheet(CONFIG.SHEET_NAMES.LOG);
  }
  logSheet.getRange(1, 1, 1, 4).setValues([[
    'Timestamp', 'Kunde_ID', 'Aktion', 'Details'
  ]]);
  logSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#ea4335').setFontColor('white');
  logSheet.setFrozenRows(1);
  
  // Standardblatt löschen falls vorhanden
  const defaultSheet = ss.getSheetByName('Tabellenblatt1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
  
  return { status: 'success', message: 'Spreadsheet eingerichtet' };
}

// ============================================
// KUNDEN-VERWALTUNG
// ============================================

function neuerKunde(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.KUNDEN);
  
  const id = 'BAFA-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  const now = new Date().toISOString();
  
  const row = [
    id, 'Neu', data.firma || '', data.ansprechpartner || '',
    data.anrede || '', data.vorname || '', data.nachname || '',
    data.strasse || '', data.plz || '', data.ort || '',
    data.telefon || '', data.email || '',
    data.rechtsform || '', data.gruendungsdatum || '',
    data.geschaeftsgegenstand || '', data.wz_klassifikation || '',
    data.unternehmenstyp || '', data.anzahl_beschaeftigte || '',
    data.jahresbilanzsumme || '', data.jahresumsatz || '',
    data.ubf_nummer || '', data.bescheid_datum || '',
    data.vorlagefrist || '', '', now
  ];
  
  sheet.appendRow(row);
  
  // Ordner anlegen
  const ordnerResult = erstelleKundenOrdner(id);
  
  // Checkliste anlegen
  const checkSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CHECKLISTE);
  checkSheet.appendRow([id, false, false, false, false, false, false, false, false, false, false, false]);
  
  // Projekt anlegen
  const projekteSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROJEKTE);
  const plToken = Utilities.getUuid().substring(0, 12);
  projekteSheet.appendRow([
    'PRJ-' + Utilities.getUuid().substring(0, 8).toUpperCase(),
    id, '', '', plToken,
    '', '', '', '', '[]', '', '', '', '', 'Offen'
  ]);
  
  logAktion(id, 'Neuer Kunde angelegt', data.firma);
  
  return { 
    status: 'success', 
    kundeId: id, 
    ordner: ordnerResult,
    plToken: plToken,
    message: 'Kunde ' + data.firma + ' angelegt' 
  };
}

function getKunden() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.KUNDEN);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return { status: 'success', kunden: [] };
  
  const headers = data[0];
  const kunden = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  
  return { status: 'success', kunden: kunden };
}

function getKunde(id) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.KUNDEN);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      const obj = {};
      headers.forEach((h, j) => obj[h] = data[i][j]);
      
      // Projekt-Daten dazu
      const projSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROJEKTE);
      const projData = projSheet.getDataRange().getValues();
      const projHeaders = projData[0];
      for (let p = 1; p < projData.length; p++) {
        if (projData[p][1] === id) {
          const proj = {};
          projHeaders.forEach((h, j) => proj[h] = projData[p][j]);
          obj.projekt = proj;
          break;
        }
      }
      
      // Checkliste dazu
      const checkSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CHECKLISTE);
      const checkData = checkSheet.getDataRange().getValues();
      const checkHeaders = checkData[0];
      for (let c = 1; c < checkData.length; c++) {
        if (checkData[c][0] === id) {
          const check = {};
          checkHeaders.forEach((h, j) => check[h] = checkData[c][j]);
          obj.checkliste = check;
          break;
        }
      }
      
      return { status: 'success', kunde: obj };
    }
  }
  
  return { status: 'error', message: 'Kunde nicht gefunden' };
}

function updateKunde(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.KUNDEN);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.id) {
      headers.forEach((h, j) => {
        if (data[h] !== undefined && h !== 'ID' && h !== 'Erstellt_am') {
          sheet.getRange(i + 1, j + 1).setValue(data[h]);
        }
      });
      logAktion(data.id, 'Kunde aktualisiert', JSON.stringify(data).substring(0, 200));
      return { status: 'success', message: 'Kunde aktualisiert' };
    }
  }
  
  return { status: 'error', message: 'Kunde nicht gefunden' };
}

// ============================================
// FÖRDERFÄLLE (Mehrfach-Förderungen pro Kunde)
// ============================================

function ensureKundenColumn_(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idx = headers.indexOf(headerName);
  if (idx !== -1) return idx + 1;

  const newCol = headers.length + 1;
  sheet.getRange(1, newCol).setValue(headerName).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  return newCol;
}

function normalizeIsoDate_(s) {
  const v = String(s || '').trim();
  if (!v) return '';

  // Accept YYYY-MM-DD or DD.MM.YYYY (also embedded in longer strings)
  const iso = v.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const de = v.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (de) return `${de[3]}-${de[2]}-${de[1]}`;

  // Try Date parsing as last resort
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (_) {
    return '';
  }
}

function getOrCreateSubfolder_(parentFolder, name) {
  const existing = parentFolder.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parentFolder.createFolder(name);
}

function formatFolderDate_(isoDate) {
  const m = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function parseFoerderfaelleCell_(cellValue) {
  const text = String(cellValue || '').trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach(line => {
    const parts = line.split('|');
    const dateIso = normalizeIsoDate_(parts[0]);
    const folderId = (parts[1] || '').trim();
    if (!dateIso) return;
    items.push({ date: dateIso, folderId: folderId });
  });
  // Deduplicate by date
  const seen = {};
  return items.filter(it => {
    if (seen[it.date]) return false;
    seen[it.date] = true;
    return true;
  });
}

function serializeFoerderfaelleCell_(items) {
  const sorted = (items || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return sorted.map(it => `${it.date}|${it.folderId || ''}`.trim()).join('\n');
}

function getFoerderfaelle(kundeId) {
  if (!kundeId) return { status: 'error', message: 'kundeId fehlt' };

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.KUNDEN);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  const colAntraege = ensureKundenColumn_(sheet, 'Antraege');
  const headerOrdnerIdx = headers.indexOf('Ordner_ID');
  const ordnerCol = headerOrdnerIdx !== -1 ? headerOrdnerIdx + 1 : null;

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === kundeId) {
      const cell = sheet.getRange(i + 1, colAntraege).getValue();
      const items = parseFoerderfaelleCell_(cell).map(it => ({
        date: it.date,
        name: `Antrag ${formatFolderDate_(it.date)}`,
        folderId: it.folderId || ''
      }));
      const kundenOrdnerId = ordnerCol ? String(allData[i][ordnerCol - 1] || '').trim() : '';
      let antraegeFolderId = '';
      try {
        if (kundenOrdnerId) {
          const kundenFolder = DriveApp.getFolderById(kundenOrdnerId);
          const antraege = kundenFolder.getFoldersByName('Anträge');
          if (antraege.hasNext()) antraegeFolderId = antraege.next().getId();
        }
      } catch (_) {
        // ignore
      }
      return { status: 'success', foerderfaelle: items, kundenOrdnerId: kundenOrdnerId, antraegeFolderId: antraegeFolderId };
    }
  }

  return { status: 'error', message: 'Kunde nicht gefunden' };
}

function addFoerderfall(data) {
  const kundeId = data && data.kundeId;
  const antragDatumIso = normalizeIsoDate_(data && (data.antragDatum || data.bescheid_datum || data.bescheidDatum));
  if (!kundeId) return { status: 'error', message: 'kundeId fehlt' };
  if (!antragDatumIso) return { status: 'error', message: 'antragDatum fehlt oder ungültig (erwartet YYYY-MM-DD oder DD.MM.YYYY)' };

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.KUNDEN);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  const colAntraege = ensureKundenColumn_(sheet, 'Antraege');
  const headerOrdnerIdx = headers.indexOf('Ordner_ID');
  const ordnerCol = headerOrdnerIdx !== -1 ? headerOrdnerIdx + 1 : null;

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === kundeId) {
      // Ensure customer main folder exists
      let kundenOrdnerId = ordnerCol ? String(allData[i][ordnerCol - 1] || '').trim() : '';
      if (!kundenOrdnerId) {
        const ordnerRes = erstelleKundenOrdner(kundeId);
        if (ordnerRes && ordnerRes.status === 'success') {
          kundenOrdnerId = ordnerRes.folderId;
        }
      }
      if (!kundenOrdnerId) return { status: 'error', message: 'Kundenordner konnte nicht ermittelt werden' };

      const kundenFolder = DriveApp.getFolderById(kundenOrdnerId);
      // Alle Anträge/zu analysierenden Dokumente liegen unterhalb dieses Ordners
      const antraegeFolder = getOrCreateSubfolder_(kundenFolder, 'Anträge');
      const folderName = `Antrag ${formatFolderDate_(antragDatumIso)}`;

      // Create/find subfolder
      let foerderFolder;
      const existing = antraegeFolder.getFoldersByName(folderName);
      if (existing.hasNext()) {
        foerderFolder = existing.next();
      } else {
        foerderFolder = antraegeFolder.createFolder(folderName);
      }

      // Update sheet cell
      const cell = sheet.getRange(i + 1, colAntraege).getValue();
      const items = parseFoerderfaelleCell_(cell);
      const already = items.find(it => it.date === antragDatumIso);
      if (!already) {
        items.push({ date: antragDatumIso, folderId: foerderFolder.getId() });
      } else if (!already.folderId) {
        already.folderId = foerderFolder.getId();
      }
      sheet.getRange(i + 1, colAntraege).setValue(serializeFoerderfaelleCell_(items));

      logAktion(kundeId, 'Foerderfall angelegt', `${folderName} | ${foerderFolder.getUrl()}`);

      return {
        status: 'success',
        foerderfall: {
          date: antragDatumIso,
          name: folderName,
          folderId: foerderFolder.getId(),
          folderUrl: foerderFolder.getUrl()
        }
      };
    }
  }

  return { status: 'error', message: 'Kunde nicht gefunden' };
}

// ============================================
// KI EXTRAKTION - Claude API
// ============================================

function kiExtraktion(data) {
  // data.dokumentTyp: 'zuwendungsbescheid' oder 'antrag'
  // data.textContent: Extrahierter Text aus dem PDF (kommt vom Frontend)
  
  const prompt = data.dokumentTyp === 'zuwendungsbescheid' 
    ? `Extrahiere aus folgendem Zuwendungsbescheid diese Daten im JSON-Format:
{
  "firma": "Firmenname",
  "ansprechpartner": "Name der Ansprechperson",
  "strasse": "Straße und Hausnummer",
  "plz": "PLZ",
  "ort": "Ort",
  "ubf_nummer": "UBF-Nummer (nur Zahlen, ohne UBF-)",
  "bescheid_datum": "Datum des Bescheids (YYYY-MM-DD)",
  "vorlagefrist": "Vorlagefrist Datum (YYYY-MM-DD)"
}

Text:
${data.textContent}`
    : `Extrahiere aus folgendem BAFA-Förderantrag diese Daten im JSON-Format:
{
  "firma": "Firmenname",
  "ansprechpartner": "Vollständiger Name",
  "anrede": "Herr/Frau",
  "vorname": "Vorname",
  "nachname": "Nachname", 
  "strasse": "Straße und Hausnummer",
  "plz": "PLZ",
  "ort": "Ort",
  "telefon": "Telefonnummer",
  "email": "E-Mail-Adresse",
  "rechtsform": "z.B. natürliche Person, juristische Person",
  "gruendungsdatum": "Gründungsdatum (YYYY-MM-DD)",
  "geschaeftsgegenstand": "Geschäftsgegenstand",
  "wz_klassifikation": "Wirtschaftszweig",
  "unternehmenstyp": "eigenständig/Partner/verbunden",
  "anzahl_beschaeftigte": "Zahl",
  "jahresbilanzsumme": "Betrag",
  "jahresumsatz": "Betrag"
}

Text:
${data.textContent}`;

  // Die KI-Extraktion erfolgt im Frontend über die Anthropic API
  // Hier nur Daten speichern wenn sie schon extrahiert wurden
  if (data.extrahierteDaten) {
    return { status: 'success', daten: data.extrahierteDaten, prompt: prompt };
  }
  
  return { status: 'success', prompt: prompt };
}

// ============================================
// GOOGLE DRIVE ORDNER
// ============================================

function erstelleKundenOrdner(kundeId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.KUNDEN);
  const data = sheet.getDataRange().getValues();
  
  let firma = '';
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === kundeId) {
      firma = data[i][2];
      rowIndex = i;
      break;
    }
  }
  
  if (!firma) return { status: 'error', message: 'Kunde nicht gefunden' };
  
  const parentFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  
  // Prüfen ob Ordner schon existiert
  const existingFolders = parentFolder.getFoldersByName(firma);
  let folder;
  if (existingFolders.hasNext()) {
    folder = existingFolders.next();
  } else {
    folder = parentFolder.createFolder(firma);
  }
  
  // Ordner-ID im Sheet speichern
  if (rowIndex >= 0) {
    sheet.getRange(rowIndex + 1, 24).setValue(folder.getId());
  }
  
  logAktion(kundeId, 'Ordner erstellt', folder.getUrl());
  
  return { 
    status: 'success', 
    folderId: folder.getId(), 
    folderUrl: folder.getUrl(),
    message: 'Ordner für ' + firma + ' erstellt'
  };
}

// ============================================
// PROJEKTLEITER-DATEN
// ============================================

function projektleiterDaten(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROJEKTE);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  
  // Token-basierte Zuordnung
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][4] === data.token || allData[i][1] === data.kundeId) {
      const rowIndex = i + 1;
      
      if (data.projektleiter) sheet.getRange(rowIndex, 3).setValue(data.projektleiter);
      if (data.plEmail) sheet.getRange(rowIndex, 4).setValue(data.plEmail);
      if (data.projektstart) sheet.getRange(rowIndex, 6).setValue(data.projektstart);
      if (data.projektende) sheet.getRange(rowIndex, 7).setValue(data.projektende);
      if (data.beratertage) sheet.getRange(rowIndex, 8).setValue(data.beratertage);
      if (data.stundenGesamt) sheet.getRange(rowIndex, 9).setValue(data.stundenGesamt);
      if (data.beratungszeiten) sheet.getRange(rowIndex, 10).setValue(JSON.stringify(data.beratungszeiten));
      if (data.aufgabenstellung) sheet.getRange(rowIndex, 11).setValue(data.aufgabenstellung);
      if (data.wasWurdeGemacht) sheet.getRange(rowIndex, 12).setValue(data.wasWurdeGemacht);
      if (data.rechnungBetrag) sheet.getRange(rowIndex, 13).setValue(data.rechnungBetrag);
      if (data.rechnungDatum) sheet.getRange(rowIndex, 14).setValue(data.rechnungDatum);
      
      sheet.getRange(rowIndex, 15).setValue('Daten erfasst');
      
      logAktion(allData[i][1], 'Projektleiter-Daten erfasst', data.projektleiter || '');
      
      return { status: 'success', message: 'Projektdaten gespeichert' };
    }
  }
  
  return { status: 'error', message: 'Projekt nicht gefunden' };
}

function getProjektleiterData(token) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const projSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROJEKTE);
  const projData = projSheet.getDataRange().getValues();
  const projHeaders = projData[0];
  
  for (let i = 1; i < projData.length; i++) {
    if (projData[i][4] === token) {
      const kundeId = projData[i][1];
      
      // Kundendaten holen
      const kundenSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.KUNDEN);
      const kundenData = kundenSheet.getDataRange().getValues();
      const kundenHeaders = kundenData[0];
      
      for (let k = 1; k < kundenData.length; k++) {
        if (kundenData[k][0] === kundeId) {
          return {
            status: 'success',
            firma: kundenData[k][2],
            kundeId: kundeId,
            token: token
          };
        }
      }
    }
  }
  
  return { status: 'error', message: 'Token ungültig' };
}

// ============================================
// CHECKLISTE
// ============================================

function getCheckliste(kundeId) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CHECKLISTE);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === kundeId) {
      const obj = {};
      headers.forEach((h, j) => obj[h] = data[i][j]);
      return { status: 'success', checkliste: obj };
    }
  }
  
  return { status: 'error', message: 'Checkliste nicht gefunden' };
}

function updateCheckliste(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CHECKLISTE);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.kundeId) {
      headers.forEach((h, j) => {
        if (data[h] !== undefined && h !== 'Kunde_ID') {
          sheet.getRange(i + 1, j + 1).setValue(data[h]);
        }
      });
      
      // Prüfen ob alles komplett
      const checkValues = headers.slice(1, -1).map((h, j) => data[h] !== undefined ? data[h] : allData[i][j + 1]);
      const alleKomplett = checkValues.every(v => v === true || v === 'true');
      sheet.getRange(i + 1, headers.length).setValue(alleKomplett);
      
      logAktion(data.kundeId, 'Checkliste aktualisiert', JSON.stringify(data).substring(0, 200));
      return { status: 'success', message: 'Checkliste aktualisiert', alleKomplett: alleKomplett };
    }
  }
  
  return { status: 'error', message: 'Checkliste nicht gefunden' };
}

// ============================================
// DASHBOARD DATEN
// ============================================

function getDashboardData() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const kundenSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.KUNDEN);
  const projSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROJEKTE);
  const checkSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CHECKLISTE);
  
  const kundenData = kundenSheet.getDataRange().getValues();
  const projData = projSheet.getDataRange().getValues();
  const checkData = checkSheet.getDataRange().getValues();
  
  const kundenHeaders = kundenData[0];
  const projHeaders = projData[0];
  const checkHeaders = checkData[0];
  
  const dashboard = [];
  const heute = new Date();
  
  for (let i = 1; i < kundenData.length; i++) {
    const kunde = {};
    kundenHeaders.forEach((h, j) => kunde[h] = kundenData[i][j]);
    
    // Frist-Ampel berechnen
    if (kunde.Vorlagefrist) {
      const frist = new Date(kunde.Vorlagefrist);
      const diffTage = Math.ceil((frist - heute) / (1000 * 60 * 60 * 24));
      
      if (diffTage < 0) {
        kunde.ampel = 'rot';
        kunde.fristInfo = 'ÜBERFÄLLIG seit ' + Math.abs(diffTage) + ' Tagen';
      } else if (diffTage <= 28) {
        kunde.ampel = 'gelb';
        kunde.fristInfo = 'Noch ' + diffTage + ' Tage';
      } else {
        kunde.ampel = 'gruen';
        kunde.fristInfo = 'Noch ' + diffTage + ' Tage';
      }
      kunde.fristTage = diffTage;
    }
    
    // Projekt-Daten zuordnen
    for (let p = 1; p < projData.length; p++) {
      if (projData[p][1] === kunde.ID) {
        const proj = {};
        projHeaders.forEach((h, j) => proj[h] = projData[p][j]);
        kunde.projekt = proj;
        break;
      }
    }
    
    // Checkliste zuordnen
    for (let c = 1; c < checkData.length; c++) {
      if (checkData[c][0] === kunde.ID) {
        const check = {};
        checkHeaders.forEach((h, j) => check[h] = checkData[c][j]);
        
        // Fortschritt berechnen
        const checkItems = checkHeaders.slice(1, -1);
        const erledigt = checkItems.filter((h, j) => checkData[c][j + 1] === true || checkData[c][j + 1] === 'true').length;
        check.fortschritt = Math.round((erledigt / checkItems.length) * 100);
        
        kunde.checkliste = check;
        break;
      }
    }
    
    dashboard.push(kunde);
  }
  
  // Statistiken
  const stats = {
    gesamt: dashboard.length,
    rot: dashboard.filter(k => k.ampel === 'rot').length,
    gelb: dashboard.filter(k => k.ampel === 'gelb').length,
    gruen: dashboard.filter(k => k.ampel === 'gruen').length,
    abgeschlossen: dashboard.filter(k => k.Status === 'Abgeschlossen').length
  };
  
  return { status: 'success', dashboard: dashboard, stats: stats };
}

// ============================================
// E-MAIL GENERIERUNG
// ============================================

function erstelleEmail(kundeId) {
  const kundeResult = getKunde(kundeId);
  if (kundeResult.status !== 'success') return kundeResult;
  
  const kunde = kundeResult.kunde;
  const anrede = kunde.Anrede === 'Herr' ? 'Sehr geehrter Herr' : 'Sehr geehrte Frau';
  
  const emailText = `${anrede} ${kunde.Nachname},

im Anhang erhalten Sie die Verwendungsnachweisunterlagen für die QM-Beratung, die für den BAFA-Antrag erforderlich sind.

Folgende Unterlagen müssen spätestens sechs Monate nach Erhalt Ihres Informationsschreibens in elektronischer Form bei der Leitstelle vorliegen. (Als Anhänge per E-Mail). Die Vorlagefrist endet am ${formatDate(kunde.Vorlagefrist)}.

Anmeldung über folgenden Link: BAFA: Bundesamt für Wirtschaft und Ausfuhrkontrolle - Anmeldung

Ihre Zugangsdaten zum Verwendungsnachweis:
Vorgangsnummer: ${kunde.UBF_Nummer} (Sie geben nur die sieben Zahlen nicht aber die Abkürzung "UBF" ein)
Passwort: ${kunde.PLZ}

Bitte füllen Sie alle Pflichtfelder aus.

Angaben zum Beratungsunternehmen: BAFA-ID: 123889
Durchgeführte Beratung: bitte wählen Sie "organisatorisch" aus

Informationen zum Projektstart- und Ende, Projekttagen sowie Inhalt und Ziel des Beratungsauftrages finden Sie im Ihrem Beraterbericht.

Kosten der Beratung: steht auf unserer Rechnung

Folgende Unterlagen müssen vollständig hochgeladen werden:

1. Vom Beratenden und vom Antragstellenden unterschriebener Beratungsbericht inkl. Fragebogen "bereichsübergreifende Grundsätze des ESF Plus"
2. Inhaltsverzeichnis und Verfahrensanweisung des QM-Dienstleisters (Anlage 02 + 03)
3. Ausgefülltes und unterschriebenes Formular zur EU-KMU-Erklärung und De-minimis-Erklärung (Anlage 04)
4. Erklärung zur Kenntnisnahme des Merkblatts zur Achtung der Charta der Grundrechte der EU (Anlage 05)
5. Rechnung des Beratungsunternehmens (Anlage 06)
6. Kontoauszug des Antragstellenden zum Nachweis über die vollständige Zahlung des Honorars

Sie erhalten dann eine E-Mail mit einem Link zu Ihrem vorgefüllten "Verwendungsnachweisformular". Dieses Formular muss ausgedruckt und unterschrieben werden.

Mit freundlichen Grüßen

Holger Grosser
QM-Dienstleistungen`;

  const betreff = `BAFA Verwendungsnachweis - ${kunde.Firma} - Frist: ${formatDate(kunde.Vorlagefrist)}`;
  
  return { 
    status: 'success', 
    email: {
      an: kunde.Email,
      betreff: betreff,
      text: emailText,
      firma: kunde.Firma
    }
  };
}

function sendeErinnerung(kundeId) {
  // Unterstützt beide Signaturen:
  // - sendeErinnerung(kundeId)
  // - sendeErinnerung({ kundeId, frontendBaseUrl })
  const parsed = (kundeId && typeof kundeId === 'object') ? kundeId : { kundeId: kundeId };
  const actualKundeId = parsed.kundeId;
  const kundeResult = getKunde(actualKundeId);
  if (kundeResult.status !== 'success') return kundeResult;
  
  const kunde = kundeResult.kunde;
  const projekt = kunde.projekt || {};
  
  const plToken = projekt.PL_Token || '';
  const baseUrl = (parsed.frontendBaseUrl && String(parsed.frontendBaseUrl).trim())
    ? String(parsed.frontendBaseUrl).trim().replace(/\/$/, '')
    : (CONFIG.FRONTEND_BASE_URL ? String(CONFIG.FRONTEND_BASE_URL).trim().replace(/\/$/, '') : '');
  const plLink = baseUrl ? `${baseUrl}/projektleiter?token=${plToken}` : `/projektleiter?token=${plToken}`;
  
  const fehlend = [];
  if (!projekt.Projektleiter) fehlend.push('Projektleiter');
  if (!projekt.Stunden_Gesamt) fehlend.push('Gebrauchte Stunden');
  if (!projekt.Was_wurde_gemacht) fehlend.push('Was wurde gemacht');
  if (!projekt.Rechnung_Betrag) fehlend.push('Rechnung');
  
  const emailText = `Hallo,

für den BAFA-Kunden ${kunde.Firma} benötigen wir noch folgende Informationen:

${fehlend.map(f => '• ' + f).join('\n')}

Bitte trage die Daten über folgenden Link ein:
${plLink}

Die Vorlagefrist endet am ${formatDate(kunde.Vorlagefrist)}.

Vielen Dank!`;

  return {
    status: 'success',
    erinnerung: {
      betreff: `BAFA Erinnerung: Daten benötigt für ${kunde.Firma}`,
      text: emailText,
      fehlend: fehlend,
      plLink: plLink
    }
  };
}

// ============================================
// PROJEKTBERICHT (optional)
// ============================================

function erstelleProjektbericht(kundeId) {
  // Hinweis: Im MVP wird der Projektbericht clientseitig als DOCX generiert.
  // Diese Funktion ist nur ein Platzhalter, damit der Endpoint nicht mit ReferenceError crasht.
  return {
    status: 'error',
    message: 'Projektbericht-Generierung im Apps Script ist noch nicht implementiert. Bitte den DOCX-Download im Frontend verwenden.'
  };
}

// ============================================
// HILFSFUNKTIONEN
// ============================================

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function logAktion(kundeId, aktion, details) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
    sheet.appendRow([new Date().toISOString(), kundeId, aktion, details || '']);
  } catch (e) {
    console.error('Log-Fehler:', e);
  }
}

// ============================================
// TÄGLICHER FRIST-CHECK (Zeitgesteuert)
// ============================================

function taeglicheFristpruefung() {
  const result = getDashboardData();
  if (result.status !== 'success') return;
  
  const heute = new Date();
  const warnungen = [];
  
  result.dashboard.forEach(kunde => {
    if (kunde.Vorlagefrist) {
      const frist = new Date(kunde.Vorlagefrist);
      const diffTage = Math.ceil((frist - heute) / (1000 * 60 * 60 * 24));
      
      // Warnung bei 30, 14, 7, 3, 1 Tagen und bei Überfälligkeit
      if ([30, 14, 7, 3, 1, 0, -1].includes(diffTage)) {
        warnungen.push({
          firma: kunde.Firma,
          frist: formatDate(kunde.Vorlagefrist),
          tage: diffTage,
          status: diffTage <= 0 ? 'ÜBERFÄLLIG' : `Noch ${diffTage} Tage`
        });
      }
    }
  });
  
  if (warnungen.length > 0) {
    const emailBody = warnungen.map(w => 
      `${w.firma}: ${w.status} (Frist: ${w.frist})`
    ).join('\n');
    
    MailApp.sendEmail({
      to: Session.getActiveUser().getEmail(),
      subject: `BAFA Fristwarnung: ${warnungen.length} Fälle benötigen Aufmerksamkeit`,
      body: `Folgende BAFA-Fälle benötigen Aufmerksamkeit:\n\n${emailBody}`
    });
  }
}

// Trigger einrichten für tägliche Prüfung
function setupTrigger() {
  // Bestehende Trigger löschen
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  
  // Täglicher Trigger um 8:00 Uhr
  ScriptApp.newTrigger('taeglicheFristpruefung')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
  
  return { status: 'success', message: 'Täglicher Frist-Check eingerichtet' };
}
