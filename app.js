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
  const navLang = navigator.language || navigator.userLanguage || "de";
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
    attachLangSwitchHandlers();
    createImpressumHook();
  } catch (err) {
    console.error("Fehler beim Laden:", err);
    const qEl = document.getElementById("question");
    if (qEl) qEl.innerText = "Fehler beim Laden 😕";
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
  const qEl = document.getElementById("question");
  if (qEl) qEl.innerText = q.q;
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`a${i + 1}`);
    const answer = q.answers[i];
    if (btn && answer) {
      btn.innerText = answer.text;
      btn.onclick = () => selectAnswer(answer.effects);
    }
  }
  const pText = document.getElementById("progress-text");
  if (pText) {
    pText.innerText =
      lang === "de"
        ? `Frage ${currentQuestion + 1} von ${qList.length}`
        : `Question ${currentQuestion + 1} of ${qList.length}`;
  }
  renderProgress();
}

// === Fortschrittsanzeige ===
function renderProgress() {
  const bar = document.getElementById("progress-bar");
  const qList = questions[lang] || [];
  if (!bar) return;
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
  const existing = document.getElementById("overlay");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px 60px",
    zIndex: "3000",
    overflowY: "auto",
  });

  const normalizedProfile = {};
  for (const [key, val] of Object.entries(userProfile)) {
    normalizedProfile[key] = Math.round((val / 10) * 10) / 10;
  }

  const { bestRackets } = getTopRackets(normalizedProfile, matchMode);
  const best = bestRackets[0];
  const second = bestRackets[1];
  const third = bestRackets[2];

  const styleDesc = getPlayStyleDescription(normalizedProfile);
  const playStyleText = `<strong>${lang === "de" ? "Spielstil:" : "Play style:"}</strong> ${styleDesc}`;

  const card = document.createElement("div");
  Object.assign(card.style, {
    width: "min(1200px, 98%)",
    borderRadius: "18px",
    background: "#fff",
    padding: "22px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    maxHeight: "90vh",
    overflowY: "auto",
  });

  const headerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
      <div style="flex:1; min-width:280px;">
        <h2 style="margin:0 0 6px 0; font-size:1.6rem;">Your Game. <b>YourRacket.</b></h2>
        <p style="margin:0; color:#444;">
          ${lang === "de" ? "Möchtest du" : "Would you like to"} 
          <span style="font-weight:700; color:#2ea44f;">${lang === "de" ? "Deine Stärken ausbauen" : "to enhance your strengths"}</span>
          ${lang === "de" ? "oder" : "or"} 
          <span style="font-weight:700; color:#c92a2a;">${lang === "de" ? "Schwächen ausgleichen" : "to balance weaknesses"}</span>?
        </p>
      </div>
      <div style="display:flex; gap:10px; align-items:center; justify-content:flex-end; flex-wrap:wrap;">
        <button id="mode-strength" style="min-width:150px; padding:10px 14px; border-radius:10px; border:none; cursor:pointer; font-weight:700;">
          ${lang === "de" ? "Stärken ausbauen" : "Enhance strengths"}
        </button>
        <button id="mode-weakness" style="min-width:150px; padding:10px 14px; border-radius:10px; border:none; cursor:pointer; font-weight:700;">
          ${lang === "de" ? "Schwächen ausgleichen" : "Balance weaknesses"}
        </button>
      </div>
    </div>
    <hr style="margin:14px 0;">
  `;
  card.innerHTML = headerHTML;

  const btnStrength = card.querySelector("#mode-strength");
  const btnWeakness = card.querySelector("#mode-weakness");
  const green = "#2ea44f";
  const red = "#c92a2a";
  if (btnStrength && btnWeakness) {
    btnStrength.style.background = matchMode === "strength" ? green : "#f3f3f3";
    btnStrength.style.color = matchMode === "strength" ? "#fff" : "#000";
    btnWeakness.style.background = matchMode === "weakness" ? red : "#f3f3f3";
    btnWeakness.style.color = matchMode === "weakness" ? "#fff" : "#000";
    btnStrength.onclick = () => { matchMode = "strength"; refreshOverlay(); };
    btnWeakness.onclick = () => { matchMode = "weakness"; refreshOverlay(); };
  }

  const topRow = document.createElement("div");
  Object.assign(topRow.style, {
    display: "flex",
    gap: "18px",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: "18px"
  });

  const makeRacketCard = (r, idx) => {
    const div = document.createElement("div");
    Object.assign(div.style, {
      flex: "1 1 30%",
      minWidth: "220px",
      maxWidth: "360px",
      borderRadius: "12px",
      padding: "12px",
      border: idx === 0 ? "2px solid #111" : "1px solid #ddd",
      background: idx === 0 ? "rgba(0,0,0,0.03)" : "#fff",
      cursor: "pointer",
      boxSizing: "border-box"
    });
    div.onclick = () => updateRacketDisplay(idx);
    const img = document.createElement("img");
    img.src = r.img;
    img.alt = r.name;
    Object.assign(img.style, { width: "100%", borderRadius: "8px", display: "block", marginBottom: "8px" });
    const h = document.createElement("div");
    h.innerText = r.name;
    Object.assign(h.style, { fontWeight: 800, marginBottom: "6px" });
    const link = document.createElement("a");
    link.href = r.url;
    link.target = "_blank";
    link.innerText = lang === "de" ? "Mehr erfahren" : "Learn more";
    Object.assign(link.style, { fontSize: "0.9rem", color: "#0066cc", textDecoration: "none" });
    const tech = document.createElement("div");
    tech.style.marginTop = "8px";
    tech.style.fontSize = "0.9rem";
    tech.innerHTML = `
      ${r.stats.Weight !== undefined ? `<div>Gewicht: ${r.stats.Weight} g</div>` : ""}
      ${r.stats.Headsize !== undefined ? `<div>Headsize: ${r.stats.Headsize} cm²</div>` : ""}
    `;
    div.appendChild(img);
    div.appendChild(h);
    div.appendChild(link);
    div.appendChild(tech);
    return div;
  };

  topRow.appendChild(makeRacketCard(best, 0));
  if (second) topRow.appendChild(makeRacketCard(second, 1));
  if (third) topRow.appendChild(makeRacketCard(third, 2));
  card.appendChild(topRow);

  const tableWrap = document.createElement("div");
  tableWrap.style.margin = "8px 0 16px 0";
  tableWrap.style.overflowX = "auto";
  const table = document.createElement("table");
  table.id = "profile-table";
  Object.assign(table.style, { width: "100%", borderCollapse: "collapse", minWidth: "640px" });

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr style="background:transparent">
      <th style="text-align:left; padding:10px 12px; width:40%;">${lang === "de" ? "Kategorie" : "Category"}</th>
      <th style="text-align:center; padding:10px 12px; width:30%;">${lang === "de" ? "Dein Spielerprofil" : "Your Player Profile"}</th>
      <th style="text-align:center; padding:10px 12px; width:30%;">${lang === "de" ? "Dein Schlägerprofil" : "Racket Profile"}</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  tbody.innerHTML = buildProfileTableRows(normalizedProfile, best.stats);
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  card.appendChild(tableWrap);

  const playDiv = document.createElement("div");
  playDiv.style.marginTop = "10px";
  playDiv.innerHTML = playStyleText;
  card.appendChild(playDiv);

  createRestartFloatingButton();

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  injectResponsiveStyles();
  highlightSelectedRacket(0);
}

// === Profilvergleich-Zeilenaufbau ===
function buildProfileTableRows(player, racketStats) {
  const order = [
    "Groundstrokes",
    "Volleys",
    "Serves",
    "Returns",
    "Power",
    "Control",
    "Maneuverability",
    "Stability",
    "Comfort",
    "Touch / Feel",
    "Topspin",
    "Slice"
  ];
  return order.map((key, idx) => {
    const pVal = (player[key] ?? 0).toFixed(1);
    const rVal = racketStats[key];
    const bg = idx % 2 === 0 ? "#ffffff" : "#f6f6f6";
    return `<tr style="background:${bg}"><td style="padding:10px 12px; text-align:left;">${key}</td><td style="padding:10px 12px; text-align:center;">${pVal}</td><td style="padding:10px 12px; text-align:center;">${(typeof rVal === 'number') ? rVal.toFixed(1) : '-'}</td></tr>`;
  }).join("");
}

// === Anzeige wechseln bei Auswahl anderer Schläger ===
function updateRacketDisplay(index) {
  const profile = {};
  for (const [k, v] of Object.entries(userProfile)) profile[k] = Math.round((v / 10) * 10) / 10;
  const { bestRackets } = getTopRackets(profile, matchMode);
  const racket = bestRackets[index] || bestRackets[0];
  const tbody = document.querySelector("#profile-table tbody");
  if (tbody) tbody.innerHTML = buildProfileTableRows(profile, racket.stats);
  highlightSelectedRacket(index);
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.scrollTop = 0;
}

// === Restart-Button links mittig ===
function createRestartFloatingButton() {
  const existing = document.getElementById("restart-floating");
  if (existing) existing.remove();
  const btn = document.createElement("button");
  btn.id = "restart-floating";
  btn.innerText = lang === "de" ? "Quiz neu starten" : "Restart Quiz";
  Object.assign(btn.style, {
    position: "fixed",
    left: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 4000,
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "20px",
    padding: "10px 12px",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,0,0,0.15)"
  });
  btn.onclick = () => restartQuiz();
  document.body.appendChild(btn);
}

// === Overlay neu aufbauen ===
function refreshOverlay() {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.remove();
  showResults();
}

// === CSS injection ===
function injectResponsiveStyles() {
  if (document.getElementById("appjs-responsive-styles")) return;
  const s = document.createElement("style");
  s.id = "appjs-responsive-styles";
  s.textContent = `
    @media (max-width: 1100px) {
      #overlay { padding: 18px; }
    }
    @media (max-width: 900px) {
      #overlay { align-items: flex-start; padding-top: 30px; padding-bottom: 30px; }
      .result-card { padding: 14px !important; }
      table#profile-table { min-width: 100% !important; }
      #restart-floating { display: none; }
    }
  `;
  document.head.appendChild(s);
}

// === Anpassung der Matching-Logik mit Schwächen-Maximum ===
function getTopRackets(profile, mode) {
  const scores = rackets.map(r => {
    let diff = 0;
    for (const cat of Object.keys(r.stats)) {
      // nur Standardkategorien, Tech-Specs behandelt separat
      const playerVal = profile[cat] ?? 0;
      const racketVal = r.stats[cat] ?? 0;
      if (mode === "weakness") {
        // wenn Spieler weniger als z. B. 6.5 hat → wir wollen maximal möglichen Wert
        if (playerVal < 6.5) {
          // negative Differenz (je größer der RacketVal, desto besser)
          diff += Math.abs(racketVal - 10); // je näher an 10, desto kleiner diff
        } else {
          // Spieler schon stark in dieser Kategorie → normale Differenz
          diff += Math.abs(playerVal - racketVal);
        }
      } else {
        // normaler Modus: minimieren Unterschied
        diff += Math.abs(playerVal - racketVal);
      }
    }
    // Tech-Specs: falls vorhanden, gewichte stärker
    if (r.stats.Weight !== undefined && profile.WeightPref !== undefined) {
      const pref = profile.WeightPref;
      const w = r.stats.Weight;
      // Wenn w liegt in Präferenzbereich → Bonus
      if (w >= pref.min && w <= pref.max) {
        diff -= 2; // guten Racket belohnen
      } else {
        diff += Math.abs(w - (pref.min + pref.max) / 2) / 50;
      }
    }
    if (r.stats.Headsize !== undefined && profile.HeadsizePref !== undefined) {
      const pref = profile.HeadsizePref;
      const hs = r.stats.Headsize;
      if (hs >= pref.min && hs <= pref.max) {
        diff -= 2;
      } else {
        diff += Math.abs(hs - (pref.min + pref.max) / 2) / 50;
      }
    }
    return { racket: r, score: diff };
  });
  scores.sort((a, b) => a.score - b.score);
  return { bestRackets: scores.slice(0, 3).map(s => s.racket) };
}

// === Spielstilbeschreibung ===
function getPlayStyleDescription(profile) {
  const p = profile.Power || 0;
  const c = profile.Control || 0;
  const com = profile.Comfort || 0;
  const m = profile.Maneuverability || 0;

  if (p > c && m > com) {
    return lang === "de"
      ? "Du bist ein aggressiver Baseliner, der Druck von der Grundlinie aus aufbaut und das Tempo bestimmt."
      : "You're an aggressive baseliner who dictates play from the back of the court.";
  } else if (c > p && com > m) {
    return lang === "de"
      ? "Du bist ein Allround-Spieler, der Präzision und Gefühl bevorzugt und in jeder Situation Lösungen findet."
      : "You're an all-court player valuing precision and touch, adapting to any situation.";
  } else if (com > 7) {
    return lang === "de"
      ? "Du spielst kontrolliert und effizient, achtest auf Armschonung und Konstanz."
      : "You play with control and efficiency, focusing on comfort and consistency.";
  } else {
    return lang === "de"
      ? "Du bist ein ausgewogener Spieler mit soliden Grundlagen und vielseitigem Spielstil."
      : "You're a balanced player with a solid, versatile game.";
  }
}

// === Back-Button ===
function createBackButton() {
  const existing = document.getElementById("back-button");
  if (existing) return;
  const btn = document.createElement("div");
  btn.id = "back-button";
  btn.innerHTML = "&#8592;";
  Object.assign(btn.style, {
    position: "fixed",
    left: "8px",
    top: "40%",
    transform: "translateY(-50%)",
    width: "38px",
    height: "38px",
    background: "rgba(255,255,255,0.9)",
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

// === Sprachumschaltung ===
function attachLangSwitchHandlers() {
  const en = document.getElementById("lang-en");
  const de = document.getElementById("lang-de");
  if (en) en.onclick = () => { switchLang("en"); };
  if (de) de.onclick = () => { switchLang("de"); };
}

function switchLang(newLang) {
  lang = newLang;
  localStorage.setItem("language", newLang);
  currentQuestion = 0;
  userProfile = {};
  showQuestion();
  renderProgress();
}

// === Impressum placeholder ===
function createImpressumHook() {
  const container = document.getElementById("header-links");
  if (!container) return;
  if (document.getElementById("impressum-anchor")) return;
  const a = document.createElement("a");
  a.id = "impressum-anchor";
  a.href = "impressum.html";
  a.target = "_blank";
  a.innerText = lang === "de" ? "Impressum" : "Imprint";
  a.style.textDecoration = "none";
  a.style.color = "inherit";
  a.style.marginLeft = "10px";
  container.appendChild(a);
}

// === Quiz neu starten ===
function restartQuiz() {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.remove();
  const rf = document.getElementById("restart-floating");
  if (rf) rf.remove();
  currentQuestion = 0;
  userProfile = {};
  showQuestion();
  renderProgress();
}

// === Init ===
loadData();
