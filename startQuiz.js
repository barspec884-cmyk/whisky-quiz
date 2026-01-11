// ================= 音声管理 =================
let soundEnabled = localStorage.getItem("sound") !== "off";

const sounds = {
  correct: new Audio("sounds/correct.mp3"),
  incorrect: new Audio("sounds/incorrect.mp3"),
  cheers: new Audio("sounds/cheers.mp3"),
  countdown: new Audio("sounds/race-start-beeps.mp3"),
  timeup: new Audio("sounds/sinkingtime.mp3"),
  question: new Audio("sounds/question.mp3")
};

function playSound(name) {
  if (!soundEnabled || !sounds[name]) return;
  sounds[name].currentTime = 0;
  sounds[name].play().catch(() => {});
}

function stopAllSounds() {
  Object.values(sounds).forEach(s => { s.pause(); s.currentTime = 0; });
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem("sound", soundEnabled ? "on" : "off");
  const btn = document.getElementById("sound-toggle");
  if (btn) btn.innerText = soundEnabled ? "🔊 ON" : "🔇 OFF";
  if (!soundEnabled) stopAllSounds();
}

// ================= クイズ状態管理 =================
let allQuizData = [], filteredQuiz = [];
let currentIdx = 0, score = 0, timerId = null, timeLimit = 15;
let dataReady = false;
let leftSelected = null, matchedCount = 0;

// ================= データ読み込み =================
async function loadData() {
  try {
    const res = await fetch("quiz.json");
    const data = await res.json();

    // 配列でなければ空配列にする（←重要）
    const allQuiz = Array.isArray(data) ? data : (data.quiz || []);

    // マッチしない問題は除外
    filteredQuiz = allQuiz.filter(q =>
      q &&
      q.question &&
      q.choices &&
      Array.isArray(q.choices) &&
      q.choices.length >= 2 &&
      typeof q.answer !== "undefined"
    );

    // 1問も無ければダミーを入れる（止まらせない）
    if (filteredQuiz.length === 0) {
      filteredQuiz = [{
        question: "テスト問題",
        choices: ["OK", "NG"],
        answer: 0
      }];
    }

    // 準備完了
    document.getElementById("loading").style.display = "none";
    startQuiz();

  } catch (e) {
    console.error(e);

    // 失敗しても止めない（最重要）
    filteredQuiz = [{
      question: "仮問題",
      choices: ["START", "STOP"],
      answer: 0
    }];

    document.getElementById("loading").style.display = "none";
    startQuiz();
  }
}

loadData();

// ================= クイズ制御 =================
async function startQuiz(lv) {
  if (!dataReady) { alert("準備中です。"); return; }
  
  const levelSelect = document.getElementById("level-select");
  if (levelSelect) levelSelect.classList.add("hidden");

  runCountdown(() => {
    document.getElementById("quiz-container").classList.remove("hidden");
    document.getElementById("result-container").classList.add("hidden");

    // レベルフィルタリング
    filteredQuiz = allQuizData
      .filter(q => (lv === "組み合わせ") ? q.level === "組み合わせ" : (q.level === lv && q.level !== "組み合わせ"))
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);

    currentIdx = 0;
    score = 0;
    timeLimit = (lv === "上級" || lv === "カルト級" || lv === "組み合わせ") ? 30 : 15;
    
    const displayLv = document.getElementById("display-level");
    if (displayLv) displayLv.innerText = lv;
    
    showQuestion();
  });
}

function runCountdown(callback) {
  const overlay = document.getElementById("countdown-overlay");
  const numText = document.getElementById("countdown-num");
  overlay.style.display = "flex"; 
  overlay.classList.remove("hidden");
  playSound("countdown");
  
  let count = 3;
  numText.innerText = count;
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      numText.innerText = count;
    } else {
      clearInterval(interval);
      numText.innerText = "START!";
      setTimeout(() => {
        overlay.style.setProperty("display", "none", "important");
        overlay.classList.add("hidden");
        callback();
      }, 500);
    }
  }, 1000);
}

// ================= 問題表示 =================
function showQuestion() {
  stopAllSounds();
  playSound("question");
  const q = filteredQuiz[currentIdx];
  if (!q) { showResult(); return; }

  const box4 = document.getElementById("options-container");
  const boxMatch = document.getElementById("matching-container");

  // --- 追加・修正ポイント ---
  // 一旦両方を隠し、中身をリセットして「残骸」を消す
  box4.classList.add("hidden");
  box4.innerHTML = ""; 
  boxMatch.classList.add("hidden");
  boxMatch.innerHTML = "";
  // -----------------------

  document.getElementById("feedback").style.display = "none";
  document.getElementById("next-btn").style.display = "none";

  document.getElementById("current-num").innerText = `${currentIdx + 1}/${filteredQuiz.length}`;
  document.getElementById("question-text").innerText = q.q;

if (q.type === "matching") {

    boxMatch.classList.remove("hidden");
    setupMatching(q);
  } else {
    box4.classList.remove("hidden");
    q.a.forEach((t, i) => {
      const b = document.createElement("button");
      b.className = "option-btn";
      b.innerText = t;
      b.onclick = () => check(i);
      box4.appendChild(b);
    });
  }
  startTimer();
}

// --- マッチング形式のセットアップ ---
function setupMatching(q) {
  const boxMatch = document.getElementById("matching-container");
  boxMatch.innerHTML = `
    <div class="matching-grid">
      <div id="left-col" class="matching-column"></div>
      <div id="right-col" class="matching-column"></div>
    </div>`;
  
  leftSelected = null;
  matchedCount = 0;

  const leftItems = [...q.pairs].sort(() => Math.random() - 0.5);
  const rightItems = [...q.pairs].sort(() => Math.random() - 0.5);

  leftItems.forEach(item => {
    const b = document.createElement("button");
    b.className = "match-btn";
    b.innerText = item.left || item.l;
    b.onclick = () => {
      document.querySelectorAll("#left-col .match-btn").forEach(el => el.classList.remove("selected"));
      b.classList.add("selected");
      leftSelected = b.innerText;
    };
    document.getElementById("left-col").appendChild(b);
  });

  rightItems.forEach(item => {
    const b = document.createElement("button");
    b.className = "match-btn";
    b.innerText = item.right || item.r;
    b.onclick = () => {
      if (!leftSelected) return;
      const correctPair = q.pairs.find(p => (p.left || p.l) === leftSelected);
      if ((correctPair.right || correctPair.r) === b.innerText) {
        matchedCount++;
        markMatched(leftSelected, b.innerText); 
        if (matchedCount === q.pairs.length) { 
          check(99); // 全問正解
        }
      } else {
        b.classList.add("shake");
        setTimeout(() => b.classList.remove("shake"), 300);
      }
    };
    document.getElementById("right-col").appendChild(b);
  });
}

function markMatched(l, r) {
  document.querySelectorAll(".match-btn").forEach(b => {
    if (b.innerText === l || b.innerText === r) {
      b.classList.add("matched");
      b.disabled = true;
    }
  });
  leftSelected = null;
}

// ================= 判定・タイマー =================
function startTimer() {
  const bar = document.getElementById("timer-bar");
  if (!bar) return;
  bar.style.transition = "none";
  bar.style.width = "100%";
  void bar.offsetWidth; // リフロー強制
  bar.style.transition = `width ${timeLimit}s linear`;
  bar.style.width = "0%";
  
  clearTimeout(timerId);
  timerId = setTimeout(() => check(-1), timeLimit * 1000);
}

function check(idx) {
  stopAllSounds();
  clearTimeout(timerId);
  const q = filteredQuiz[currentIdx];

  // 1. マッチング全問正解の場合
  if (idx === 99) {
    score++;
    playSound("correct");
    applyMatchingSuccessEffect(); // 視覚演出
    showFeedback(true, q.r, "COMPLETE!");
    return;
  }

  // 2. 通常の4択判定
  const btns = document.querySelectorAll(".option-btn");
  btns.forEach(b => b.disabled = true);

  if (idx === q.c) {
    if (btns[idx]) btns[idx].classList.add("correct");
    score++;
    playSound("correct");
    showFeedback(true, q.r, "CORRECT");
  } else {
    if (idx > -1 && btns[idx]) btns[idx].classList.add("wrong");
    if (btns[q.c]) btns[q.c].classList.add("correct");
    playSound(idx === -1 ? "timeup" : "incorrect");
    showFeedback(false, q.r, idx === -1 ? "TIME UP" : "INCORRECT");
  }
}

function showFeedback(ok, txt, status) {
  const resText = document.getElementById("result-text");
  resText.innerText = status;
  resText.style.color = ok ? "#4caf50" : "#ef5350";
  document.getElementById("rationale-text").innerText = txt || "";
  document.getElementById("feedback").style.display = "block";
  document.getElementById("next-btn").style.display = "block";
}

function applyMatchingSuccessEffect() {
  document.querySelectorAll(".match-btn").forEach(b => {
    b.classList.add("match-all-correct");
    b.disabled = true;
  });
}

// ================= 進行管理 =================
function handleNext() {
  currentIdx++;
  if (currentIdx < filteredQuiz.length) { 
    showQuestion(); 
  } else { 
    showResult(); 
  }
}

function showResult() {
  stopAllSounds();
  clearTimeout(timerId);
  document.getElementById("quiz-container").classList.add("hidden");
  document.getElementById("result-container").classList.remove("hidden");
  document.getElementById("final-score").innerText = `${score}/${filteredQuiz.length}`;
  playSound("cheers");
  if (typeof confetti === "function") {
    confetti({ particleCount:120, spread:70, origin:{y:0.6} });
  }
}

function goHome() {
  stopAllSounds();
  clearTimeout(timerId);
  document.getElementById("result-container").classList.add("hidden");
  document.getElementById("quiz-container").classList.add("hidden");
  document.getElementById("level-select").classList.remove("hidden");
}