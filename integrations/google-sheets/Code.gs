// Pollinator — Google Sheets Add-on
// Indsæt denne kode i Apps Script (Extensions → Apps Script)

const POLLINATOR_URL = "https://pollinator.hansendjurhuus.dk";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Pollinator")
    .addItem("Åbn kontrolpanel", "showSidebar")
    .addToUi();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Pollinator")
    .setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

// Læser spørgsmål fra det aktive ark
// Format: Kolonne A = prompt, B = type (dilemma/skala/ordsky/tekst/rangering), C = optioner (kommasepareret, ikke ordsky/tekst)
function getSheetQuestions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];

  const data = sheet.getRange(1, 1, lastRow, 3).getValues();
  const questions = [];

  for (const row of data) {
    const prompt = String(row[0] || "").trim();
    if (!prompt) continue;

    const typeDk = String(row[1] || "").trim().toLowerCase();
    const optRaw = String(row[2] || "").trim();

    const typeMap = {
      dilemma: "dilemma", skala: "scale", scale: "scale",
      ordsky: "wordcloud", wordcloud: "wordcloud",
      tekst: "text", fritekst: "text", text: "text",
      rangering: "ranking", ranking: "ranking",
    };
    const type = typeMap[typeDk] || "dilemma";

    let options = [];
    if (type === "dilemma") {
      options = optRaw
        ? optRaw.split(",").map(o => o.trim()).filter(Boolean)
        : ["Enig", "Uenig", "Ved ikke"];
      if (options.length < 2) options = ["Enig", "Uenig", "Ved ikke"];
    } else if (type === "ranking") {
      options = optRaw
        ? optRaw.split(",").map(o => o.trim()).filter(Boolean)
        : ["Emne 1", "Emne 2", "Emne 3"];
      if (options.length < 2) options = ["Emne 1", "Emne 2", "Emne 3"];
    } else if (type === "scale") {
      const parts = optRaw.split(",").map(o => o.trim());
      options = [parts[0] || "Slet ikke", parts[1] || "Fuldstændig"];
    }

    questions.push({ prompt, type, options });
  }

  return questions;
}

// Skriver resultater til en ny fane "Resultater"
function writeResults(resultsJson) {
  const results = JSON.parse(resultsJson);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName("Resultater");
  if (sheet) {
    sheet.clearContents();
    sheet.clearFormats();
  } else {
    sheet = ss.insertSheet("Resultater");
  }

  const rows = [["Spørgsmål", "Type", "Svar", "Stemmer", "Procent"]];

  for (const q of results) {
    if (q.type === "scale") {
      rows.push([q.prompt, "Skala", "Gennemsnit", q.average ? q.average.toFixed(1) : "-", ""]);
      for (const item of (q.tally || [])) {
        const pct = q.total > 0 ? Math.round((item.votes / q.total) * 100) : 0;
        rows.push(["", "", String(item.index), item.votes, pct + "%"]);
      }
    } else if (q.type === "dilemma") {
      let first = true;
      for (const item of (q.tally || [])) {
        const pct = q.total > 0 ? Math.round((item.votes / q.total) * 100) : 0;
        rows.push([first ? q.prompt : "", first ? "Dilemma" : "", item.label, item.votes, pct + "%"]);
        first = false;
      }
    } else if (q.type === "ranking") {
      let first = true;
      for (const item of (q.ranking || [])) {
        rows.push([first ? q.prompt : "", first ? "Rangering" : "", item.label, item.points, ""]);
        first = false;
      }
    } else if (q.type === "text") {
      let first = true;
      for (const item of (q.textAnswers || [])) {
        rows.push([first ? q.prompt : "", first ? "Fritekst" : "", item.answer, "", ""]);
        first = false;
      }
    } else {
      const wordsStr = (q.words || []).map(w => `${w.word} (${w.count})`).join(", ");
      rows.push([q.prompt, "Ordsky", wordsStr, q.total || 0, ""]);
    }
    rows.push(["", "", "", "", ""]);
  }

  sheet.getRange(1, 1, rows.length, 5).setValues(rows);
  sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f0f0f0");
  sheet.autoResizeColumns(1, 5);
  ss.setActiveSheet(sheet);

  return "ok";
}
