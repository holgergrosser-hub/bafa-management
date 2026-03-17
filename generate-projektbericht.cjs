// Projektbericht DOCX Generator
// Erstellt neutrale Vorlage die mit Kundendaten befüllt werden kann

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat, PageBreak } = require('docx');
const fs = require('fs');

// Platzhalter-Daten (werden im Frontend durch echte Daten ersetzt)
const daten = {
  // Berater
  berater_firma: 'QM-Dienstleistungen',
  berater_name: 'Holger Grosser',
  berater_adresse: 'Simonstr. 14',
  berater_plz_ort: '90763 Fürth',
  
  // Kunde (Platzhalter)
  firma: '{{FIRMA}}',
  strasse: '{{STRASSE}}',
  plz_ort: '{{PLZ}} {{ORT}}',
  kontakt_email: '{{EMAIL}}',
  kontakt_tel: '{{TELEFON}}',
  
  // Projekt
  projektstart: '{{PROJEKTSTART}}',
  projektende: '{{PROJEKTENDE}}',
  beratertage: '{{BERATERTAGE}}',
  stunden_gesamt: '{{STUNDEN_GESAMT}}',
  aufgabenstellung: '{{AUFGABENSTELLUNG}}',
  massnahmen: '{{MASSNAHMEN}}',
  
  // Beratungszeiten (Array)
  beratungszeiten: [
    { datum: '{{DATUM_1}}', art: '{{ART_1}}', thema: '{{THEMA_1}}', dauer: '{{DAUER_1}}' }
  ]
};

const border = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "2E4057", type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ 
      children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 20 })]
    })]
  });
}

function dataCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    children: [new Paragraph({ 
      children: [new TextRun({ text, font: "Arial", size: 20 })]
    })]
  });
}

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "2E4057" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2E4057" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, right: 1200, bottom: 1440, left: 1200 }
      }
    },
    children: [
      // Titel
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "BERATERBERICHT &", bold: true, size: 28, font: "Arial", color: "2E4057" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: 'Fragebogen "bereichsübergreifende Grundsätze des ESF Plus"', bold: true, size: 22, font: "Arial", color: "2E4057" })]
      }),

      // Berater & Kunde Info Tabelle
      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [4753, 4753],
        rows: [
          new TableRow({ children: [
            new TableCell({
              borders: { top: border, bottom: border, left: border, right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
              width: { size: 4753, type: WidthType.DXA },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({ children: [new TextRun({ text: daten.berater_firma, bold: true, size: 22, font: "Arial" })] }),
                new Paragraph({ children: [new TextRun({ text: daten.berater_name, size: 20, font: "Arial" })] }),
                new Paragraph({ children: [new TextRun({ text: daten.berater_adresse, size: 20, font: "Arial" })] }),
                new Paragraph({ children: [new TextRun({ text: daten.berater_plz_ort, size: 20, font: "Arial" })] }),
                new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: "Berater:", bold: true, size: 20, font: "Arial", color: "666666" })] }),
                new Paragraph({ children: [new TextRun({ text: daten.berater_name, size: 20, font: "Arial" })] }),
              ]
            }),
            new TableCell({
              borders: { top: border, bottom: border, left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, right: border },
              width: { size: 4753, type: WidthType.DXA },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Firma:", bold: true, size: 20, font: "Arial", color: "666666" })] }),
                new Paragraph({ children: [new TextRun({ text: daten.firma, bold: true, size: 22, font: "Arial" })] }),
                new Paragraph({ children: [new TextRun({ text: daten.strasse, size: 20, font: "Arial" })] }),
                new Paragraph({ children: [new TextRun({ text: daten.plz_ort, size: 20, font: "Arial" })] }),
                new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: "Kontakt:", bold: true, size: 20, font: "Arial", color: "666666" })] }),
                new Paragraph({ children: [new TextRun({ text: `Email: ${daten.kontakt_email}`, size: 20, font: "Arial" })] }),
              ]
            })
          ]})
        ]
      }),

      new Paragraph({ spacing: { before: 200 }, children: [] }),

      // Projektdaten
      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [3168, 3168, 3170],
        rows: [
          new TableRow({ children: [
            headerCell("Projektbeginn", 3168),
            headerCell("Projektende", 3168),
            headerCell("Beratertage", 3170),
          ]}),
          new TableRow({ children: [
            dataCell(daten.projektstart, 3168),
            dataCell(daten.projektende, 3168),
            dataCell(`${daten.beratertage} Tage`, 3170),
          ]})
        ]
      }),

      // Beratungszeiten Header
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Beratungszeiten Auflistung")]
      }),
      
      // Beratungszeiten Tabelle
      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [1800, 2200, 3506, 2000],
        rows: [
          new TableRow({ children: [
            headerCell("Datum", 1800),
            headerCell("Art", 2200),
            headerCell("Themen", 3506),
            headerCell("Dauer (Std)", 2000),
          ]}),
          // Platzhalter-Zeile
          new TableRow({ children: [
            dataCell("{{DATUM}}", 1800),
            dataCell("{{ART}}", 2200),
            dataCell("{{THEMA}}", 3506),
            dataCell("{{DAUER}}", 2000),
          ]}),
          // Summen-Zeile
          new TableRow({ children: [
            new TableCell({ borders, width: { size: 1800, type: WidthType.DXA }, margins: cellMargins,
              children: [new Paragraph({ children: [] })] }),
            new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, margins: cellMargins,
              children: [new Paragraph({ children: [] })] }),
            new TableCell({ borders, width: { size: 3506, type: WidthType.DXA }, margins: cellMargins,
              shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "Summe:", bold: true, font: "Arial", size: 20 })] })] }),
            new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, margins: cellMargins,
              shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
              children: [new Paragraph({ 
                children: [new TextRun({ text: `${daten.stunden_gesamt} Std`, bold: true, font: "Arial", size: 20 })] })] }),
          ]})
        ]
      }),

      new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun({ text: `Stunden Insgesamt: ${daten.stunden_gesamt} Std  entspricht: ${daten.beratertage} Tage`, bold: true, size: 22, font: "Arial" })]
      }),

      // Aufgabenstellung
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Aufgabenstellung")] }),
      new Paragraph({ children: [new TextRun({ text: daten.aufgabenstellung, size: 22, font: "Arial" })] }),

      // ESF Plus
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Bereichsübergreifende Grundsätze des ESF Plus")] }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Bei der Umsetzung soll eine Geschlechterparität im Projektteam gewährleistet sein.", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Es finden bevorzugt virtuelle Arbeitstreffen statt. Dienstreisen erfolgen mit dem Zug (ÖPNV).", size: 22, font: "Arial" })]
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Projektmitarbeiter werden zum AGG geschult.", size: 22, font: "Arial" })]
      }),

      // Analyse
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`Analyse, Zusammenfassung der Firma ${daten.firma}`)] }),
      new Paragraph({ children: [new TextRun({ text: "{{ANALYSE_TEXT}}", size: 22, font: "Arial" })] }),

      // Schwachstellen
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`Schwachstellenanalyse der Firma ${daten.firma}`)] }),
      new Paragraph({ children: [new TextRun({ text: "{{SCHWACHSTELLEN_TEXT}}", size: 22, font: "Arial" })] }),

      // Maßnahmen
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Durchgeführte Maßnahmen")] }),
      new Paragraph({ children: [new TextRun({ text: daten.massnahmen, size: 22, font: "Arial" })] }),

      // Unterschriften
      new Paragraph({ spacing: { before: 600 }, children: [] }),
      new Table({
        width: { size: 9506, type: WidthType.DXA },
        columnWidths: [4753, 4753],
        rows: [
          new TableRow({ children: [
            new TableCell({
              borders: { top: { style: BorderStyle.SINGLE, size: 1, color: "000000" }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              width: { size: 4753, type: WidthType.DXA },
              margins: { top: 80, bottom: 0, left: 0, right: 200 },
              children: [
                new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: "Datum, Unterschrift Berater/in", size: 18, font: "Arial", color: "666666" })] }),
                new Paragraph({ children: [new TextRun({ text: daten.berater_name, size: 20, font: "Arial" })] }),
              ]
            }),
            new TableCell({
              borders: { top: { style: BorderStyle.SINGLE, size: 1, color: "000000" }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              width: { size: 4753, type: WidthType.DXA },
              margins: { top: 80, bottom: 0, left: 200, right: 0 },
              children: [
                new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: "Datum, Unterschrift Antragsteller/in", size: 18, font: "Arial", color: "666666" })] }),
                new Paragraph({ children: [new TextRun({ text: "{{ANSPRECHPARTNER}}", size: 20, font: "Arial" })] }),
              ]
            })
          ]})
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/bafa-tool/Projektbericht_Vorlage.docx", buffer);
  console.log("Projektbericht-Vorlage erstellt!");
});
