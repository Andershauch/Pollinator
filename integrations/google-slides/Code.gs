// Pollinator — Google Slides Add-on
// Indsæt denne kode i Apps Script (Extensions → Apps Script)
//
// Spørgsmålsformat — i speaker notes på hver slide:
//   Linje 1: type  → dilemma  /  skala  /  ordsky
//   Linje 2: optioner (kun dilemma/skala) → Ja, Nej, Ved ikke
//
// Slides UDEN en anerkendt type i notes springes over (kan bruges til
// intro-slides, agenda-slides osv.)

const POLLINATOR_URL = "https://pollinator-nine.vercel.app";

function onOpen() {
  SlidesApp.getUi()
    .createMenu("Pollinator")
    .addItem("Åbn kontrolpanel", "showSidebar")
    .addToUi();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Pollinator")
    .setWidth(320);
  SlidesApp.getUi().showSidebar(html);
}

// Læser spørgsmål fra præsentationens slides.
// Kun slides med en gyldig type i speaker notes medtages.
function getSlideQuestions() {
  const presentation = SlidesApp.getActivePresentation();
  const slides = presentation.getSlides();
  const questions = [];

  const typeMap = {
    dilemma: "dilemma", skala: "scale", scale: "scale",
    ordsky: "wordcloud", wordcloud: "wordcloud",
  };

  for (const slide of slides) {
    // Hent slide-titel (første TITLE- eller CENTERED_TITLE-placeholder)
    let prompt = "";
    for (const shape of slide.getShapes()) {
      const pt = shape.getPlaceholderType();
      if (pt === SlidesApp.PlaceholderType.TITLE ||
          pt === SlidesApp.PlaceholderType.CENTERED_TITLE) {
        prompt = shape.getText().asString().trim();
        break;
      }
    }
    // Fallback: første tekstbox med indhold
    if (!prompt) {
      for (const shape of slide.getShapes()) {
        try {
          const txt = shape.getText().asString().trim();
          if (txt) { prompt = txt; break; }
        } catch(e) {}
      }
    }
    if (!prompt) continue;

    // Hent speaker notes — robust: leder i alle shapes på notes-siden
    // og finder den der indeholder et gyldigt type-nøgleord
    let notes = "";
    try {
      const notesPage = slide.getNotesPage();
      const allTexts = notesPage.getShapes().map(shape => {
        try { return shape.getText().asString().trim(); } catch(e) { return ""; }
      }).filter(t => t.length > 0);

      // Prioriter: find den shape hvis første linje er et typeord
      for (const txt of allTexts) {
        const firstLine = txt.split(/[\r\n]+/)[0].trim().toLowerCase();
        if (typeMap[firstLine]) { notes = txt; break; }
      }
      // Fallback: tag den længste tekst (typisk den rigtige notes-box)
      if (!notes) {
        notes = allTexts.reduce((a, b) => b.length > a.length ? b : a, "");
      }
    } catch(e) {}

    const lines = notes.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const type = typeMap[lines[0]?.toLowerCase() || ""];
    if (!type) continue; // Ingen gyldig type → spring over

    const optRaw = lines[1] || "";
    let options = [];
    if (type === "dilemma") {
      options = optRaw
        ? optRaw.split(",").map(o => o.trim()).filter(Boolean)
        : ["Enig", "Uenig", "Ved ikke"];
      if (options.length < 2) options = ["Enig", "Uenig", "Ved ikke"];
    } else if (type === "scale") {
      const parts = optRaw.split(",").map(o => o.trim());
      options = [parts[0] || "Slet ikke", parts[1] || "Fuldstændig"];
    }

    questions.push({ prompt, type, options });
  }

  return questions;
}

// ── Join-slide ────────────────────────────────────────────────────────────────

// Indsætter en deltager-slide som slide 1 i præsentationen
function insertJoinSlide(code, sessionTitle) {
  const presentation = SlidesApp.getActivePresentation();
  const joinUrl = POLLINATOR_URL + "/s/" + code;
  const qrUrl = "https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl="
    + encodeURIComponent(joinUrl) + "&choe=UTF-8&chld=M|1";

  const slide = presentation.insertSlide(0, SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(17, 19, 25); // #111319

  // Kicker
  _addText(slide, "SCAN OG DELTAG", 260, 50, 420, 30, 11, true, "#f59e0b");

  // Workshop-titel
  _addText(slide, sessionTitle, 260, 85, 420, 50, 20, true, "#ffffff");

  // Stor kode
  _addText(slide, code, 260, 148, 420, 110, 80, true, "#f59e0b");

  // URL
  _addText(slide, joinUrl.replace("https://", ""), 260, 268, 420, 32, 13, false, "#8888aa");

  // QR-kode billede — prøv to APIs og indsæt som blob
  const qrApis = [
    "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(joinUrl),
    "https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl=" + encodeURIComponent(joinUrl) + "&choe=UTF-8",
  ];
  let qrInserted = false;
  for (const url of qrApis) {
    try {
      const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      Logger.log("QR API " + url + " → " + resp.getResponseCode());
      if (resp.getResponseCode() === 200) {
        const blob = resp.getBlob().setName("qr.png").setContentType("image/png");
        slide.insertImage(blob, 30, 60, 210, 210);
        qrInserted = true;
        break;
      }
    } catch (e) {
      Logger.log("QR fejl: " + e);
    }
  }
  if (!qrInserted) {
    _addText(slide, joinUrl.replace("https://", ""), 30, 130, 210, 80, 10, false, "#8888aa");
  }

  return "ok";
}

// ── API-proxy via UrlFetchApp (undgår CORS-begrænsninger i sidebar) ──────────

function apiGet(path) {
  const res = UrlFetchApp.fetch(POLLINATOR_URL + path, {
    muteHttpExceptions: true,
  });
  return res.getContentText();
}

function apiPost(path, bodyJson) {
  const res = UrlFetchApp.fetch(POLLINATOR_URL + path, {
    method: "post",
    contentType: "application/json",
    payload: bodyJson || "{}",
    muteHttpExceptions: true,
  });
  return res.getContentText();
}

function apiPatch(path, bodyJson) {
  const res = UrlFetchApp.fetch(POLLINATOR_URL + path, {
    method: "patch",
    contentType: "application/json",
    payload: bodyJson || "{}",
    muteHttpExceptions: true,
  });
  return res.getContentText();
}

// Køres manuelt fra Apps Script-editoren for at diagnosticere QR-indsættelse
function debugQR() {
  const testUrl = POLLINATOR_URL + "/s/TEST";
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(testUrl);
  try {
    const resp = UrlFetchApp.fetch(qrUrl, { muteHttpExceptions: true });
    const code = resp.getResponseCode();
    const type = resp.getHeaders()["Content-Type"] || "(ingen)";
    const len  = resp.getContent().length;
    const blob = resp.getBlob().setName("qr.png").setContentType("image/png");

    const slide = SlidesApp.getActivePresentation().getSlides()[0];
    const img = slide.insertImage(blob, 30, 60, 210, 210);

    SlidesApp.getUi().alert(
      "QR debug OK\n\nHTTP: " + code +
      "\nContent-Type: " + type +
      "\nBytes: " + len +
      "\nBillede id: " + img.getObjectId()
    );
  } catch(e) {
    SlidesApp.getUi().alert("QR debug FEJL:\n" + e);
  }
}

// Køres manuelt fra Apps Script-editoren for at se hvad der læses fra slides
function debugSlides() {
  const presentation = SlidesApp.getActivePresentation();
  const slides = presentation.getSlides();
  const log = [];

  slides.forEach((slide, i) => {
    const shapes = slide.getShapes();
    const slideTexts = shapes.map(s => {
      try { return `[${s.getPlaceholderType()}] "${s.getText().asString().trim()}"`; } catch(e) { return ""; }
    }).filter(Boolean);

    let notesTexts = [];
    try {
      notesTexts = slide.getNotesPage().getShapes().map(s => {
        try { return `[${s.getPlaceholderType()}] "${s.getText().asString().trim()}"`; } catch(e) { return ""; }
      }).filter(Boolean);
    } catch(e) {}

    log.push(`\n--- Slide ${i+1} ---`);
    log.push("Slide shapes: " + (slideTexts.join(" | ") || "(ingen)"));
    log.push("Notes shapes: " + (notesTexts.join(" | ") || "(ingen)"));
  });

  Logger.log(log.join("\n"));
  SpreadsheetApp.getUi && SpreadsheetApp.getUi().alert(log.join("\n"));
  SlidesApp.getUi().alert(log.join("\n"));
}

// Tilføjer en resultatslide for hvert spørgsmål til sidst i præsentationen
function writeResultsToSlides(resultsJson) {
  const results = JSON.parse(resultsJson);
  const presentation = SlidesApp.getActivePresentation();

  // Separator-slide
  const sep = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  _addText(sep, "RESULTATER", 50, 180, 620, 60, 28, true, "#f59e0b");

  for (const q of results) {
    const slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);

    // Spørgsmålstitel
    _addText(slide, q.prompt, 40, 30, 640, 70, 18, true, "#1c1c1e");

    let y = 115;

    if (q.type === "dilemma") {
      for (const item of (q.tally || [])) {
        const pct = q.total > 0 ? Math.round((item.votes / q.total) * 100) : 0;
        _addText(slide, `${item.label}`, 40, y, 380, 28, 14, true, "#1c1c1e");
        _addText(slide, `${pct}%  (${item.votes} svar)`, 430, y, 200, 28, 14, false, "#666666");
        y += 34;
      }
    } else if (q.type === "scale") {
      _addText(slide, (q.average || 0).toFixed(1), 40, y, 200, 72, 56, true, "#60a5fa");
      _addText(slide, "gennemsnit ud af 10", 40, y + 72, 300, 30, 13, false, "#888888");
    } else {
      const words = (q.words || []).slice(0, 8).map(w => `${w.word} (${w.count})`).join("   ·   ");
      _addText(slide, words || "Ingen ord", 40, y, 640, 80, 14, false, "#1c1c1e");
    }

    // Antal svar
    _addText(slide, `${q.total} svar i alt`, 40, 340, 300, 28, 11, false, "#aaaaaa");
  }

  return "ok";
}

function _addText(slide, text, x, y, w, h, fontSize, bold, color) {
  const box = slide.insertTextBox(text, x, y, w, h);
  const style = box.getText().getTextStyle();
  style.setFontSize(fontSize).setBold(bold).setForegroundColor(color);
  box.getText().getParagraphStyle().setParagraphAlignment(
    SlidesApp.ParagraphAlignment.START
  );
}
