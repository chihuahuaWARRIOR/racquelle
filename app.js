let currentQuestion = 0;
let userProfile = {};
let questions = {};
let rackets = [];
let lang = localStorage.getItem("language") || getLanguage();

// === Sprache automatisch erkennen ===
function getLanguage() {
  const navLang = navigator.language || navigator.userLanguage;
  return navLang.startsWith("de") ? "de" : "en";
}

// === Fragen & Schläger laden ===
async function loadData() {
  try {
    const [qRes, rRes] = await Promise.all([
      fetch("questions.json", { cache: "no-store" }),
      fetch("rackets.json", { cache: "no-store" })
    ]);
    const qData = await qRes.json();
    const rData = await rRes.json();
    questions = qData;
    rackets = rData;
    showQuestion();
    renderProgress();
    createBackButton();
  } catch (err) {
    console.error("Fehler beim Laden:", err);
    document.getElementById("question").innerText = "Fehler beim Laden 😕";
  }
}

// === Frage anzeigen ===
function showQuestion() {
  const qList = questions[lang];
  if (!qList || qList.length === 0) return;

  if (currentQuestion >= qList.length) {
    showResults();
    return;
  }

  const q = qList[currentQuestion];
  document.getElementById("question").innerText = q.question;

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`a${i + 1}`);
    const answer = q.answers[i];
    btn.innerText = answer.text;
    btn.onclick = () => selectAnswer(answer.effects);
  }

  document.getElementById("progress-text").innerText =
    (lang === "de")
      ? `Frage ${currentQuestion + 1} von ${qList.length}`
      : `Question ${currentQuestion + 1} of ${qList.length}`;
  renderProgress();
}

// === Fortschrittsanzeige ===
function renderProgress() {
  const bar = document.getElementById("progress-bar");
  const qList = questions[lang] || [];
  bar.innerHTML = "";
  for (let i = 0; i < qList.length; i++) {
    const span = document.createElement("span");
    if (i < currentQuestion) span.classList.add("active");
    if (i === currentQuestion) span.style.background = "#000";
    bar.appendChild(span);
  }
}

// === Antwort speichern ===
function selectAnswer(effects) {
  for (const [key, val] of Object.entries(effects)) {
    userProfile[key] = (userProfile[key] || 0) + val;
  }
  currentQuestion++;
  showQuestion();
}

// === Ergebnisse anzeigen ===
function showResults() {
  const rc = document.getElementById("result-container");
  const quiz = document.getElementById("quiz-container");
  quiz.classList.add("hidden");
  rc.classList.add("active");

  const bestRacket = findBestRacket(userProfile);
  rc.innerHTML = `
    <div class="result-card">
      <h2>${bestRacket.name}</h2>
      <img src="${bestRacket.img}" alt="${bestRacket.name}" />
      <p>${lang === "de" ? "Basierend auf deinen Antworten empfehlen wir:" : "Based on your answers we recommend:"}</p>
      <p><a href="${bestRacket.url}" target="_blank">➡️ ${bestRacket.name}</a></p>
      <button class="btn-restart" onclick="restartQuiz()">${lang === "de" ? "Quiz neu starten" : "Restart Quiz"}</button>
    </div>
  `;
}

// === Quiz zurücksetzen ===
function restartQuiz() {
  document.getElementById("result-container").classList.remove("active");
  document.getElementById("quiz-container").classList.remove("hidden");
  currentQuestion = 0;
  userProfile = {};
  showQuestion();
  renderProgress();
}

// === Schläger-Vergleich ===
function findBestRacket(profile) {
  let best = null;
  let bestScore = Infinity;
  for (const r of rackets) {
    let diff = 0;
    for (const cat of Object.keys(r.stats)) {
      const p = profile[cat] || 0;
      diff += Math.abs((p * 10) - (r.stats[cat] * 10));
    }
    if (diff < bestScore) {
      bestScore = diff;
      best = r;
    }
  }
  return best || rackets[0];
}

// === Zurück-Button ===
function createBackButton() {
  const btn = document.createElement("div");
  btn.id = "back-button";
  btn.innerHTML = "&#8592;";
  Object.assign(btn.style, {
    position: "fixed",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "40px",
    height: "40px",
    background: "rgba(255,255,255,0.6)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.3rem",
    fontWeight: "bold",
    cursor: "pointer",
    userSelect: "none",
    zIndex: "1000",
    backdropFilter: "blur(4px)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
  });
  btn.onclick = () => goBack();
  document.body.appendChild(btn);
}

function goBack() {
  if (currentQuestion > 0) {
    currentQuestion--;
    showQuestion();
  }
}

// === Sprache wechseln ===
function switchLang(newLang) {
  lang = newLang;
  localStorage.setItem("language", newLang);
  currentQuestion = 0;
  userProfile = {};
  showQuestion();
  renderProgress();
}

// === Init ===
loadData();
