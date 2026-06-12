// Pollinator — Google Slides Add-on
// Indsæt denne kode i Apps Script (Extensions → Apps Script)
//
// Spørgsmålsformat — i speaker notes på hver slide:
//   Linje 1: type  → dilemma  /  skala  /  ordsky
//   Linje 2: optioner (kun dilemma/skala) → Ja, Nej, Ved ikke
//   Linje 3: (kun skala) antal trin, f.eks. 20 eller 100
//
// Slides UDEN en anerkendt type i notes springes over.

const POLLINATOR_URL = "https://pollinator-nine.vercel.app";

// Virker både som bound script og som installeret add-on
function onOpen(e) {
  const ui = SlidesApp.getUi();
  (e && e.authMode !== ScriptApp.AuthMode.NONE
    ? ui.createAddonMenu()
    : ui.createMenu("Pollinator"))
    .addItem("Åbn kontrolpanel", "showSidebar")
    .addToUi();
}

function onInstall(e) { onOpen(e); }

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Pollinator")
    .setWidth(320);
  SlidesApp.getUi().showSidebar(html);
}

// ── Læs spørgsmål fra slides ──────────────────────────────────────────────────

function getSlideQuestions() {
  const presentation = SlidesApp.getActivePresentation();
  const slides = presentation.getSlides();
  const questions = [];

  const typeMap = {
    dilemma: "dilemma", skala: "scale", scale: "scale",
    ordsky: "wordcloud", wordcloud: "wordcloud",
  };

  for (const slide of slides) {
    let prompt = "";
    for (const shape of slide.getShapes()) {
      const pt = shape.getPlaceholderType();
      if (pt === SlidesApp.PlaceholderType.TITLE ||
          pt === SlidesApp.PlaceholderType.CENTERED_TITLE) {
        prompt = shape.getText().asString().trim();
        break;
      }
    }
    if (!prompt) {
      for (const shape of slide.getShapes()) {
        try {
          const txt = shape.getText().asString().trim();
          if (txt) { prompt = txt; break; }
        } catch(e) {}
      }
    }
    if (!prompt) continue;

    let notes = "";
    try {
      const notesPage = slide.getNotesPage();
      const allTexts = notesPage.getShapes().map(shape => {
        try { return shape.getText().asString().trim(); } catch(e) { return ""; }
      }).filter(t => t.length > 0);
      for (const txt of allTexts) {
        const firstLine = txt.split(/[\r\n]+/)[0].trim().toLowerCase();
        if (typeMap[firstLine]) { notes = txt; break; }
      }
      if (!notes) notes = allTexts.reduce((a, b) => b.length > a.length ? b : a, "");
    } catch(e) {}

    const lines = notes.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const type = typeMap[lines[0]?.toLowerCase() || ""];
    if (!type) continue;

    const optRaw = lines[1] || "";
    let options = [];
    let scaleMax = 10;
    if (type === "dilemma") {
      options = optRaw
        ? optRaw.split(",").map(o => o.trim()).filter(Boolean)
        : ["Enig", "Uenig", "Ved ikke"];
      if (options.length < 2) options = ["Enig", "Uenig", "Ved ikke"];
    } else if (type === "scale") {
      const parts = optRaw.split(",").map(o => o.trim());
      options = [parts[0] || "", parts[1] || ""];
      const maxRaw = parseInt(lines[2] || "", 10);
      if (!isNaN(maxRaw) && maxRaw >= 2) scaleMax = maxRaw;
    }

    questions.push({ prompt, type, options, scaleMax });
  }

  return questions;
}

// ── Join-slide ────────────────────────────────────────────────────────────────

function insertJoinSlide(code, sessionTitle) {
  const presentation = SlidesApp.getActivePresentation();
  const joinUrl = POLLINATOR_URL + "/s/" + code;

  const slide = presentation.insertSlide(0, SlidesApp.PredefinedLayout.BLANK);
  slide.getBackground().setSolidFill(17, 19, 25);

  _addText(slide, "SCAN OG DELTAG", 260, 50, 420, 30, 11, true, "#f59e0b");
  _addText(slide, sessionTitle, 260, 85, 420, 50, 20, true, "#ffffff");
  _addText(slide, code, 260, 148, 420, 110, 80, true, "#f59e0b");
  _addText(slide, joinUrl.replace("https://", ""), 260, 268, 420, 32, 13, false, "#8888aa");

  const qrEndpoint = POLLINATOR_URL + "/api/qr?url=" + encodeURIComponent(joinUrl);
  try {
    const resp = UrlFetchApp.fetch(qrEndpoint, { muteHttpExceptions: true });
    if (resp.getResponseCode() === 200) {
      slide.insertImage(resp.getBlob().setName("qr.png").setContentType("image/png"), 30, 60, 210, 210);
    }
  } catch(e) { Logger.log("QR fejl: " + e); }

  return "ok";
}

// ── Resultatslides ────────────────────────────────────────────────────────────

const OPT_COLORS = ["#f59e0b", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb923c"];
const BG         = { r: 17,  g: 19,  b: 25  }; // #111319
const TRACK_HEX  = "#1e2232";

function writeResultsToSlides(resultsJson) {
  const results = JSON.parse(resultsJson);
  const pres    = SlidesApp.getActivePresentation();

  // Separator
  const sep = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  sep.getBackground().setSolidFill(BG.r, BG.g, BG.b);
  _addText(sep, "RESULTATER", 40, 155, 640, 55, 36, true,  "#f59e0b");
  _addText(sep, pres.getName(), 40, 215, 640, 28, 13, false, "#8888aa");

  for (const q of results) {
    const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    slide.getBackground().setSolidFill(BG.r, BG.g, BG.b);

    // Kicker
    _addText(slide, "POLLINATOR", 40, 16, 200, 18, 8, true, "#f59e0b");
    // Spørgsmål
    _addText(slide, q.prompt, 40, 34, 640, 52, 15, true, "#ffffff");
    // Footer
    _addText(slide, q.total + " svar", 40, 375, 200, 18, 9, false, "#666680");

    if (q.type === "dilemma") {
      _renderDilemmaSlide(slide, q);
    } else if (q.type === "scale") {
      _renderScaleSlide(slide, q);
    } else {
      _renderWordcloudSlide(slide, q);
    }
  }

  return "ok";
}

function _renderDilemmaSlide(slide, q) {
  const tally = q.tally || [];
  const rowH  = Math.min(62, Math.floor(230 / Math.max(tally.length, 1)));
  const barH  = 18;

  tally.forEach((item, i) => {
    const pct   = q.total > 0 ? Math.round((item.votes / q.total) * 100) : 0;
    const barW  = Math.round((pct / 100) * 580);
    const color = OPT_COLORS[i % OPT_COLORS.length];
    const y     = 100 + i * rowH;

    _addText(slide, item.label, 40, y, 490, 22, 12, false, "#ccccdd");
    _addText(slide, pct + "%",  540, y, 80,  22, 13, true,  color);
    _addRect(slide, 40, y + 26, 580, barH, TRACK_HEX);
    if (barW > 2) _addRect(slide, 40, y + 26, barW, barH, color);
    if (item.votes > 0) _addText(slide, item.votes + " svar", 44, y + 27, 200, barH, 8, false, "#111319");
  });
}

function _renderScaleSlide(slide, q) {
  const scaleMax = q.scaleMax || 10;

  // Stor gennemsnit
  _addText(slide, (q.average || 0).toFixed(1), 40, 95,  200, 85, 58, true,  "#f59e0b");
  _addText(slide, "gennemsnit",               40, 183, 200, 22, 10, false, "#8888aa");
  _addText(slide, "ud af " + scaleMax,        40, 200, 200, 22, 10, false, "#8888aa");

  if (q.lowLabel)  _addText(slide, "1 = " + q.lowLabel,          40, 230, 200, 20, 10, false, "#aaaacc");
  if (q.highLabel) _addText(slide, scaleMax + " = " + q.highLabel, 40, 248, 200, 20, 10, false, "#aaaacc");

  // Mini-histogram
  const tally       = q.tally || [];
  const display     = tally.length > 20 ? _bucketTally(tally, 10) : tally;
  const maxV        = Math.max(...display.map(t => t.votes), 1);
  const areaW       = 360;
  const areaH       = 200;
  const startX      = 320;
  const startY      = 95;
  const bW          = Math.floor(areaW / display.length) - 2;

  display.forEach((item, i) => {
    const h     = Math.max(3, Math.round((item.votes / maxV) * areaH));
    const x     = startX + i * (bW + 2);
    const color = OPT_COLORS[Math.floor(i / Math.max(display.length / 4, 1)) % OPT_COLORS.length];
    _addRect(slide, x, startY + areaH - h, bW, h, color);
    if (display.length <= 15) {
      _addText(slide, String(item.label ?? item.index), x, startY + areaH + 4, bW + 4, 14, 7, false, "#666680");
    }
  });
}

function _renderWordcloudSlide(slide, q) {
  const words    = (q.words || []).slice(0, 14);
  const maxCount = words[0]?.count || 1;
  let x = 40, y = 100;

  words.forEach((w, i) => {
    const size  = Math.round(11 + (w.count / maxCount) * 24);
    const wPx   = w.word.length * size * 0.58 + 16;
    if (x + wPx > 680) { x = 40; y += size + 20; }
    if (y > 340) return;
    const color = i === 0 ? "#f59e0b" : i < 3 ? "#ffffff" : "#9999bb";
    _addText(slide, w.word, x, y, wPx + 8, size + 12, size, i < 3, color);
    x += wPx + 10;
  });
}

function _bucketTally(tally, buckets) {
  const min  = tally[0].index;
  const max  = tally[tally.length - 1].index;
  const size = Math.ceil((max - min + 1) / buckets);
  const res  = [];
  for (let i = 0; i < buckets; i++) {
    const lo    = min + i * size;
    const hi    = Math.min(max, lo + size - 1);
    if (lo > max) break;
    const votes = tally.filter(t => t.index >= lo && t.index <= hi).reduce((s, t) => s + t.votes, 0);
    res.push({ index: Math.round((lo + hi) / 2), label: lo === hi ? String(lo) : lo + "–" + hi, votes });
  }
  return res;
}

// ── API-proxies via UrlFetchApp ───────────────────────────────────────────────

function apiGet(path) {
  return UrlFetchApp.fetch(POLLINATOR_URL + path, { muteHttpExceptions: true }).getContentText();
}

function apiPost(path, bodyJson) {
  return UrlFetchApp.fetch(POLLINATOR_URL + path, {
    method: "post", contentType: "application/json",
    payload: bodyJson || "{}", muteHttpExceptions: true,
  }).getContentText();
}

function apiPatch(path, bodyJson) {
  return UrlFetchApp.fetch(POLLINATOR_URL + path, {
    method: "patch", contentType: "application/json",
    payload: bodyJson || "{}", muteHttpExceptions: true,
  }).getContentText();
}

function apiDelete(path) {
  return UrlFetchApp.fetch(POLLINATOR_URL + path, {
    method: "delete", muteHttpExceptions: true,
  }).getContentText();
}

// ── Debug ─────────────────────────────────────────────────────────────────────

function debugQR() {
  const testUrl = POLLINATOR_URL + "/s/TEST";
  const qrUrl   = POLLINATOR_URL + "/api/qr?url=" + encodeURIComponent(testUrl);
  try {
    const resp = UrlFetchApp.fetch(qrUrl, { muteHttpExceptions: true });
    const blob = resp.getBlob().setName("qr.png").setContentType("image/png");
    const img  = SlidesApp.getActivePresentation().getSlides()[0].insertImage(blob, 30, 60, 210, 210);
    SlidesApp.getUi().alert("QR OK · HTTP " + resp.getResponseCode() + " · " + resp.getContent().length + " bytes · id: " + img.getObjectId());
  } catch(e) { SlidesApp.getUi().alert("QR FEJL: " + e); }
}

function debugSlides() {
  const presentation = SlidesApp.getActivePresentation();
  const log = [];
  presentation.getSlides().forEach((slide, i) => {
    const slideTexts = slide.getShapes().map(s => {
      try { return `[${s.getPlaceholderType()}] "${s.getText().asString().trim()}"`; } catch(e) { return ""; }
    }).filter(Boolean);
    let notesTexts = [];
    try {
      notesTexts = slide.getNotesPage().getShapes().map(s => {
        try { return `[${s.getPlaceholderType()}] "${s.getText().asString().trim()}"`; } catch(e) { return ""; }
      }).filter(Boolean);
    } catch(e) {}
    log.push(`\n--- Slide ${i+1} ---`);
    log.push("Slide: "  + (slideTexts.join(" | ") || "(ingen)"));
    log.push("Notes: " + (notesTexts.join(" | ") || "(ingen)"));
  });
  Logger.log(log.join("\n"));
  SlidesApp.getUi().alert(log.join("\n"));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _addText(slide, text, x, y, w, h, fontSize, bold, color) {
  const box   = slide.insertTextBox(text, x, y, w, h);
  const style = box.getText().getTextStyle();
  style.setFontSize(fontSize).setBold(bold).setForegroundColor(color);
  box.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
}

function _addRect(slide, x, y, w, h, hexColor) {
  const shape = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  shape.getFill().setSolidFill(r, g, b);
  shape.getBorder().setTransparent();
}
