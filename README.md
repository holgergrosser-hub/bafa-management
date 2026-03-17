# BAFA Förderung Management System

Automatisiertes Management-Tool für BAFA-Beratungsförderung (Förderung von Unternehmensberatungen für KMU).

## Architektur

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Netlify Frontend   │────▶│  Google Apps Script   │────▶│  Google Sheets   │
│  (React + Vite)     │     │  (Backend/API)        │     │  (Datenbank)     │
│                     │     │                       │     │                  │
│  • Dashboard        │     │  • CRUD Kunden        │     │  • Kunden        │
│  • KI-Scanner       │     │  • Ordner-Verwaltung  │     │  • Projekte      │
│  • Kundendetail     │     │  • E-Mail-Generator   │     │  • Checkliste    │
│  • PL-Portal        │     │  • Frist-Überwachung  │     │  • Aktivitäten   │
└─────────────────────┘     └──────────────────────┘     └──────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────┐     ┌──────────────────────┐
│  Anthropic API      │     │  Google Drive         │
│  (KI-Extraktion)    │     │  (Ordnerstruktur)     │
└─────────────────────┘     └──────────────────────┘
```

## Features

### 1. Dashboard mit Ampelsystem
- **Rot**: Frist < 4 Wochen oder überfällig
- **Gelb**: Frist 4-8 Wochen  
- **Grün**: Frist > 8 Wochen
- Fortschrittsbalken pro Kunde
- Filterung nach Status

### 2. KI-Scanner (Claude API)
- PDF-Upload von Zuwendungsbescheiden
- PDF-Upload von BAFA-Anträgen (UBF3)
- Automatische Datenextraktion
- Direkte Übernahme ins System

### 3. Dokumenten-Checkliste
Pro Kunde werden alle benötigten Dokumente getrackt:
- Beraterbericht (unterschrieben)
- Inhaltsverzeichnis
- Verfahrensanweisung
- EU-KMU & De-minimis-Erklärung
- Charta der Grundrechte
- Rechnung
- Kontoauszug
- Verwendungsnachweisformular
- Projektbericht

### 4. Projektleiter-Portal (Magic Link)
- Eigene URL pro Kunde/Projekt
- Projektleiter gibt Stunden ein
- Beratungszeiten mit Datums-/Themen-Erfassung
- Automatische Stunden-Berechnung
- Daten landen direkt im richtigen Sheet

### 5. E-Mail-Generator
- Personalisiertes Anschreiben
- Zugangsdaten (UBF-Nummer + PLZ)
- Komplette Dokumenten-Liste
- Direkt in E-Mail-Client öffnen

### 6. Projektbericht-Generator
- DOCX-Vorlage mit Platzhaltern
- Befüllung aus Sheet-Daten
- ESF Plus Grundsätze integriert
- Unterschriftenfelder

### 7. Google Drive Ordnerstruktur
Pro Kunde automatisch:
```
BAFA-Ordner/
  └── Firmenname/
      ├── Zuwendungsbescheid/
      ├── Antrag/
      ├── Beraterbericht/
      ├── Projektbericht/
      ├── Rechnung/
      ├── Kontoauszug/
      ├── EU-KMU & De-minimis/
      ├── Charta Erklärung/
      ├── Verwendungsnachweis/
      └── Korrespondenz/
```

### 8. Automatische Fristüberwachung
- Täglicher E-Mail-Check um 8:00 Uhr
- Warnungen bei 30, 14, 7, 3, 1 Tag(en)
- Sofortige Meldung bei Überfälligkeit

## Setup

### 1. Google Sheet erstellen
- Neues Sheet im [BAFA-Ordner](https://drive.google.com/drive/u/0/folders/1bu9og0iHmEx9v8-iMSqSdUCXg87aMHd-) erstellen
- Sheet-ID aus der URL kopieren

### 2. Google Apps Script
- Sheet öffnen → Erweiterungen → Apps Script
- Code aus `google-apps-script/Code.gs` einfügen
- `SPREADSHEET_ID` in CONFIG eintragen
- `setupSpreadsheet()` ausführen
- Bereitstellen → Neue Bereitstellung → Web-App
- URL kopieren

### 3. Netlify Deployment
```bash
# Repository klonen
git clone [REPO_URL]
cd bafa-management

# Dependencies installieren
npm install

# Lokal starten
npm run dev

# Für Netlify: automatisch über Git-Push
```

### 4. Trigger einrichten
- In Apps Script: `setupTrigger()` ausführen
- Tägliche Fristprüfung wird um 8:00 Uhr aktiviert

## Technologie-Stack
- **Frontend**: React 18 + Vite + React Router
- **Backend**: Google Apps Script
- **Datenbank**: Google Sheets
- **Dateien**: Google Drive
- **KI**: Anthropic Claude API (Sonnet)
- **Hosting**: Netlify
- **DOCX**: docx-js

## Konfiguration
In `src/config.js` die Google Apps Script URL eintragen.
