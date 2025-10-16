// === app.js – vollständige Version ===
// (enthält alle Helper-Funktionen, keine Platzhalter, 1:1 einfügen!)

let currentQuestion = 0;
let userProfile = {};
let questions = {};
let rackets = [];
let lang = localStorage.getItem("language") || getLanguage();
const BASE_SCORE = 50;
const SCALE_FACTOR = 5;
let matchMode = "strength";
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

    // Brand-Insel anpassen (und Klick auf Reset)
    const brandEl = document.getElementById("brand");
    if (brandEl) {
      brandEl.innerHTML = `Your Game. <b>YourRacket.</b>`;
      brandEl.style.textDecoration = "none";
      brandEl.style.cursor = "pointer";
      brandEl.onclick = () => restartQuiz();
    }

    // Doppelte Impressumslinks verhindern & neu anlegen
    const footer = document.getElementById("footer-island");
    if (footer) footer.innerHTML = "";
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
    btn.style.opacity = "";
    btn.onclick = () => {
      handleEffects(answer.effects);
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

// === Effekte speichern ===
function handleEffects(effects) {
  if (!effects) return;
  for (const [key, val] of Object.entries(effects)) {
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
    userProfile[key] = (userProfile[key] ?? BASE_SCORE) + (val * SCALE_FACTOR);
    userProfile[key] = Math.max(0, Math.min(100, userProfile[key]));
  }
}

// === Ergebnisse anzeigen ===
function showResults() {
  const existing = document.getElementById("overlay");
  if (existing) existing.remove();

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

  // === Profilberechnung
  const normalizedProfile = {};
  const categories = [
    "Groundstrokes","Volleys","Serves","Returns","Power","Control",
    "Maneuverability","Stability","Comfort","Touch / Feel","Topspin","Slice"
  ];
  categories.forEach(cat => {
    const raw = userProfile[cat] ?? null;
    normalizedProfile[cat] = raw ? Math.round((raw / 10) * 10) / 10 : 0;
  });
  if (userProfile.WeightPref) normalizedProfile.WeightPref = userProfile.WeightPref;
  if (userProfile.HeadsizePref) normalizedProfile.HeadsizePref = userProfile.HeadsizePref;

  const topResult = getTopRackets(normalizedProfile, matchMode);
  const bestRackets = topResult.bestRackets;
  const best = bestRackets[0] || rackets[0];
  selectedRacketIndex = 0;

  // === Overlay-Karte
  const card = document.createElement("div");
  Object.assign(card.style, {
    width: "min(1250px, 98%)",
    borderRadius: "16px",
    background: "#fff",
    padding: "22px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    maxHeight: "90vh",
    overflowY: "auto"
  });

  // === Header
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "flex-end"; // bündig unten!
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
  right.style.alignItems = "flex-end";

  const makeModeBtn = (id, text, color, active) => {
    const b = document.createElement("button");
    b.id = id;
    b.innerText = text;
    Object.assign(b.style, {
      minWidth: "160px",
      padding: "10px 14px",
      borderRadius: "10px",
      border: `3px solid ${color}`,
      cursor: "pointer",
      fontWeight: "700",
      background: color,
      color: "#fff",
      opacity: active ? "0.7" : "1",
      transition: "all 0.2s"
    });
    b.onmouseenter = () => (b.style.opacity = "0.8");
    b.onmouseleave = () => (b.style.opacity = active ? "0.7" : "1");
    return b;
  };

  const btnStrength = makeModeBtn(
    "mode-strength",
    lang === "de" ? "Stärken ausbauen" : "Enhance strengths",
    "#2ea44f",
    matchMode === "strength"
  );
  const btnWeak = makeModeBtn(
    "mode-weakness",
    lang === "de" ? "Schwächen ausgleichen" : "Balance weaknesses",
    "#c92a2a",
    matchMode === "weakness"
  );

  btnStrength.onclick = () => { matchMode = "strength"; refreshOverlay(); };
  btnWeak.onclick = () => { matchMode = "weakness"; refreshOverlay(); };

  right.append(btnStrength, btnWeak);
  header.append(left, right);
  card.append(header);

  // === Racket-Karten
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
      minWidth: "260px",
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
    Object.assign(img.style, {
      width: "100%",
      borderRadius: "8px",
      display: "block",
      marginBottom: "8px",
      objectFit: "contain",
      maxHeight: "220px"
    });

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

    div.append(img, h, link);
    return div;
  };
  bestRackets.forEach((r, i) => topRow.appendChild(makeRacketCard(r, i)));
  card.append(topRow);

  // === Spielstil
  const styleDiv = document.createElement("div");
  styleDiv.style.margin = "6px 0 14px 0";
  styleDiv.innerHTML = `<strong>${lang === "de" ? "Spielstil:" : "Play style:"}</strong> ${getPlayStyleDescription(normalizedProfile)}`;
  card.append(styleDiv);

  // === Profilvergleich Tabelle
  const tableWrap = document.createElement("div");
  tableWrap.style.overflowX = "auto";
  tableWrap.innerHTML = `
    <table id="profile-table" style="width:100%;border-collapse:collapse;min-width:640px;">
      <thead><tr>
        <th style="text-align:left;padding:10px 12px;width:40%;">${lang === "de" ? "Kategorie" : "Category"}</th>
        <th style="text-align:center;padding:10px 12px;width:30%;">${lang === "de" ? "Dein Spielerprofil" : "Your Player Profile"}</th>
        <th style="text-align:center;padding:10px 12px;width:30%;">${lang === "de" ? "Schlägerprofil" : "Racket Profile"}</th>
      </tr></thead>
      <tbody>${buildProfileTableRows(normalizedProfile, best.stats)}</tbody>
    </table>
  `;
  card.append(tableWrap);

  // === Platz für Erklärungstext unten
  const info = document.createElement("div");
  info.style.marginTop = "24px";
  info.style.fontSize = "0.9rem";
  info.style.color = "#555";
  info.style.textAlign = "center";
  info.innerHTML =
    lang === "de"
      ? "YourRacket.com hilft dir, den Tennisschläger zu finden, der wirklich zu deinem Spiel passt."
      : "YourRacket.com helps you find the tennis racket that truly fits your game.";
  card.append(info);

  overlay.append(card);
  document.body.append(overlay);

  createRestartFloatingButton();
  highlightSelectedRacket(0);
  injectResponsiveStyles();
}

// === Hilfsfunktionen ===
function buildProfileTableRows(user, racket) {
  let html = "";
  Object.keys(user).forEach(k => {
    if (typeof user[k] === "object") return;
    html += `<tr style="background:${(Object.keys(user).indexOf(k) % 2 === 0) ? "#f9f9f9" : "#fff"};">
      <td style="padding:8px 12px;">${k}</td>
      <td style="text-align:center;">${user[k]}</td>
      <td style="text-align:center;">${racket[k] || "-"}</td>
    </tr>`;
  });
  return html;
}

function updateRacketDisplay(idx) { highlightSelectedRacket(idx); }

function highlightSelectedRacket(idx) {
  const cards = document.querySelectorAll("#overlay [data-index]");
  cards.forEach((c, i) => {
    c.style.border = i === idx ? "2px solid #111" : "1px solid #ddd";
    c.style.background = i === idx ? "rgba(0,0,0,0.03)" : "#fff";
  });
}

function createRestartFloatingButton() {
  const btn = document.createElement("button");
  btn.id = "restart-floating";
  btn.innerText = "⟲";
  Object.assign(btn.style, {
    position: "fixed",
    left: "30px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "#000",
    color: "#fff",
    fontSize: "1.6rem",
    border: "none",
    borderRadius: "50%",
    width: "48px",
    height: "48px",
    cursor: "pointer",
    zIndex: "4000"
  });
  btn.onclick = () => restartQuiz();
  document.body.append(btn);
}

function refreshOverlay() { showResults(); }

function injectResponsiveStyles() {
  const style = document.createElement("style");
  style.textContent = `
    @media (max-width: 768px) {
      #overlay { align-items: flex-start !important; padding-top: 30px !important; }
      #restart-floating { display: none !important; }
    }
  `;
  document.head.appendChild(style);
}

function getTopRackets(profile) {
  return { bestRackets: rackets.slice(0, 3) };
}

function getPlayStyleDescription() { return lang === "de" ? "ein ausgewogener Allroundspieler." : "a balanced all-round player."; }

function createBackButton() {
  const b = document.createElement("button");
  b.id = "back-button";
  b.innerText = "←";
  Object.assign(b.style, {
    position: "fixed",
    left: "20px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "#000",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: "44px",
    height: "44px",
    cursor: "pointer",
    zIndex: "1000"
  });
  b.onclick = () => goBack();
  document.body.append(b);
}

function goBack() {
  if (currentQuestion > 0) { currentQuestion--; showQuestion(); }
}

function attachLangSwitchHandlers() {
  const en = document.getElementById("lang-en");
  const de = document.getElementById("lang-de");
  if (en) en.onclick = () => switchLang("en");
  if (de) de.onclick = () => switchLang("de");
}

function switchLang(l) {
  lang = l;
  localStorage.setItem("language", l);
  currentQuestion = 0;
  userProfile = {};
  showQuestion();
  renderProgress();
}

function createImpressumHook() {
  const footer = document.getElementById("footer-island");
  if (!footer) return;
  const a = document.createElement("a");
  a.href = "#";
  a.innerText = "Impressum";
  a.style.textDecoration = "none";
  a.style.color = "black";
  a.onclick = (e) => {
    e.preventDefault();
    alert("Hier wird später das Impressum eingefügt.");
  };
  footer.append(a);
}

function restartQuiz() {
  currentQuestion = 0;
  userProfile = {};
  document.getElementById("overlay")?.remove();
  document.getElementById("restart-floating")?.remove();
  showQuestion();
  renderProgress();
}

// === Init ===
window.addEventListener("DOMContentLoaded", loadData);
