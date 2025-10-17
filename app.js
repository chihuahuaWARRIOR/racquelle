// app.js (vanilla JS) - ersetze exakt die bestehende app.js damit

let currentQuestion = 0;
let userProfile = {};
let questions = {};
let rackets = [];
let lang = localStorage.getItem("language") || getLanguage();
const BASE_SCORE = 50; // neutral (0-100 internal, 50 => 5.0)
const SCALE_FACTOR = 5;
let matchMode = "strength"; // "strength" oder "weakness"
let selectedRacketIndex = 0;

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

const brandEl = document.getElementById("brand");
if (brandEl) {
  // Branding-Text setzen
  brandEl.innerHTML = `Your Game. <b>YourRacket.</b>`;
  brandEl.style.textDecoration = "none";
  brandEl.style.cursor = "pointer";

  // Klick auf Branding-Insel -> Quiz neu starten
  brandEl.addEventListener("click", () => {
    restartQuiz();
  });
}

    // Impressum verlinken (footer-island wenn vorhanden)
    createImpressumHook();

    showQuestion();
    renderProgress();
    createBackButton();
    attachLangSwitchHandlers();
  } catch (err) {
    console.error("Fehler beim Laden:", err);
    const q = document.getElementById("question");
    if (q) q.innerText = "Fehler beim Laden 😕";
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
    if (!btn || !answer) continue;
    btn.innerText = answer.text;
    // Rücksetzen eventuell vorheriger inline-styles
    btn.style.opacity = "";
    btn.onclick = () => {
      // Wenn effects enthalten WeightMin/Max oder HeadsizeMin/Max -> speichere als Präferenz-Objekte
      handleEffects(answer.effects);
      // visuelles kurzes drücken (Option)
      btn.style.opacity = "0.95";
      setTimeout(() => {
        btn.style.opacity = "";
        currentQuestion++;
        showQuestion();
      }, 120);
    };
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

// === Effekte verarbeiten (Speichern im userProfile) ===
function handleEffects(effects) {
  if (!effects) return;
  // Effekte können normale Kategorien (Power etc.) oder Präferenzen WeightMin/Max etc. sein
  for (const [key, val] of Object.entries(effects)) {
    // Wenn es sich um WeightMin/Max oder HeadsizeMin/Max handelt, speichern wir als Pref-Objekt
    if (key === "WeightMin" || key === "WeightMax") {
      userProfile.WeightPref = userProfile.WeightPref || {};
      if (key === "WeightMin") userProfile.WeightPref.min = val;
      if (key === "WeightMax") userProfile.WeightPref.max = val;
      continue;
    }
    if (key === "HeadsizeMin" || key === "HeadsizeMax") {
      userProfile.HeadsizePref = userProfile.HeadsizePref || {};
      if (key === "HeadsizeMin") userProfile.HeadsizePref.min = val;
      if (key === "HeadsizeMax") userProfile.HeadsizePref.max = val;
      continue;
    }

    // Normale Kategorien: wir addieren mit BASE_SCORE / SCALE_FACTOR (intern 0-100)
    userProfile[key] = (userProfile[key] ?? BASE_SCORE) + (val * SCALE_FACTOR);
    userProfile[key] = Math.max(0, Math.min(100, userProfile[key]));
  }
}

// === Ergebnisse anzeigen (Overlay) ===
function showResults() {
  // entfernen, falls bereits vorhanden
  const existing = document.getElementById("overlay");
  if (existing) existing.remove();

  // overlay container
  const overlay = document.createElement("div");
  overlay.id = "overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px",
    zIndex: "3000",
    overflowY: "auto",
    boxSizing: "border-box"
  });

  // Spielerprofil normalisieren auf 0-10 (mit 1 Dezimalstelle)
  const normalizedProfile = {};
  const categories = [
    "Groundstrokes","Volleys","Serves","Returns","Power","Control",
    "Maneuverability","Stability","Comfort","Touch / Feel","Topspin","Slice"
  ];
  categories.forEach(cat => {
    const raw = userProfile[cat] ?? null;
    if (raw === null) normalizedProfile[cat] = 0;
    else normalizedProfile[cat] = Math.round((raw / 10) * 10) / 10;
  });

  // Extra: bring WeightPref/HeadsizePref in normalizedProfile for matching usage
  if (userProfile.WeightPref) normalizedProfile.WeightPref = userProfile.WeightPref;
  if (userProfile.HeadsizePref) normalizedProfile.HeadsizePref = userProfile.HeadsizePref;

  const topResult = getTopRackets(normalizedProfile, matchMode);
  const bestRackets = topResult.bestRackets;
  const best = bestRackets[0] || rackets[0];
  selectedRacketIndex = 0;

  // Inhalt card
  const card = document.createElement("div");
  Object.assign(card.style, {
    width: "min(1200px, 98%)",
    borderRadius: "16px",
    background: "#fff",
    padding: "22px",
    boxSizing: "border-box",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    maxHeight: "90vh",
    overflowY: "auto"
  });

  // Header + mode buttons (always colored; selected -> slightly faded)
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.flexWrap = "wrap";
  header.style.gap = "12px";

  const left = document.createElement("div");
  left.style.flex = "1 1 300px";
  left.innerHTML = `<h2 style="margin:0 0 6px 0; font-size:1.4rem;">Your Game. <b>YourRacket.</b></h2>
    <p style="margin:0; color:#444;">${lang === "de" ? "Möchtest du" : "Would you like to"} 
    <span style="font-weight:700; color:#2ea44f;">${lang === "de" ? "Deine Stärken ausbauen" : "enhance strengths"}</span> ${lang === "de" ? "oder" : "or"} 
    <span style="font-weight:700; color:#c92a2a;">${lang === "de" ? "Schwächen ausgleichen" : "balance weaknesses"}</span>?</p>`;

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.gap = "10px";
  right.style.alignItems = "center";

  const btnStrength = document.createElement("button");
  btnStrength.id = "mode-strength";
  btnStrength.innerText = lang === "de" ? "Stärken ausbauen" : "Enhance strengths";
  Object.assign(btnStrength.style, {
    minWidth: "150px",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "700",
    background: "#2ea44f",
    color: "#fff",
    opacity: matchMode === "strength" ? "0.7" : "1"
  });

  const btnWeak = document.createElement("button");
  btnWeak.id = "mode-weakness";
  btnWeak.innerText = lang === "de" ? "Schwächen ausgleichen" : "Balance weaknesses";
  Object.assign(btnWeak.style, {
    minWidth: "150px",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontWeight: "700",
    background: "#c92a2a",
    color: "#fff",
    opacity: matchMode === "weakness" ? "0.7" : "1"
  });

  btnStrength.onclick = () => { matchMode = "strength"; refreshOverlay(); };
  btnWeak.onclick = () => { matchMode = "weakness"; refreshOverlay(); };

  right.appendChild(btnStrength);
  right.appendChild(btnWeak);

  header.appendChild(left);
  header.appendChild(right);
  card.appendChild(header);

  // horizontal row with top3 cards
  const topRow = document.createElement("div");
  Object.assign(topRow.style, {
    display: "flex",
    gap: "14px",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginTop: "16px",
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
      boxSizing: "border-box",
      border: idx === 0 ? "2px solid #111" : "1px solid #ddd",
      background: idx === 0 ? "rgba(0,0,0,0.03)" : "#fff",
      cursor: "pointer"
    });
    div.dataset.index = idx;
    div.onclick = () => updateRacketDisplay(idx);

    const img = document.createElement("img");
    img.src = r.img;
    img.alt = r.name;
    Object.assign(img.style, { width: "100%", borderRadius: "8px", display: "block", marginBottom: "8px" });

    const h = document.createElement("div");
    h.innerText = r.name;
    h.style.fontWeight = "800";
    h.style.marginBottom = "6px";

    const link = document.createElement("a");
    link.href = r.url;
    link.target = "_blank";
    link.innerText = lang === "de" ? "Mehr erfahren" : "Learn more";
    link.style.fontSize = "0.9rem";
    link.style.color = "#0066cc";
    link.style.textDecoration = "none";

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

  // add top 3 (or fewer)
  bestRackets.forEach((r, i) => {
    topRow.appendChild(makeRacketCard(r, i));
  });
  card.appendChild(topRow);

  // Spielstil (über Tabelle)
  const styleDesc = getPlayStyleDescription(normalizedProfile);
  const styleDiv = document.createElement("div");
  styleDiv.style.margin = "6px 0 14px 0";
  styleDiv.innerHTML = `<strong>${lang === "de" ? "Spielstil:" : "Play style:"}</strong> ${styleDesc}`;
  card.appendChild(styleDiv);

  // Profilvergleich Tabelle
  const tableWrap = document.createElement("div");
  tableWrap.style.overflowX = "auto";
  const table = document.createElement("table");
  table.id = "profile-table";
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.minWidth = "640px";

  const thead = document.createElement("thead");
  thead.innerHTML = `<tr style="background:transparent">
    <th style="text-align:left; padding:10px 12px; width:40%;">${lang === "de" ? "Kategorie" : "Category"}</th>
    <th style="text-align:center; padding:10px 12px; width:30%;">${lang === "de" ? "Dein Spielerprofil" : "Your Player Profile"}</th>
    <th style="text-align:center; padding:10px 12px; width:30%;">${lang === "de" ? "Schlägerprofil" : "Racket Profile"}</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  tbody.innerHTML = buildProfileTableRows(normalizedProfile, best.stats);
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  card.appendChild(tableWrap);

  // großer Restart Button (zentral)
  const restartWrap = document.createElement("div");
  restartWrap.style.display = "flex";
  restartWrap.style.justifyContent = "center";
  restartWrap.style.marginTop = "18px";

  const restartBtn = document.createElement("button");
  restartBtn.innerText = lang === "de" ? "Quiz neu starten" : "Restart Quiz";
  Object.assign(restartBtn.style, {
    background: "#111",
    color: "#fff",
    fontWeight: "700",
    padding: "14px 26px",
    borderRadius: "12px",
    border: "none",
    fontSize: "1.05rem",
    cursor: "pointer"
  });
  restartBtn.onclick = () => restartQuiz();
  restartWrap.appendChild(restartBtn);
  card.appendChild(restartWrap);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // floating left restart (bigger)
  createRestartFloatingButton();

  // make sure first racket highlighted
  highlightSelectedRacket(0);
  injectResponsiveStyles();
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

// === Update Anzeige wenn man eines der Top-3 auswählt ===
function updateRacketDisplay(index) {
  const normalized = {};
  const categories = [
    "Groundstrokes","Volleys","Serves","Returns","Power","Control",
    "Maneuverability","Stability","Comfort","Touch / Feel","Topspin","Slice"
  ];
  categories.forEach(cat => {
    const raw = userProfile[cat] ?? null;
    if (raw === null) normalized[cat] = 0;
    else normalized[cat] = Math.round((raw / 10) * 10) / 10;
  });
  if (userProfile.WeightPref) normalized.WeightPref = userProfile.WeightPref;
  if (userProfile.HeadsizePref) normalized.HeadsizePref = userProfile.HeadsizePref;

  const top = getTopRackets(normalized, matchMode).bestRackets;
  const racket = top[index] || top[0];
  const tbody = document.querySelector("#profile-table tbody");
  if (tbody && racket) tbody.innerHTML = buildProfileTableRows(normalized, racket.stats);
  selectedRacketIndex = index;
  highlightSelectedRacket(index);
  // scroll to top of overlay for convenience
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.scrollTop = 0;
}

// === Highlighting der ausgewählten Schläger (Top-1/2/3) ===
function highlightSelectedRacket(index) {
  const overlay = document.getElementById("overlay");
  if (!overlay) return;
  const cards = overlay.querySelectorAll("div[data-index]");
  cards.forEach(c => {
    const idx = parseInt(c.dataset.index, 10);
    if (idx === index) {
      c.style.background = "#f4f4f4";
      c.style.border = "2px solid #666";
      c.style.boxShadow = "0 6px 18px rgba(0,0,0,0.06)";
    } else {
      c.style.background = "";
      c.style.border = idx === 0 ? "2px solid #111" : "1px solid #ddd";
      c.style.boxShadow = "";
    }
  });
}

// === Restart Floating Button (links mittig) ===
function createRestartFloatingButton() {
  const existing = document.getElementById("restart-floating");
  if (existing) return;
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
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: "700",
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

// === Styles injection für responsive behavior (kleine Ergänzungen) ===
function injectResponsiveStyles() {
  if (document.getElementById("appjs-responsive-styles")) return;
  const s = document.createElement("style");
  s.id = "appjs-responsive-styles";
  s.textContent = `
    @media (max-width: 900px) {
      #overlay { align-items: flex-start; padding-top: 24px; padding-bottom: 24px; }
    }
    @media (max-width: 640px) {
      #profile-table { min-width: 100% !important; }
      #restart-floating { display: none; }
    }
  `;
  document.head.appendChild(s);
}

// === Matching-Logik ===
// Liefert Top 3 Rackets; bei mode "weakness" wird für Spielerwerte < 6.5
// die Differenz so berechnet, dass hohe Racket-Werte in dieser Kategorie belohnt werden.
// Tech specs (Weight, Headsize) werden stärker bewertet (Bonus/Malus).
function getTopRackets(profile, mode) {
  const scores = rackets.map(r => {
    let diff = 0;
    // nur die standardkategorien vergleichen
    const cats = [
      "Groundstrokes","Volleys","Serves","Returns","Power","Control",
      "Maneuverability","Stability","Comfort","Touch / Feel","Topspin","Slice"
    ];
    cats.forEach(cat => {
      const p = profile[cat] ?? 0;
      const rv = r.stats[cat] ?? 0;
      if (mode === "weakness" && p < 6.5) {
        // wir wollen Rackets mit möglichst hohem rv -> kleinere diff wenn rv hoch
        // diff addieren so, dass geringer ist bei hohem rv
        diff += Math.abs(10 - rv); // je näher rv an 10, desto kleiner
      } else {
        // normaler Modus: einfache absolute Differenz
        diff += Math.abs(p - rv);
      }
    });

    // Tech spec: Gewicht (falls Pref gesetzt)
    if (r.stats.Weight !== undefined && profile.WeightPref !== undefined) {
      const pref = profile.WeightPref;
      const w = r.stats.Weight;
      const mid = ((pref.min ?? pref.max ?? w) + (pref.max ?? pref.min ?? w)) / 2;
      // Bonus, wenn innerhalb der Präferenzbereich liegt
      if ((pref.min === undefined || w >= pref.min) && (pref.max === undefined || w <= pref.max)) {
        diff -= 3; // belohnen
      } else {
        // sonst Penalty proportional zur Distanz (geringer skalenfaktor)
        diff += Math.abs(w - mid) / 30;
      }
    }

    // Tech spec: Headsize
    if (r.stats.Headsize !== undefined && profile.HeadsizePref !== undefined) {
      const pref = profile.HeadsizePref;
      const hs = r.stats.Headsize;
      const mid = ((pref.min ?? pref.max ?? hs) + (pref.max ?? pref.min ?? hs)) / 2;
      if ((pref.min === undefined || hs >= pref.min) && (pref.max === undefined || hs <= pref.max)) {
        diff -= 2.5;
      } else {
        diff += Math.abs(hs - mid) / 80;
      }
    }

    return { r, diff };
  });

  scores.sort((a, b) => a.diff - b.diff);
  return { bestRackets: scores.slice(0, 3).map(s => s.r) };
}

// === Spielstilbeschreibung (unverändert Logik) ===
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
  const existing = document.getElementById("back-button");
  if (existing) return;
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
  // vorhandene Buttons: #lang-en und #lang-de oder elements inside #lang-switch
  const en = document.getElementById("lang-en");
  const de = document.getElementById("lang-de");

  if (en) en.onclick = () => switchLang("en");
  if (de) de.onclick = () => switchLang("de");

  // fallback: if language switch container has buttons text "EN"/"DE"
  const langSwitch = document.getElementById("lang-switch");
  if (langSwitch && !en && !de) {
    const btns = langSwitch.getElementsByTagName("button");
    for (const b of btns) {
      if (/en/i.test(b.innerText)) b.onclick = () => switchLang("en");
      if (/de/i.test(b.innerText)) b.onclick = () => switchLang("de");
    }
  }
}

function switchLang(newLang) {
  lang = newLang;
  localStorage.setItem("language", newLang);
  currentQuestion = 0;
  userProfile = {};
  showQuestion();
  renderProgress();
}

// === Impressum Hook (footer-island) ===
function createImpressumHook() {
  // prefer footer island for link
  const footer = document.getElementById("footer-island");
  if (!footer) return;
  // avoid duplicates
  if (document.getElementById("impressum-anchor")) return;
  const a = document.createElement("a");
  a.id = "impressum-anchor";
  a.href = "impressum.html";
  a.target = "_blank";
  a.innerText = lang === "de" ? "Impressum" : "Imprint";
  a.style.textDecoration = "none";
  a.style.color = "inherit";
  footer.appendChild(a);
}

// === Quiz neu starten ===
function restartQuiz() {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.remove();
  const rf = document.getElementById("restart-floating");
  if (rf) rf.remove();
  currentQuestion = 0;
  userProfile = {};
  selectedRacketIndex = 0;
  showQuestion();
  renderProgress();
}

// === Init ===
loadData();


