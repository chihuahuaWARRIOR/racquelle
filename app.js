import React, { useState } from "react";
import questions from "./questions.json";
import rackets from "./rackets.json";

export default function App() {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({});
  const [showOverlay, setShowOverlay] = useState(false);
  const [language, setLanguage] = useState("de");
  const [selectedRacket, setSelectedRacket] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [playerProfile, setPlayerProfile] = useState(null);

  const currentQuestions = questions[language];

  const handleAnswer = (effects) => {
    const updatedScores = { ...scores };
    for (const [key, value] of Object.entries(effects)) {
      updatedScores[key] = (updatedScores[key] || 0) + value;
    }
    setScores(updatedScores);
    if (step + 1 < currentQuestions.length) {
      setStep(step + 1);
    } else {
      setShowOverlay(true);
      calculateProfile(updatedScores);
    }
  };

  const calculateProfile = (scores) => {
    const categories = Object.keys(scores);
    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / categories.length;
    const strengths = categories
      .filter((key) => scores[key] >= avg + 1)
      .sort((a, b) => scores[b] - scores[a]);
    const weaknesses = categories
      .filter((key) => scores[key] <= avg - 1)
      .sort((a, b) => scores[a] - scores[b]);
    setPlayerProfile({ strengths, weaknesses });
  };

  const restartQuiz = () => {
    setStep(0);
    setScores({});
    setShowOverlay(false);
    setSelectedRacket(null);
    setShowResults(false);
    setPlayerProfile(null);
  };

  const getMatchingRackets = () => {
    if (!playerProfile) return [];
    const { strengths, weaknesses } = playerProfile;
    const matchScores = rackets.map((racket) => {
      let score = 0;
      strengths.forEach((s) => (score += racket.tech[s] || 0));
      weaknesses.forEach((w) => (score += (10 - (racket.tech[w] || 0)))); // Schwächen => hohe Werte gut
      return { ...racket, matchScore: score };
    });
    return matchScores.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  };

  const topRackets = getMatchingRackets();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="text-lg font-semibold">
          Your Game. <span className="font-bold">YourRacket.</span>
        </div>
        <div className="text-sm space-x-4">
          <button
            onClick={() => setLanguage(language === "de" ? "en" : "de")}
            className="text-gray-600 hover:text-black"
          >
            {language === "de" ? "EN" : "DE"}
          </button>
          <a href="/impressum" className="text-gray-600 hover:text-black">
            Impressum
          </a>
        </div>
      </header>

      {/* Quiz */}
      {!showOverlay && step < currentQuestions.length && (
        <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded-2xl">
          <h2 className="text-xl font-semibold mb-6">
            {currentQuestions[step].q}
          </h2>
          <div className="grid gap-3">
            {currentQuestions[step].answers.map((ans, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(ans.effects)}
                className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
              >
                {ans.text}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-500 mt-4">
            {step + 1} / {currentQuestions.length}
          </div>
        </div>
      )}

      {/* Overlay */}
      {showOverlay && playerProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-2xl w-full relative">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Dein Spielprofil
            </h2>

            <div className="flex justify-around mb-8">
              <div>
                <h3 className="font-semibold text-green-600 mb-2">Stärken</h3>
                <div className="flex flex-wrap gap-2">
                  {playerProfile.strengths.map((s) => (
                    <button
                      key={s}
                      className="bg-green-500 text-white px-3 py-1 rounded-full opacity-70 hover:opacity-100 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-red-600 mb-2">Schwächen</h3>
                <div className="flex flex-wrap gap-2">
                  {playerProfile.weaknesses.map((w) => (
                    <button
                      key={w}
                      className="bg-red-500 text-white px-3 py-1 rounded-full opacity-70 hover:opacity-100 transition"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Spielstil über der Tabelle */}
            <div className="text-center mb-4 text-lg font-semibold">
              Spielstil:{" "}
              <span className="font-bold text-blue-600">
                {playerProfile.strengths.length > 0
                  ? playerProfile.strengths[0]
                  : "Allrounder"}
              </span>
            </div>

            {/* Racket Match */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">Racket</th>
                    <th className="p-2">Match Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topRackets.map((r, idx) => (
                    <tr
                      key={r.name}
                      onClick={() => setSelectedRacket(r.name)}
                      className={`cursor-pointer border-b hover:bg-gray-100 transition ${
                        selectedRacket === r.name
                          ? "bg-gray-200 border border-gray-400"
                          : ""
                      }`}
                    >
                      <td className="p-2 font-semibold">{r.name}</td>
                      <td className="p-2">{r.matchScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Restart Button */}
            <div className="flex justify-center mt-8">
              <button
                onClick={restartQuiz}
                className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl text-lg hover:bg-blue-700 transition"
              >
                Quiz neu starten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
