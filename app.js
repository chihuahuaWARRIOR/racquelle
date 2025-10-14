// app.js

let questions = [];
let rackets = [];
let currentQuestion = 0;
let userProfile = {};
let finished = false;

// Overlay & Navigation states
let showResult = false;

Promise.all([
  fetch("./questions.json").then(res => res.json()),
  fetch("./rackets.json").then(res => res.json())
])
.then(([qData, rData]) => {
  questions = qData;
  rackets = rData;
  renderQuestion();
})
.catch(err => console.error("Fehler beim Laden der Daten:", err));

function renderQuestion() {
  const container = document.getElementById("quiz-container");
  if (!container) return;

  container.innerHTML = "";

  if (finished) {
    showResultOverlay();
    return;
  }

  const q = questions[currentQuestion];
  if (!q) return;

  const questionBox = document.createElement("div");
  questionBox.className = "question-box";
  questionBox.style.display = "flex";
  questionBox.style.flexDirection = "column";
  questionBox.style.alignItems = "center";
  questionBox.style.justifyContent = "center";
  questionBox.style.position = "relative";
  questionBox.style.padding = "1.5rem";
  questionBox.style.borderRadius = "1rem";
  questionBox.style.background = "rgba(255,255,255,0.6)";
  questionBox.style.width = "90%";
  questionBox.style.maxWidth = "600px";
  questionBox.style.minHeight = "300px";
  questionBox.style.margin = "auto";
  questionBox.style.textAlign = "center";

  const questionText = document.createElement("h2");
  questionText.innerText = q.question;
  questionText.style.marginBottom = "1.5rem";

  const answersContainer = document.createElement("div");
  answersContainer.style.display = "grid";
  answersContainer.style.gap = "1rem";
  answersContainer.style.width = "100%";

  q.answers.forEach(a => {
    const btn = document.createElement("button");
    btn.innerText = a.text;
    btn.className = "answer-btn";
    btn.style.background = "rgba(255,255,255,0.7)";
    btn.style.borderRadius = "1rem";
    btn.style.padding = "0.8rem 1rem";
    btn.style.fontSize = "1rem";
    btn.style.fontWeight = "600";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.transition = "background 0.2s";

    btn.addEventListener("mouseenter", () => btn.style.background = "rgba(0,0,0,0.1)");
    btn.addEventListener("mouseleave", () => btn.style.background = "rgba(255,255,255,0.7)");

    btn.addEventListener("click", () => handleAnswer(a.effects));
    answersContainer.appendChild(btn);
  });

  // Fortschrittsanzeige
  const progressBar = document.createElement("div");
  progressBar.style.position = "absolute";
  progressBar.style.bottom = "0";
  progressBar.style.left = "0";
  progressBar.style.height = "6px";
  progressBar.style.borderRadius = "0 0 1rem 1rem";
  progressBar.style.width = `${((currentQuestion + 1) / questions.length) * 100}%`;
  progressBar.style.background = currentQuestion === 0 ? "black" : "limegreen";
  progressBar.style.transition = "width 0.4s";

  // Zurück-Button
  const backBtn = document.createElement("div");
  backBtn.innerHTML = "&#8592;";
  backBtn.style.position = "fixed";
  backBtn.style.left = "1rem";
  backBtn.style.top = "50%";
  backBtn.style.transform = "translateY(-50%)";
  backBtn.style.padding = "0.6rem 1rem";
  backBtn.style.background = "rgba(255,255,255,0.6)";
  backBtn.style.borderRadius = "0 1rem 1rem 0";
  backBtn.style.cursor = "pointer";
  backBtn.style.fontSize = "1.5rem";
  backBtn.style.fontWeight = "bold";
  backBtn.style.userSelect = "none";
  backBtn.style.zIndex = "100";
  backBtn.addEventListener("click", () => goBack());

  questionBox.appendChild(questionText);
  questionBox.appendChild(answersContainer);
  questionBox.appendChild(progressBar);
  container.appendChild(questionBox);
  document.body.appendChild(backBtn);
}

function handleAnswer(effects) {
  // add to userProfile
  for (let stat in effects) {
    userProfile[stat] = (userProfile[stat] || 0) + effects[stat];
  }

  currentQuestion++;
  if (currentQuestion >= questions.length) {
    finished = true;
    showResultOverlay();
  } else {
    renderQuestion();
  }
}

function goBack() {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
  }
}

function showResultOverlay() {
  const container = document.getElementById("quiz-container");
  container.innerHTML = "";

  const result = findBestRacket(userProfile);
  const overlay = document.createElement("div");
  overlay.className = "result-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(255,255,255,0.95)";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "200";
  overlay.style.padding = "1rem";

  const title = document.createElement("h2");
  title.innerText = "🎾 Deine Schlägerempfehlung:";
  title.style.marginBottom = "1rem";

  const racketImg = document.createElement("img");
  racketImg.src = result.img;
  racketImg.alt = result.name;
  racketImg.style.width = "160px";
  racketImg.style.borderRadius = "1rem";
  racketImg.style.marginBottom = "1rem";

  const racketName = document.createElement("h3");
  racketName.innerText = result.name;
  racketName.style.fontWeight = "bold";
  racketName.style.marginBottom = "1rem";

  const link = document.createElement("a");
  link.href = result.url;
  link.target = "_blank";
  link.innerText = "➡ Zum Schläger bei Tennis Warehouse Europe";
  link.style.color = "black";
  link.style.fontWeight = "600";

  overlay.appendChild(title);
  overlay.appendChild(racketImg);
  overlay.appendChild(racketName);
  overlay.appendChild(link);

  container.appendChild(overlay);
}

function findBestRacket(profile) {
  let bestRacket = null;
  let bestScore = -Infinity;

  rackets.forEach(r => {
    let score = 0;
    for (let stat in profile) {
      if (r.stats[stat] !== undefined) {
        score += (10 - Math.abs(r.stats[stat] - profile[stat]));
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestRacket = r;
    }
  });

  return bestRacket || rackets[0];
}
