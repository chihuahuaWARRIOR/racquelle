/* ==============================
   Tennis Racket Finder Quiz App
   ============================== */

// --- Globale Variablen ---
let currentQuestion = 0;
let answers = [];
let questions = [];
let rackets = [];
let playerProfile = {}; // TW/E-Kategorien werden hier gesammelt

/* ==============================
   SPRACHE & INITIALISIERUNG
============================== */

function getLanguage() {
  const saved = localStorage.getItem("language");
  if (saved) return saved;
  const lang = navigator.language || navigator.userLanguage;
  return lang.startsWith("de") ? "de" : "en";
}

async function initApp() {
  await Promise.all([loadQuestions(), loadRackets()]);
  renderProgress();
}

/* ==============================
   LADEN DER QUESTIONS UND RACKETS
============================== */

async function loadQuestions() {
  try {
    const response = await fetch("questions.json", {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const lang = getLanguage();
    questions = data[lang];

    if (!questions || questions.length === 0)
      throw new Error(`Keine Fragen in Sprache "${lang}" gefunden`);

    showQuestion();
  } catch (err) {
    console.error("Fehler beim Laden der Fragen:", err);
    document.getElementById("question").innerText = "Fragen konnten nicht geladen werden 😕";
  }
}

async function loadRackets() {
  try {
    const response = await fetch("rackets.json", {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    rackets = data.rackets;
    console.log(`🎾 ${rackets.length} Rackets geladen.`);
  } catch (err) {
    console.error("Fehler beim Laden der Rackets:", err);
  }
}

/* ==============================
   QUIZ ANZEIGE
============================== */

function showQuestion() {
  if (!questions || questions.length === 0) return;

  if (currentQuestion >= questions.length) {
    showModeSelection(); // Nach der letzten Frage: Modusauswahl
    return;
  }

  const q = questions[currentQuestion];
  document.getElementById("question").innerText = q.q;

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`a${i + 1}`);
    btn.innerText = q.answers[i].text;
  }

  document.getElementById("progress-text").innerText = `Frage ${currentQuestion + 1} von ${questions.length}`;
  renderProgress();
}

/* ==============================
   FORTSCHRITTSANZEIGE
============================== */

function renderProgress() {
  const bar = document.getElementById("progress-bar");
  bar.innerHTML = "";
  for (let i = 0; i < questions.length; i++) {
    const span = document.createElement("span");
    if (i < currentQuestion) span.classList.add("active");
    bar.appendChild(span);
  }
}

/* ==============================
   ANTWORT-LOGIK & PROFIL-BERECHNUNG
============================== */

function selectAnswer(choice) {
  const q = questions[currentQuestion];
  const selected = q.answers[choice];

  // Jede Antwort beeinflusst TW/E-Kategorien (im Fragenobjekt hinterlegt)
  for (const [key, value] of Object.entries(selected.effects)) {
    if (!playerProfile[key]) playerProfile[key] = 0;
    playerProfile[key] += value;
  }

  answers.push(choice);
  currentQuestion++;

  if (currentQuestion < questions.length) {
    showQuestion();
  } else {
    showModeSelection();
  }
}

/* ==============================
   MODUSWAHL (Stärken oder Schwächen)
============================== */

function showModeSelection() {
  const rc = document.getElementById("result-container");
  document.getElementById("question-container").classList.add("hidden");
  document.getElementById("answers-grid").classList.add("hidden");
  rc.classList.remove("hidden");

  rc.innerHTML = `
    <div class="mode-select">
      <h2>Wie soll die Schlägerempfehlung erfolgen?</h2>
      <button onclick="calculateRecommendation('strengths')">💪 Stärken ausbauen</button>
      <button onclick="calculateRecommendation('weaknesses')">⚖️ Schwächen ausgleichen</button>
    </div>
  `;
}

/* ==============================
   RACKET-MATCHING ALGORITHMUS
============================== */

function calculateRecommendation(mode) {
  const racket = findBestRacket(playerProfile, mode);
  showResults(playerProfile, racket);
}

function findBestRacket(profile, mode = "strengths") {
  let best = null;
  let bestScore = Infinity;

  for (const r of rackets) {
    let diff = 0;
    for (const cat of Object.keys(r.stats)) {
      const p = profile[cat] || 5; // Standardwert Mitte
      if (mode === "strengths")
        diff += Math.abs(p - r.stats[cat]);
      else
        diff += Math.abs((10 - p) - r.stats[cat]);
    }
    if (diff < bestScore) {
      bestScore = diff;
      best = r;
    }
  }

  return best;
}

/* ==============================
   SPIELSTIL-ANALYSE
============================== */

function getPlayerStyle(profile) {
  const c = profile;
  const avg = Object.values(c).reduce((a, b) => a + b, 0) / Object.values(c).length;

  const styleScores = {
    Control: (c.Control || 0) + (c.Comfort || 0) - (c.Power || 0),
    Power: (c.Power || 0) + (c.Topspin || 0) - (c.Control || 0),
    Allround: -Math.abs((c.Power || 0) - (c.Control || 0)) + avg,
    Offensive: (c.Power || 0) + (c.Serves || 0) + (c.Volleys || 0),
    Defensive: (c.Control || 0) + (c.Topspin || 0) + (c.Comfort || 0),
    Touch: (c["Touch / Feel"] || 0) + (c.Volleys || 0) + (c.Maneuverability || 0)
  };

  const bestStyle = Object.entries(styleScores).sort((a, b) => b[1] - a[1])[0][0];

  const descriptions = {
    Control: "Du bist ein präziser Spieler, der lieber sicher platziert als mit roher Gewalt punktet. Kontrolle, Stabilität und Technik sind deine größten Stärken.",
    Power: "Du bist ein aggressiver Grundlinienspieler. Du suchst die Initiative, triffst früh und spielst mit viel Druck und Spin.",
    Allround: "Du bist ein vielseitiger Allrounder. Egal ob Offensive oder Defensive – du passt dein Spiel intelligent der Situation an.",
    Offensive: "Du bist ein offensiver All-Court-Spieler. Du suchst aktiv den Punktgewinn, kommst gerne ans Netz und spielst dynamisch.",
    Defensive: "Du bist ein geduldiger Defensivspieler. Du läufst viele Bälle, spielst mit Spin und wartest, bis dein Gegner den Fehler macht.",
    Touch: "Du bist ein gefühlvoller Spieler. Slice, Stopps und Volleys gehören zu deinem Repertoire – du gewinnst lieber mit Finesse als mit Power."
  };

  return { name: bestStyle, text: descriptions[bestStyle] };
}

/* ==============================
   ERGEBNISSE ANZEIGEN
============================== */

function showResults(profile, racket) {
  const style = getPlayerStyle(profile);
  const rc = document.getElementById("result-container");

  rc.innerHTML = `
    <div class="result-card active">
      <h2>${racket.name}</h2>
      <img src="${racket.img}" alt="${racket.name}" />
      <h3>Spielstil: ${style.name}</h3>
      <p>${style.text}</p>

      <div class="matrix">
        ${Object.entries(profile)
          .map(
            ([k, v]) => `
          <div class="matrix-row">
            <span>${k}</span>
            <div class="bar" style="--w:${Math.min(v * 10, 100)}%;"></div>
          </div>`
          )
          .join("")}
      </div>

      <p>Basierend auf deinem Stil empfehlen wir:</p>
      <p><a href="${racket.url}" target="_blank">➡️ ${racket.name} ansehen</a></p>

      <button class="btn-restart" onclick="restartQuiz()">Quiz neu starten</button>
    </div>
  `;

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

/* ==============================
   QUIZ NEU STARTEN
============================== */

function restartQuiz() {
  currentQuestion = 0;
  answers = [];
  playerProfile = {};

  document.getElementById("result-container").innerHTML = "";
  document.getElementById("result-container").classList.add("hidden");

  document.getElementById("question-container").classList.remove("hidden");
  document.getElementById("answers-grid").classList.remove("hidden");

  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";

  showQuestion();
  renderProgress();
}

/* ==============================
   SPRACHUMSCHALTER
============================== */

document.getElementById("lang-de").addEventListener("click", () => switchLang("de"));
document.getElementById("lang-en").addEventListener("click", () => switchLang("en"));

function switchLang(lang) {
  localStorage.setItem("language", lang);
  document.getElementById("lang-de").classList.toggle("active", lang === "de");
  document.getElementById("lang-en").classList.toggle("active", lang === "en");
  loadQuestions();
}

/* ==============================
   INITIAL START
============================== */

document.querySelectorAll(".answer").forEach((btn, i) =>
  btn.addEventListener("click", () => selectAnswer(i))
);

initApp();
