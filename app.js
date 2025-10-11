let currentQuestion = 0;
let answers = [];
let totalQuestions = 25;

async function loadQuestions() {
const res = await fetch("./questions.json");
const data = await res.json();
window.questions = Array.isArray(data) ? data : data.questions;
  showQuestion();
  renderProgress();
}

function showQuestion() {
  if (currentQuestion >= questions.length) return showResults();

  const q = questions[currentQuestion];
  document.getElementById("question").innerText = q.text;
  document.getElementById("a1").innerText = q.answers[0];
  document.getElementById("a2").innerText = q.answers[1];
  document.getElementById("a3").innerText = q.answers[2];
  document.getElementById("a4").innerText = q.answers[3];

  document.getElementById("progress-text").innerText = `Frage ${currentQuestion + 1} von ${questions.length}`;
}

function renderProgress() {
  const bar = document.getElementById("progress-bar");
  bar.innerHTML = "";
  for (let i = 0; i < questions.length; i++) {
    const span = document.createElement("span");
    if (i < currentQuestion) span.classList.add("active");
    bar.appendChild(span);
  }
}

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

function showResults() {
  document.getElementById("quiz-container").classList.add("hidden");
  document.getElementById("result-container").classList.remove("hidden");

  // Beispielauswertung
  const result = {
    racket: "Yonex Ezone 100 (2022)",
    desc: "Ideal für rhythmische Grundlinienspieler, die Power und Komfort kombinieren möchten.",
    img: "https://www.tenniswarehouse-europe.com/images/descpageRCYONEXH-YE100R.jpg",
    link: "https://www.tenniswarehouse-europe.com/Yonex_EZONE_100_2022/descpageRCYONEXH-YE100R-DE.html"
  };

  document.getElementById("result-content").innerHTML = `
    <p>${result.desc}</p>
    <img src="${result.img}" alt="${result.racket}" />
    <p><a href="${result.link}" target="_blank">➡️ Zum Schläger bei Tennis Warehouse Europe</a></p>
  `;
}

document.querySelectorAll(".answer").forEach((btn, i) =>
  btn.addEventListener("click", () => selectAnswer(i))
);

loadQuestions();


