let currentQuestion = 0;
let userProfile = {};
let questions = {};
let rackets = [];
let lang = localStorage.getItem("language") || getLanguage();
const BASE_SCORE = 50; // Neutraler Startwert (entspricht 5 auf einer 0–10-Skala)
const SCALE_FACTOR = 5; // Verstärkung pro Antwortschritt

// === Sprache automatisch erkennen ===
function getLanguage() {
  const navLang = navigator.language || navigator.userLanguage;
  return navLang.startsWith("de") ? "de" : "en";
}

// === Daten laden ===
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
  document.getElementById("question").innerText = q.q;

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
    // Starte bei 50 (entspricht 5 auf einer 0–10 Skala)
    userProfile[key] = (userProfile[key] ?? BASE_SCORE) + (val * SCALE_FACTOR);
    // Begrenze auf 0–100
    userProfile[key] = Math.max(0, Math.min(100, userProfile[key]));
  }
  currentQuestion++;
  showQuestion();
}

// === Ergebnisse anzeigen (mit Overlay) ===
function showResults() {
  const overlay = document.createElement("div");
  overlay.id = "overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(6px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    zIndex: "2000",
    textAlign: "center",
    overflowY: "auto",
    animation: "fadeIn 0.8s ease"
  });

  // Werte auf 0–10 umrechnen (Anzeige)
  const normalizedProfile = {};
  for (const [key, val] of Object.entries(userProfile)) {
    normalizedProfile[key] = Math.round(val / 10);
  }

  const bestRacket = findBestRacket(normalizedProfile);
  const styleDesc = getPlayStyleDescription(normalizedProfile);

  const matrix = Object.entries(normalizedProfile)
    .map(([key, val]) => `<tr><td>${key}</td><td>${val}</td></tr>`)
    .join("");

  overlay.innerHTML = `
    <div class="result-card" style="max-width: 600px; width: 90%; background: rgba(255,255,255,0.7); border-radius: 20px; padding: 2rem; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
      <h2 style="margin-bottom:1rem;">🎾 ${lang === "de" ? "Deine Schlägerempfehlung" : "Your Racket Recommendation"}</h2>
      <img src="${bestRacket.img}" alt="${bestRacket.name}" style="max-width:180px; border-radius:10px; margin-bottom:1rem;">
      <h3>${bestRacket.name}</h3>
      <p><a href="${bestRacket.url}" target="_blank">➡️ ${lang === "de" ? "Mehr erfahren" : "Learn more"}</a></p>
      <hr style="margin: 1.5rem 0;">
      <h3>${lang === "de" ? "Spielstil" : "Play Style"}</h3>
      <p>${styleDesc}</p>
      <hr style="margin: 1.5rem 0;">
      <h3>${lang === "de" ? "Dein Spielerprofil (0–10)" : "Your Player Profile (0–10)"}</h3>
      <table style="margin:auto; border-collapse: collapse;">
        ${matrix}
      </table>
      <button onclick="restartQuiz()" style="margin-top:2rem; background:black; color:white; padding:0.8rem 1.5rem; border:none; border-radius:12px; font-weight:bold;">
        ${lang === "de" ? "Quiz neu starten" : "Restart Quiz"}
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
}

// === Spielstilbeschreibung ===
function getPlayStyleDescription(profile) {
  const power = profile.Power || 0;
  const control = profile.Control || 0;
  const comfort = profile.Comfort || 0;
  const maneuver = profile.Maneuverability || 0;

  if (power > control && maneuver > comfort) {
    return lang === "de"
      ? "Du bist ein aggressiver Baseliner, der Druck von der Grundlinie aus aufbaut und das Tempo bestimmt."
      : "You're an aggressive baseliner who dictates play from the back of the court.";
  } else if (control > power && comfort > maneuver) {
    return lang === "de"
      ? "Du bist ein Allround-Spieler, der Präzision und Gefühl bevorzugt und in jeder Situation Lösungen findet."
      : "You're an all-court player valuing precision and touch, adapting to any situation.";
  } else if (comfort > 7) {
    return lang === "de"
      ? "Du spielst kontrolliert und effizient, achtest auf Armschonung und Konstanz."
      : "You play with control and efficiency, focusing on comfort and consistency.";
  } else {
    return lang === "de"
      ? "Du bist ein ausgewogener Spieler mit soliden Grundlagen und vielseitigem Spielstil."
      : "You're a balanced player with a solid, versatile game.";
  }
}

// === Schlägervergleich ===
function findBestRacket(profile) {
  let best = null;
  let bestScore = Infinity;
  for (const r of rackets) {
    let diff = 0;
    for (const cat of Object.keys(r.stats)) {
      const p = profile[cat] || 0;
      diff += Math.abs(p - r.stats[cat]);
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
    left: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "38px",
    height: "38px",
    background: "rgba(255,255,255,0.6)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
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

// === Quiz neustarten ===
function restartQuiz() {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.remove();
  currentQuestion = 0;
  userProfile = {};
  showQuestion();
  renderProgress();
}

// === Init ===
loadData();
