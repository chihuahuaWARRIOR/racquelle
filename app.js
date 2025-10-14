let currentQuestion = 0;
let answers = [];
let questions = [];
let rackets = [];
let userProfile = {};
let finished = false;

// === Initialisierung ===
Promise.all([
  fetch("questions.json").then(r => r.json()),
  fetch("rackets.json").then(r => r.json())
])
.then(([qData, rData]) => {
  questions = qData;
  rackets = rData;
  showQuestion();
  renderProgress();
  createBackButton();
})
.catch(err => console.error("Fehler beim Laden:", err));

function showQuestion() {
  if (!questions.length) return;

  if (currentQuestion >= questions.length) {
    finished = true;
    showResults();
    return;
  }

  const q = questions[currentQuestion];
  document.getElementById("question").innerText = q.question;

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`a${i + 1}`);
    const answer = q.answers[i];
    btn.innerText = answer.text;
    btn.onclick = () => selectAnswer(answer.effects);
  }

  document.getElementById("progress-text").innerText =
    `Frage ${currentQuestion + 1} von ${questions.length}`;
  renderProgress();
}

function renderProgress() {
  const bar = document.getElementById("progress-bar");
  bar.innerHTML = "";
  for (let i = 0; i < questions.length; i++) {
    const span = document.createElement("span");
    if (i < currentQuestion) span.classList.add("active");
    if (i === currentQuestion) span.style.background = "black";
    bar.appendChild(span);
  }
}

function selectAnswer(effects) {
  for (const [k, v] of Object.entries(effects)) {
    userProfile[k] = (userProfile[k] || 0) + v;
  }

  currentQuestion++;
  if (currentQuestion < questions.length) {
    showQuestion();
  } else {
    showResults();
  }
}

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
      <p>Basierend auf deinen Antworten empfehlen wir dir:</p>
      <p><a href="${bestRacket.url}" target="_blank">➡️ ${bestRacket.name} ansehen</a></p>
      <button class="btn-restart" onclick="restartQuiz()">Quiz neu starten</button>
    </div>
  `;
}

function restartQuiz() {
  const rc = document.getElementById("result-container");
  rc.classList.remove("active");
  document.getElementById("quiz-container").classList.remove("hidden");
  currentQuestion = 0;
  userProfile = {};
  showQuestion();
  renderProgress();
}

function findBestRacket(profile) {
  let best = null;
  let bestScore = Infinity;
  for (const r of rackets) {
    let diff = 0;
    for (const cat of Object.keys(profile)) {
      if (r.stats[cat]) diff += Math.abs(r.stats[cat] - profile[cat]);
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
  btn.style.position = "fixed";
  btn.style.left = "1rem";
  btn.style.top = "50%";
  btn.style.transform = "translateY(-50%)";
  btn.style.padding = "0.6rem 1rem";
  btn.style.background = "rgba(255,255,255,0.6)";
  btn.style.borderRadius = "0 1rem 1rem 0";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "1.5rem";
  btn.style.fontWeight = "bold";
  btn.style.userSelect = "none";
  btn.style.zIndex = "1000";
  btn.onclick = () => goBack();
  document.body.appendChild(btn);
}

function goBack() {
  if (currentQuestion > 0) {
    currentQuestion--;
    showQuestion();
  }
}
