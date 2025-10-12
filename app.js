// === Racquelle Quiz App ===
// Autor: chihuahuaWARRIOR 🐾
// Saubere Version 2025-10

let currentQuestion = 0;
let answers = [];
let questions = [];
let totalQuestions = 25;

// --- Lade Fragen aus questions.json ---
async function loadQuestions() {
  try {
    console.log("Fragen werden geladen...");
    const response = await fetch("./questions.json", {
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    console.log("Antwort erhalten:", text.slice(0, 100));

    const data = JSON.parse(text);
    questions = Array.isArray(data) ? data : data.questions;

    if (!questions || questions.length === 0) {
      throw new Error("Keine Fragen gefunden");
    }

    totalQuestions = questions.length;
    console.log(`Fragen geladen: ${totalQuestions}`);

    currentQuestion = 0;
    showQuestion();
    renderProgress();
  } catch (error) {
    console.error("Fehler beim Laden:", error);
    const qEl = document.getElementById("question");
    if (qEl)
      qEl.innerText = "Fragen konnten nicht geladen werden 😕";
  }
}

// --- Zeige aktuelle Frage ---
function showQuestion() {
  if (!questions.length) return;

  if (currentQuestion >= questions.length) {
    showResults();
    return;
  }

  const q = questions[currentQuestion];
  document.getElementById("question").innerText = q.text;

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`a${i + 1}`);
    if (btn) btn.innerText = q.answers[i] || "";
  }

  const progText = document.getElementById("progress-text");
  if (progText)
    progText.innerText = `Frage ${currentQuestion + 1} von ${questions.length}`;
}

// --- Fortschrittsbalken ---
function renderProgress() {
  const bar = document.getElementById("progress-bar");
  if (!bar) return;

  bar.innerHTML = "";
  for (let i = 0; i < questions.length; i++) {
    const span = document.createElement("span");
    if (i < currentQuestion) span.classList.add("active");
    bar.appendChild(span);
  }
}

// --- Auswahl einer Antwort ---
function selectAnswer(choice) {
  answers.push(choice);
  currentQuestion++;

  if (currentQuestion < questions.length) {
    showQuestion();
    renderProgress();
  } else {
    showResults();
  }
}

// --- Ergebnisanzeige ---
function showResults() {
  const quiz = document.getElementById("quiz-container");
  const result = document.getElementById("result-container");

  if (quiz) quiz.classList.add("hidden");
  if (result) result.classList.remove("hidden");

  // Beispielhafte Auswertung
  const recommendation = {
    racket: "Yonex Ezone 100 (2022)",
    desc: "Ideal für rhythmische Grundlinienspieler, die Power und Komfort kombinieren möchten.",
    img: "https://www.tenniswarehouse-europe.com/images/descpageRCYONEXH-YE100R.jpg",
    link: "https://www.tenniswarehouse-europe.com/Yonex_EZONE_100_2022/descpageRCYONEXH-YE100R-DE.html"
  };

  document.getElementById("result-content").innerHTML = `
    <h3>${recommendation.racket}</h3>
    <p>${recommendation.desc}</p>
    <img src="${recommendation.img}" alt="${recommendation.racket}" style="max-width:250px;border-radius:10px;margin:1em 0;" />
    <p><a href="${recommendation.link}" target="_blank" rel="noopener noreferrer">➡️ Zum Schläger bei Tennis Warehouse Europe</a></p>
  `;
}

// --- Event-Listener für Antwort-Buttons ---
document.querySelectorAll(".answer").forEach((btn, i) =>
  btn.addEventListener("click", () => selectAnswer(i))
);

// --- Starte das Quiz ---
loadQuestions();
