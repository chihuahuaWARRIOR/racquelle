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

  // Beispielhafte einfache Auswertung
  const resultIndex = Math.floor(Math.random() * 3);
  let result;

  if (resultIndex === 0) {
    result = {
      racket: "Yonex Ezone 100 (2022)",
      desc: "Ideal für rhythmische Grundlinienspieler, die Power und Komfort kombinieren möchten.",
      img: "https://www.tenniswarehouse-europe.com/images/descpageRCYONEXH-YE100R.jpg",
      link: "https://www.tenniswarehouse-europe.com/Yonex_EZONE_100_2022/descpageRCYONEXH-YE100R-DE.html"
    };
  } else if (resultIndex === 1) {
    result = {
      racket: "Babolat Pure Drive",
      desc: "Perfekt für aggressive Spieler, die Spin und Power suchen.",
      img: "https://www.tenniswarehouse-europe.com/images/descpageRCBAB-PD300R-1.jpg",
      link: "https://www.tenniswarehouse-europe.com/Babolat_Pure_Drive/descpageRCBAB-PD300R-DE.html"
    };
  } else {
    result = {
      racket: "Head Speed MP 2024",
      desc: "Ausgewogen zwischen Kontrolle und Power – ideal für Allrounder.",
      img: "https://www.tenniswarehouse-europe.com/images/descpageRCHEADH-HSMP24-1.jpg",
      link: "https://www.tenniswarehouse-europe.com/Head_Speed_MP_2024/descpageRCHEADH-HSMP24-DE.html"
    };
  }

  document.getElementById("result-content").innerHTML = `
    <h2>${result.racket}</h2>
    <p>${result.desc}</p>
    <img src="${result.img}" alt="${result.racket}" style="max-width:300px;border-radius:12px;margin:10px 0;">
    <p><a href="${result.link}" target="_blank">➡️ Zum Schläger bei Tennis Warehouse Europe</a></p>
  `;
}


// Event Listener für Buttons
document.querySelectorAll(".answer").forEach((btn, i) =>
  btn.addEventListener("click", () => selectAnswer(i))
);

// Start
loadQuestions();

// Sprache umschalten
document.getElementById("lang-de").addEventListener("click", () => switchLang("de"));
document.getElementById("lang-en").addEventListener("click", () => switchLang("en"));

function switchLang(lang) {
  document.getElementById("lang-de").classList.toggle("active", lang === "de");
  document.getElementById("lang-en").classList.toggle("active", lang === "en");
  localStorage.setItem("language", lang);
  loadQuestions();
}

// Sprachpräferenz merken
const savedLang = localStorage.getItem("language");
if (savedLang) {
  switchLang(savedLang);
} else {
  loadQuestions();
}

