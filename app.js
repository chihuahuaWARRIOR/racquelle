let currentQuestion = 0;
let userProfile = {};
let questions = {};
let rackets = [];
let lang = localStorage.getItem("language") || getLanguage();
const BASE_SCORE = 50;
const SCALE_FACTOR = 5;
let matchMode = "strength"; // "strength" oder "weakness"

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
    userProfile[key] = (userProfile[key] ?? BASE_SCORE) + (val * SCALE_FACTOR);
    userProfile[key] = Math.max(0, Math.min(100, userProfile[key]));
  }
  currentQuestion++;
  showQuestion();
}

// === Ergebnisse anzeigen ===
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
    padding: "3rem",
    zIndex: "2000",
    textAlign: "center",
    overflowY: "auto",
    animation: "fadeIn 0.8s ease"
  });

  const normalizedProfile = {};
  for (const [key, val] of Object.entries(userProfile)) {
    normalizedProfile[key] = Math.round(val) / 10;
  }

  const { bestRackets } = getTopRackets(normalizedProfile, matchMode);
  const bestRacket = bestRackets[0];
  const styleDesc = getPlayStyleDescription(normalizedProfile);

  const mainContent = `
    <h2 style="margin-bottom:1.5rem; font-size:1.8rem;">${lang === "de" ? "Deine Schlägerempfehlung" : "Your Racket Recommendation"}</h2>
    <div id="matchModeBtns" style="margin-bottom:2rem; display:flex; justify-content:center; gap:1rem;">
      <button onclick="switchMatchMode('strength')" style="flex:1; max-width:220px; padding:1rem 1.5rem; border:none; border-radius:15px; font-size:1.1rem; font-weight:bold; ${matchMode==='strength'?'background:black;color:white;':'background:white;color:black;box-shadow:0 0 5px rgba(0,0,0,0.2);'}">
        ${lang === "de" ? "Stärken verbessern" : "Enhance strengths"}
      </button>
      <button onclick="switchMatchMode('weakness')" style="flex:1; max-width:220px; padding:1rem 1.5rem; border:none; border-radius:15px; font-size:1.1rem; font-weight:bold; ${matchMode==='weakness'?'background:black;color:white;':'background:white;color:black;box-shadow:0 0 5px rgba(0,0,0,0.2);'}">
        ${lang === "de" ? "Schwächen ausgleichen" : "Balance weaknesses"}
      </button>
    </div>

    <div class="result-card" style="max-width:1000px; width:95%; background:rgba(255,255,255,0.7); border-radius:25px; padding:2rem; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
      <div style="display:flex; justify-content:center; gap:2rem; flex-wrap:wrap;">
        ${bestRackets.map((r, i) => `
          <div onclick="updateRacketDisplay(${i})" style="cursor:pointer; flex:1; min-width:200px; max-width:260px; padding:1rem; border:${i===0?'2px solid black':'1px solid #ccc'}; border-radius:15px; background:${i===0?'rgba(0,0,0,0.05)':'white'};">
            <img src="${r.img}" alt="${r.name}" style="width:100%; border-radius:10px;">
            <h4 style="margin-top:0.5rem;">${r.name}</h4>
            <p style="font-size:0.9rem;"><a href="${r.url}" target="_blank">${lang === "de" ? "Mehr erfahren" : "Learn more"}</a></p>
          </div>
        `).join("")}
      </div>

      <hr style="margin:2rem 0;">

      <h3 style="margin-bottom:1rem;">${lang === "de" ? "Profilvergleich (0–10)" : "Profile Comparison (0–10)"}</h3>
      <table id="profile-table" style="margin:auto; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:6px 12px;">${lang === "de" ? "Dein Spielerprofil" : "Your Player Profile"}</th>
            <th></th>
            <th style="text-align:left; padding:6px 12px;">${lang === "de" ? "Schlägerprofil" : "Racket Profile"}</th>
          </tr>
        </thead>
        <tbody>
          ${buildProfileTable(normalizedProfile, bestRacket.stats)}
        </tbody>
      </table>

      <hr style="margin:2rem 0;">
      <h3>${lang === "de" ? "Spielstil" : "Play Style"}</h3>
      <p>${styleDesc}</p>

      <button onclick="restartQuiz()" style="margin-top:2rem; background:black; color:white; padding:0.9rem 1.6rem; border:none; border-radius:12px; font-weight:bold;">
        ${lang === "de" ? "Quiz neu starten" : "Restart Quiz"}
      </button>
    </div>
  `;

  overlay.innerHTML = mainContent;
  document.body.appendChild(overlay);
}

// === Profilvergleich-Tabelle ===
function buildProfileTable(player, racketStats) {
  return Object.entries(player)
    .map(([key, val]) => `
      <tr>
        <td style="padding:6px 12px;">${key}</td>
        <td style="padding:6px 12px;">${val.toFixed(1)}</td>
        <td style="padding:6px 12px;">${racketStats[key]?.toFixed(1) ?? '-'}</td>
      </tr>
    `)
    .join("");
}

// === Anzeige wechseln bei anderem Schläger ===
function updateRacketDisplay(index) {
  const { bestRackets } = getTopRackets(normalizedProfileFromUser(), matchMode);
  const racket = bestRackets[index];
  document.querySelectorAll(".result-card div[onclick]").forEach((el, i) => {
    el.style.border = i === index ? "2px solid black" : "1px solid #ccc";
    el.style.background = i === index ? "rgba(0,0,0,0.05)" : "white";
  });
  document.getElementById("profile-table").innerHTML = `
    <thead>
      <tr>
        <th style="text-align:left; padding:6px 12px;">${lang === "de" ? "Dein Spielerprofil" : "Your Player Profile"}</th>
        <th></th>
        <th style="text-align:left; padding:6px 12px;">${lang === "de" ? "Schlägerprofil" : "Racket Profile"}</th>
      </tr>
    </thead>
    <tbody>
      ${buildProfileTable(normalizedProfileFromUser(), racket.stats)}
    </tbody>
  `;
}

// === Hilfsfunktion für aktuelles Profil ===
function normalizedProfileFromUser() {
  const profile = {};
  for (const [k, v] of Object.entries(userProfile)) profile[k] = Math.round(v) / 10;
  return profile;
}

// === Matchmodus wechseln ===
function switchMatchMode(mode) {
  matchMode = mode;
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.remove();
  showResults();
}

// === Schlägervergleich ===
function getTopRackets(profile, mode) {
  const scores = rackets.map(r => {
    let diff = 0;
    for (const cat of Object.keys(r.stats)) {
      const playerVal = profile[cat] ?? 0;
      const racketVal = r.stats[cat] ?? 0;
      const target = mode === "weakness" ? (10 - playerVal) : playerVal;
      diff += Math.abs(target - racketVal);
    }
    return { racket: r, score: diff };
  });
  scores.sort((a, b) => a.score - b.score);
  return { bestRackets: scores.slice(0, 3).map(s => s.racket) };
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
