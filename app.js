let currentQuestion = 0;
let answers = [];
let questions = [];

// Sprache automatisch erkennen (Deutsch oder Englisch)
function getLanguage() {
  const lang = navigator.language || navigator.userLanguage;
  return lang.startsWith("de") ? "de" : "en";
}

// Fragen laden
async function loadQuestions() {
  try {
    console.log("Fragen werden geladen...");
    const response = await fetch("questions.json", {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const lang = getLanguage();

    // Nutze die passende Sprachsektion (z. B. data.de)
    questions = data[lang];

    if (!questions || questions.length === 0) {
      throw new Error(`Keine Fragen in Sprache "${lang}" gefunden`);
    }

    console.log(`Fragen geladen (${lang}): ${questions.length}`);
    showQuestion();
    renderProgress();
  } catch (error) {
    console.error("Fehler beim Laden der Fragen:", error);
    document.getElementById("question").innerText =
      "Fragen konnten nicht geladen werden 😕";
  }
}

function showQuestion() {
  if (!questions || questions.length === 0) return;

  if (currentQuestion >= questions.length) {
    showResults();
    return;
  }

  const q = questions[currentQuestion];
  document.getElementById("question").innerText = q.q;

  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`a${i + 1}`);
    btn.innerText = q.answers[i];
  }

  document.getElementById("progress-text").innerText = `Frage ${
    currentQuestion + 1
  } von ${questions.length}`;
  renderProgress();
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
    link: "https://www.tenniswarehouse-europe.com/Yonex_EZONE_100_2022/descpageRCYONEXH-YE100R-DE.html",
  };

  document.getElementById("result-content").innerHTML = `
    <h2>${result.racket}</h2>
    <p>${result.desc}</p>
    <img src="${result.img}" alt="${result.racket}" />
    <p><a href="${result.link}" target="_blank">➡️ Zum Schläger bei Tennis Warehouse Europe</a></p>
  `;
}

// Event Listener für Buttons
document.querySelectorAll(".answer").forEach((btn, i) =>
  btn.addEventListener("click", () => selectAnswer(i))
);

// Start
loadQuestions();
