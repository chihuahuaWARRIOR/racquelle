let currentQuestion = 0;
let answers = [];
let questions = [];

// Sprache automatisch erkennen (Deutsch oder Englisch)
function getLanguage() {
  const lang = navigator.language || navigator.userLanguage;
  return lang.startsWith("de") ? "de" : "en";
}

// Fragen laden
async function loadQuestions() {
  try {
    console.log("Fragen werden geladen...");
    const response = await fetch("questions.json", {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const lang = getLanguage();

    // Nutze die passende Sprachsektion (z. B. data.de)
    questions = data[lang];

    if (!questions || questions.length === 0) {
      throw new Error(`Keine Fragen in Sprache "${lang}" gefunden`);
    }

    console.log(`Fragen geladen (${lang}): ${questions.length}`);
    showQuestion();
    renderProgress();
  } catch (error) {
    console.error("Fehler beim Laden der Fragen:", error);
    document.getElementById("question").innerText =
      "Fragen konnten nicht geladen werden 😕";
  }
}

function showQuestion() {
  if (!questions || questions.length === 0) return;

  if (currentQuestion >= questions.length) {
    showResults();
    return;
  }

  const q = questions[currentQuestion];
  document.getElementById("question").innerText = q.q;

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`a${i + 1}`);
    btn.innerText = q.answers[i];
  }

  document.getElementById("progress-text").innerText = `Frage ${
    currentQuestion + 1
  } von ${questions.length}`;
  renderProgress();
}

function renderProgress() {
  const bar = document.getElementById("progress-bar");
  bar.innerHTML = "";
  for (let i = 0; i < questions.length; i++) {
    const span = document.createElement("span");
    if (i < currentQuestion) span.classList.add("active");
    bar.appendChild(span);
  }
}

function selectAnswer(choice) {
  answers.push(choice);
  currentQuestion++;

  if (currentQuestion < questions.length) {
    showQuestion();
  } else {
    showResults();
  }
}

// --- Zeige Auswertung als Overlay (füge in app.js ein / ersetze showResults) ---
function showResults() {
  // Beispiel-Auswertung (du kannst hier später die echte Logik einsetzen)
  const result = {
    racket: "Yonex Ezone 100 (2022)",
    desc: "Ideal für rhythmische Grundlinienspieler: guter Mix aus Komfort und Power.",
    img: "https://www.tenniswarehouse-europe.com/images/descpageRCYONEXH-YE100R.jpg",
    link: "https://www.tenniswarehouse-europe.com/Yonex_EZONE_100_2022/descpageRCYONEXH-YE100R-DE.html"
  };

  // Baue das HTML für das Overlay (result-card)
  const html = `
    <div class="result-card" role="dialog" aria-labelledby="result-title">
      <h2 id="result-title">${escapeHtml(result.racket)}</h2>
      <p>${escapeHtml(result.desc)}</p>
      <img src="${escapeHtml(result.img)}" alt="${escapeHtml(result.racket)}" />
      <p><a href="${escapeHtml(result.link)}" target="_blank" rel="noopener">➡️ Produkt ansehen</a></p>
      <button class="btn-restart" id="btn-restart">Quiz neu starten</button>
    </div>
  `;

  const rc = document.getElementById("result-container");
  if (!rc) {
    console.error("Kein #result-container gefunden.");
    return;
  }

  rc.innerHTML = html;
  // overlay sichtbar machen
  rc.classList.add("active");

  // optional: scroll stoppen im Hintergrund (besseres UX auf Mobil)
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  // Restart-Handler binden
  const restartBtn = document.getElementById("btn-restart");
  if (restartBtn) {
    restartBtn.addEventListener("click", restartQuiz);
  }
}

// --- Restart-Funktion: Overlay schließen + Quiz zurücksetzen ---
function restartQuiz() {
  // close overlay
  const rc = document.getElementById("result-container");
  if (rc) {
    rc.classList.remove("active");
    // optional: leere Inhalt (sauber)
    rc.innerHTML = "";
  }

  // re-enable scrolling
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";

  // reset quiz state (angepasst an deine Variable-Namen)
  currentQuestion = 0;
  answers = [];

  // zeige wieder quiz (falls du elements ausgeblendet hast)
  const quizContainer = document.getElementById("quiz-container");
  if (quizContainer) quizContainer.classList.remove("hidden");

  // falls du #question-container oder #answers-grid versteckt hast, zeige sie
  const qCont = document.getElementById("question-container");
  if (qCont) qCont.classList.remove("hidden");
  const answersGrid = document.getElementById("answers-grid");
  if (answersGrid) answersGrid.classList.remove("hidden");

  // die Progress-Bar resetten
  const prog = document.getElementById("progress-bar");
  if (prog) {
    // entferne alle 'active' Klassen
    const dots = prog.querySelectorAll("span");
    dots.forEach(d => d.classList.remove("active"));
  }

  // render first question again
  if (typeof showQuestion === "function") showQuestion();
  if (typeof renderProgress === "function") renderProgress();
}
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (s) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}


// Event Listener für Buttons
document.querySelectorAll(".answer").forEach((btn, i) =>
  btn.addEventListener("click", () => selectAnswer(i))
);

// Start
loadQuestions();

// Sprache umschalten
document.getElementById("lang-de").addEventListener("click", () => switchLang("de"));
document.getElementById("lang-en").addEventListener("click", () => switchLang("en"));

function switchLang(lang) {
  document.getElementById("lang-de").classList.toggle("active", lang === "de");
  document.getElementById("lang-en").classList.toggle("active", lang === "en");
  localStorage.setItem("language", lang);
  loadQuestions();
}

// Sprachpräferenz merken
const savedLang = localStorage.getItem("language");
if (savedLang) {
  switchLang(savedLang);
} else {
  loadQuestions();
}


