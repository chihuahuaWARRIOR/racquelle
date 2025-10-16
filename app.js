// app.js - Vanilla JS angepasst nach deinen neuen Vorgaben

let currentQuestion = 0;
let userProfile = {};
let questions = {};
let rackets = [];
let lang = localStorage.getItem("language") || getLanguage();
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
    questions = await qRes.json();
    rackets = await rRes.json();

    // Brand Insel oben links einmalig setzen
    const brandEl = document.getElementById("brand");
    if (brandEl) {
      brandEl.innerHTML = `Your Game. <b>YourRacket.</b>`;
      brandEl.style.textDecoration = "none";
    }

    // Impressum unten rechts einmalig setzen
    const footer = document.getElementById("footer-island");
    if (footer) {
      footer.innerHTML = '';
      const a = document.createElement("a");
      a.href = "impressum.html";
      a.target = "_blank";
      a.innerText = lang === "de" ? "Impressum" : "Imprint";
      a.style.textDecoration = "none";
      a.style.color = "inherit";
      footer.appendChild(a);
    }

    showQuestion();
    renderProgress();
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
    userProfile[key] = (userProfile[key] ?? 50) + val * 5;
    userProfile[key] = Math.max(0, Math.min(100, userProfile[key]));
  }
}

// === Overlay Ergebnisse ===
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
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "30px",
    zIndex: "3000",
    overflowY: "auto",
    boxSizing: "border-box"
  });

  const normalizedProfile = {};
  const categories = [
    "Groundstrokes","Volleys","Serves","Returns","Power","Control",
    "Maneuverability","Stability","Comfort","Touch / Feel","Topspin","Slice"
  ];
  categories.forEach(cat => {
    const raw = userProfile[cat] ?? 0;
    normalizedProfile[cat] = Math.round((raw / 10) * 10) / 10;
  });
  if (userProfile.WeightPref) normalizedProfile.WeightPref = userProfile.WeightPref;
  if (userProfile.HeadsizePref) normalizedProfile.HeadsizePref = userProfile.HeadsizePref;

  const topResult = getTopRackets(normalizedProfile, matchMode);
  const bestRackets = topResult.bestRackets;
  selectedRacketIndex = 0;

  const card = document.createElement("div");
  Object.assign(card.style, {
    width: "min(1200px, 98%)",
    borderRadius: "16px",
    background: "#fff",
    padding: "22px",
    boxSizing: "border-box",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    alignItems: "start"
  });

  // Linke Seite: Text + Modus Buttons
  const left = document.createElement("div");
  left.style.display = "flex";
  left.style.flexDirection = "column";
  left.style.gap = "12px";

  const headerText = document.createElement("div");
  headerText.innerHTML = `<h2 style="margin:0 0 6px 0; font-size:1.4rem;">Your Game. <b>YourRacket.</b></h2>
    <p style="margin:0; color:#444;">${lang === "de" ? "Möchtest du" : "Would you like to"} 
    <span style="font-weight:700; color:#2ea44f;">${lang === "de" ? "Deine Stärken ausbauen" : "enhance strengths"}</span> ${lang === "de" ? "oder" : "or"} 
    <span style="font-weight:700; color:#c92a2a;">${lang === "de" ? "Schwächen ausgleichen" : "balance weaknesses"}</span>?</p>`;

  const btnWrap = document.createElement("div");
  btnWrap.style.display = "flex";
  btnWrap.style.gap = "10px";
  btnWrap.style.alignItems = "flex-end"; // Buttons auf Höhe Textunterkante

  const btnStrength = document.createElement("button");
  btnStrength.innerText = lang === "de" ? "Stärken ausbauen" : "Enhance strengths";
  Object.assign(btnStrength.style, {
    minWidth: "150px",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "3px solid #2ea44f",
    cursor: "pointer",
    fontWeight: "700",
    background: "#2ea44f",
    color: "#fff",
    outline: matchMode === "strength" ? "3px solid #006600" : "none"
  });

  const btnWeak = document.createElement("button");
  btnWeak.innerText = lang === "de" ? "Schwächen ausgleichen" : "Balance weaknesses";
  Object.assign(btnWeak.style, {
    minWidth: "150px",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "3px solid #c92a2a",
    cursor: "pointer",
    fontWeight: "700",
    background: "#c92a2a",
    color: "#fff",
    outline: matchMode === "weakness" ? "3px solid #990000" : "none"
  });

  btnStrength.onclick = () => { matchMode = "strength"; refreshOverlay(); };
  btnWeak.onclick = () => { matchMode = "weakness"; refreshOverlay(); };

  btnWrap.appendChild(btnStrength);
  btnWrap.appendChild(btnWeak);

  // Platz für Erklärungstext (Beispiel)
  const explanation = document.createElement("p");
  explanation.style.marginTop = "18px";
  explanation.style.fontSize = "0.95rem";
  explanation.style.color = "#555";
  explanation.innerHTML = "Hier kannst du später einen kurzen Erklärungstext zu YourRacket.com einfügen. Zum Beispiel: <i>Finde deinen idealen Tennis-Schläger basierend auf deinem Spielstil.</i>";

  left.appendChild(headerText);
  left.appendChild(btnWrap);
  left.appendChild(explanation);

  // Rechte Seite: Racket-Karten
  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.flexDirection = "column";
  right.style.gap = "12px";

  const topRow = document.createElement("div");
  topRow.style.display = "flex";
  topRow.style.gap = "12px";
  topRow.style.flexWrap = "wrap";

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

  bestRackets.forEach((r, i) => topRow.appendChild(makeRacketCard(r, i)));
  right.appendChild(topRow);

  card.appendChild(left);
  card.appendChild(right);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  highlightSelectedRacket(0);
}

// === Update ausgewählter Racket ===
function updateRacketDisplay(index) {
  selectedRacketIndex = index;
  highlightSelectedRacket(index);
}

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

// === Overlay neu aufbauen ===
function refreshOverlay() {
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.remove();
  showResults();
}

// === Sprachumschaltung ===
function attachLangSwitchHandlers() {
  const langSwitch = document.getElementById("lang-switch");
  if (!langSwitch) return;
  const btns = langSwitch.getElementsByTagName("button");
  for (const b of btns) {
    if (/en/i.test(b.innerText)) b.onclick = () => switchLang("en");
    if (/de/i.test(b.innerText)) b.onclick = () => switchLang("de");
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

// === Matching Logik (Top 3) ===
function getTopRackets(profile, mode) {
  const scores = rackets.map(r => {
    let diff = 0;
    const cats = [
      "Groundstrokes","Volleys","Serves","Returns","Power","Control",
      "Maneuverability","Stability","Comfort","Touch / Feel","Topspin","Slice"
    ];
    cats.forEach(cat => {
      const p = profile[cat] ?? 0;
      const rv = r.stats[cat] ?? 0;
      if (mode === "weakness" && p < 6.5) diff += Math.abs(10 - rv);
      else diff += Math.abs(p - rv);
    });
    return { r, diff };
  });
  scores.sort((a, b) => a.diff - b.diff);
  return { bestRackets: scores.slice(0, 3).map(s => s.r) };
}

// === Init ===
loadData();
