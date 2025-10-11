// racquelle — updated quiz logic with fullscreen quadrants, progress dots, style summary,
// and safe shop deep-linking display. Uses questions.json and inventory.json (local files).

let questions = [];
let inventory = [];
let lang = navigator.language && navigator.language.startsWith('de') ? 'de' : 'en';
let idx = 0;
let answers = [];

// UI refs
const qInner = document.getElementById('questionInner');
const quadTL = document.getElementById('quadTL');
const quadTR = document.getElementById('quadTR');
const quadBL = document.getElementById('quadBL');
const quadBR = document.getElementById('quadBR');
const progressText = document.getElementById('progressText');
const progressDots = document.getElementById('progressDots');
const resultSection = document.getElementById('result');
const questionBox = document.getElementById('questionBox');
const langToggle = document.getElementById('langToggle');
const topImage = document.getElementById('topImage');
const topName = document.getElementById('topName');
const topWhy = document.getElementById('topWhy');
const topLink = document.getElementById('topLink');
const altList = document.getElementById('altList');
const styleSummary = document.getElementById('styleSummary');
const restartBtn = document.getElementById('restartBtn');

// language toggle
langToggle.addEventListener('click', () => {
  lang = (lang === 'de') ? 'en' : 'de';
  langToggle.textContent = lang.toUpperCase();
  // reload questions in the other language
  loadQuestions().then(()=> renderQuestion());
});

// load files
async function loadAll(){
  await loadQuestions();
  await loadInventory();
  buildProgressDots();
  renderQuestion();
}
async function loadQuestions(){
  const res = await fetch('questions.json');
  const j = await res.json();
  // expects questions.json to contain { "de": [...], "en": [...] }
  questions = j[lang] || j['de'] || [];
  // normalize: each item must have q, answers[], choices[]
}
async function loadInventory(){
  try{
    const res = await fetch('inventory.json');
    const j = await res.json();
    inventory = j.rackets || j;
  }catch(e){
    console.warn('inventory load failed', e);
    inventory = [];
  }
}

// progress dots
function buildProgressDots(){
  progressDots.innerHTML = '';
  const total = questions.length;
  for(let i=0;i<total;i++){
    const d = document.createElement('div');
    d.className = 'progress-dot';
    if(i < idx) d.classList.add('active');
    progressDots.appendChild(d);
  }
  updateProgressText();
}
function updateProgressDots(){
  const nodes = progressDots.querySelectorAll('.progress-dot');
  nodes.forEach((n,i)=> n.classList.toggle('active', i < idx));
  updateProgressText();
}
function updateProgressText(){
  progressText.textContent = (lang==='de' ? 'Frage' : 'Question') + ' ' + Math.min(idx+1, questions.length) + ' / ' + questions.length;
}

// render question and populate quadrants
function renderQuestion(){
  if(!questions || questions.length===0){ qInner.textContent = (lang==='de' ? 'Keine Fragen gefunden' : 'No questions found'); return; }
  const item = questions[idx];
  qInner.textContent = item.q || '—';
  // put answers into quadrants; item.answers[] expected in same order A,B,C,D
  setQuad(quadTL, item.answers[0] || '');
  setQuad(quadTR, item.answers[1] || '');
  setQuad(quadBL, item.answers[2] || '');
  setQuad(quadBR, item.answers[3] || '');
  updateProgressDots();
}
function setQuad(el, text){
  el.innerHTML = `<div class="label">${escapeHtml(text)}</div>`;
}

// click handlers: map each quad to a choice key a/b/c/d
quadTL.addEventListener('click', ()=> choose('a'));
quadTR.addEventListener('click', ()=> choose('b'));
quadBL.addEventListener('click', ()=> choose('c'));
quadBR.addEventListener('click', ()=> choose('d'));

function choose(key){
  answers.push({q: questions[idx]?.q || '', choice: key});
  idx++;
  if(idx >= questions.length){
    showResult();
  } else {
    renderQuestion();
  }
}

// scoring & simple profile generation
function analyzeAnswers(){
  // simple counters
  let counts = {a:0,b:0,c:0,d:0};
  answers.forEach(x => { if(counts[x.choice]!==undefined) counts[x.choice]++; });
  // heuristics -> style label
  let styleKey = 'balanced';
  if(counts.b > counts.a && counts.b > counts.c) styleKey = 'power';
  if(counts.a > counts.b && counts.a > counts.c) styleKey = 'spin';
  if(counts.c > counts.a && counts.c > counts.b) styleKey = 'control';
  if(counts.d > Math.max(counts.a,counts.b,counts.c)) styleKey = 'feel';

  // create a readable summary (3-4 sentences)
  const sentences = [];
  if(styleKey==='power'){
    sentences.push((lang==='de'?'Du spielst tendenziell sehr druckvoll und suchst':'You tend to play with heavy power and look for') + ' direkte Punkte.');
    sentences.push((lang==='de'?'Ein Schläger mit etwas Unterstützung (Powerframe) hilft dir, Länge zu halten.':'A racket with accessible power helps keep depth and punish short balls.'));
  } else if(styleKey==='spin'){
    sentences.push((lang==='de'?'Du bevorzugst Spin und Höhe in den Schlägen.':'You prefer spin and higher trajectory in your strokes.'));
    sentences.push((lang==='de'?'Ein spin-freundlicher Rahmen mit direktem Feedback passt gut.':'A spin-friendly frame with good feedback suits you.'));
  } else if(styleKey==='control'){
    sentences.push((lang==='de'?'Präzision und Kontrolle sind deine Stärken.':'Precision and control are your strengths.'));
    sentences.push((lang==='de'?'Ein kontrollorientiertes, leicht schwereres Frame vermittelt das nötige Gefühl.':'A control-oriented, slightly heavier frame will give you the needed feel.'));
  } else if(styleKey==='feel'){
    sentences.push((lang==='de'?'Du legst viel Wert auf Touch und Spielgefühl.':'You value touch and on-court feel highly.'));
    sentences.push((lang==='de'?'Ein flexibles, dämpfendes Frame unterstützt deinen Stil.':'A flexible, damped frame supports your style.'));
  } else {
    sentences.push((lang==='de'?'Dein Spiel ist ausgeglichen zwischen Power und Kontrolle.':'Your game is balanced between power and control.'));
    sentences.push((lang==='de'?'Ein vielseitiger Rahmen mit guter Fehlertoleranz ist empfehlenswert.':'A versatile racket with good forgiveness is recommended.'));
  }

  // preferences from spec questions (if present)
  let pref = {head:100, weight:'285-305', comfort:'medium'};
  // try to find spec answers in the questions array (if they were included)
  questions.forEach((q,i)=>{
    if(/wie schwer|how heavy/i.test(q.q) && answers[i]) {
      const ch = answers[i].choice;
      if(ch==='a') pref.weight='under-285';
      if(ch==='c') pref.weight='305-315';
    }
    if(/kopflastig|headheavy/i.test(q.q) && answers[i]){
      const ch = answers[i].choice;
      if(ch==='a') pref.head=102;
      if(ch==='b') pref.head=100;
    }
    if(/dämpfung|damping|comfort|armschonung/i.test(q.q) && answers[i]){
      const ch = answers[i].choice;
      if(ch==='a') pref.comfort='high';
      if(ch==='c') pref.comfort='low';
    }
  });

  return { styleKey, sentences, pref, counts };
}

// simple matcher to pick top 3 from inventory
function matchRackets(profile){
  // inventory objects expected: { name, link, image, style(optional) }
  if(!inventory || inventory.length===0) return [];
  // very simple scoring: textual heuristics + random tie-break
  const scored = inventory.map(it => {
    let score = 0;
    const name = (it.name||'').toLowerCase();
    const style = (it.style||'').toLowerCase();
    // boost with keywords
    if(profile.styleKey==='power') { if(style.includes('power')||name.includes('pure')||name.includes('drive')) score += 30; }
    if(profile.styleKey==='spin') { if(style.includes('spin')||name.includes('aero')||name.includes('spin')) score += 30; }
    if(profile.styleKey==='control') { if(style.includes('control')||name.includes('tour')||style.includes('feel')) score += 30; }
    if(profile.styleKey==='feel') { if(style.includes('feel')||style.includes('touch')||name.includes('phantom')) score += 30; }
    // slight preference for head size
    if(profile.pref && profile.pref.head && it.head_size){
      score -= Math.abs(profile.pref.head - it.head_size) * 0.1;
    }
    // small random value to shuffle similar items
    score += Math.random()*6;
    return {...it,score};
  });
  scored.sort((a,b)=>b.score - a.score);
  return scored.slice(0,3);
}

// show result UI
function showResult(){
  const profile = analyzeAnswers();
  const picks = matchRackets(profile);
  // fill style summary
  styleSummary.innerHTML = profile.sentences.map(s=>`<p>${escapeHtml(s)}</p>`).join('') +
    `<p><strong>${lang==='de'?'Empfohlenes Headsize & Gewicht:':'Recommended headsize & weight:'}</strong> ${profile.pref.head} in², ${profile.pref.weight}</p>`;

  // top pick
  if(picks[0]){
    const top = picks[0];
    topName.textContent = top.name;
    topWhy.textContent = top.style ? (lang==='de'? top.style : top.style) : (lang==='de'?'Warum dieser Schläger passt':'Why this racket fits');
    // image: use remote image URL if present; this is a deep-link to shop image (no hosting)
    if(top.image && top.image.length>10) topImage.src = top.image;
    else topImage.src = 'assets/placeholder_racket.svg';
    topLink.href = top.link || '#';
  } else {
    topName.textContent = (lang==='de'?'Keine Empfehlung gefunden':'No recommendation found');
    topWhy.textContent = '';
    topImage.src = 'assets/placeholder_racket.svg';
    topLink.href = '#';
  }

  // alternatives
  altList.innerHTML = '';
  picks.slice(1).forEach((it, i)=>{
    const wrap = document.createElement('div'); wrap.className='alt';
    wrap.innerHTML = `<div class="alt"><strong>${escapeHtml(it.name)}</strong><p>${escapeHtml(it.style||'')}</p><a class="btn" href="${it.link||'#'}" target="_blank" rel="noopener">${lang==='de'?'Zum Shop':'View'}</a></div>`;
    altList.appendChild(wrap);
  });

  // show/hide
  questionBox.classList.add('hidden');
  document.getElementById('quiz').classList.add('hidden');
  progressDots.classList.add('hidden');
  resultSection.classList.remove('hidden');
}

// helper: escape HTML
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// restart
restartBtn.addEventListener('click', ()=> {
  idx = 0; answers = [];
  resultSection.classList.add('hidden');
  document.getElementById('quiz').classList.remove('hidden');
  questionBox.classList.remove('hidden');
  progressDots.classList.remove('hidden');
  buildProgressDots();
  renderQuestion();
});

// initial load
loadAll();
