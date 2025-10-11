// === racquelle – Quiz Logik ===

let questions = [];
let currentQuestion = 0;
let answers = [];
let language = navigator.language.startsWith("de") ? "de" : "en";

// Lade Fragen
fetch("questions.json")
  .then((res) => res.json())
  .then((data) => {
    questions = data[language];
    showQuestion();
  });

const qText = document.getElementById("question-text");
const answerButtons = document.querySelectorAll(".answer");
const resultContainer = document.getElementById("result-container");
const questionContainer = document.getElementById("question-container");
const racketImage = document.getElementById("racket-image");
const racketName = document.getElementById("racket-name");
const otherRecommendations = document.getElementById("other-recommendations");
const playerStyle = document.getElementById("player-style");
const langToggle = document.getElementById("lang-toggle");

// Sprachumschaltung
langToggle.addEventListener("click", () => {
  language = language === "de" ? "en" : "de";
  currentQuestion = 0;
  answers = [];
  fetch("questions.json")
    .then((res) => res.json())
    .then((data) => {
      questions = data[language];
      showQuestion();
    });
});

function showQuestion() {
  const q = questions[currentQuestion];
  qText.textContent = q.q;
  answerButtons.forEach((btn, i) => {
    btn.textContent = q.answers[i];
    btn.onclick = () => chooseAnswer(q.choices[i]);
  });
}

function chooseAnswer(choice) {
  answers.push(choice);
  currentQuestion++;
  if (currentQuestion < questions.length) {
    showQuestion();
  } else {
    calculateResult();
  }
}

function calculateResult() {
  fetch("inventory.json")
    .then((res) => res.json())
    .then((data) => {
      const result = analyzeAnswers(data);
      showResult(result);
    });
}

function analyzeAnswers(data) {
  // Sehr vereinfachtes Matching-System
  const spinLover = answers.filter((a) => a === "a").length;
  const powerHitter = answers.filter((a) => a === "b").length;
  const controlPlayer = answers.filter((a) => a === "c").length;
  const feelPlayer = answers.filter((a) => a === "d").length;

  let style = "Allrounder mit vielseitigem Spiel";
  if (spinLover > powerHitter && spinLover > controlPlayer)
    style = "Spin-orientierte:r Grundlinienspieler:in";
  if (powerHitter > spinLover && powerHitter > controlPlayer)
    style = "Druckvoller Baseline-Hitter mit Offensivdrang";
  if (controlPlayer > spinLover && controlPlayer > powerHitter)
    style = "Kontrollierter Konterspieler mit Präzision";
  if (feelPlayer > 5) style = "Touch- & Feel-orientierte:r Spieler:in";

  // wähle Schläger nach Schwerpunkt
  const pick = data.rackets.sort(() => 0.5 - Math.random());
  const top = pick[0];
  const others = pick.slice(1, 3);

  return { style, top, others };
}

function showResult({ style, top, others }) {
  questionContainer.classList.add("hidden");
  resultContainer.classList.remove("hidden");
  document.getElementById("result-title").textContent =
    language === "de" ? "Deine Empfehlung" : "Your Recommendation";
  playerStyle.textContent = style;
  racketName.textContent = top.name;
  racketImage.src = top.image || "assets/placeholder_racket.png";
  otherRecommendations.innerHTML = others
    .map((r) => `<a href="${r.link}" target="_blank">${r.name}</a>`)
    .join("");
}
