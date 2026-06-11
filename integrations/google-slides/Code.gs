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
        const txt = shape.getText().asString().trim();
        if (txt) { prompt = txt; break; }
      }
    }
    if (!prompt) continue;

    // Hent speaker notes
    let notes = "";
    const notesPage = slide.getNotesPage();
    for (const shape of notesPage.getShapes()) {
      if (shape.getPlaceholderType() === SlidesApp.PlaceholderType.BODY) {
        notes = shape.getText().asString().trim();
        break;
      }
    }

    const lines = notes.split("\n").map(l => l.trim()).filter(Boolean);
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
