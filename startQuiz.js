// ================= 音声 =================
let soundEnabled = localStorage.getItem("sound") !== "off";

const sounds = {
  correct: new Audio("sounds/correct.mp3"),
  incorrect: new Audio("sounds/incorrect.mp3"),
  cheers: new Audio("sounds/cheers.mp3"),
  countdown: new Audio("sounds/race-start-beeps.mp3"), // アップロードされた音源名に修正
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
  document.getElementById("sound-toggle").innerText = soundEnabled ? "🔊 ON" : "🔇 OFF";
  if (!soundEnabled) stopAllSounds();
}

// ================= 状態 =================
let allQuizData = [], filteredQuiz = [];
let currentIdx = 0, score = 0, timerId = null, timeLimit = 15;
let dataReady = false;

// ================= データ =================
async function loadData() {
  try {
    const res = await fetch("quizData_full.json");
    allQuizData = await res.json();
    dataReady = true;
  } catch (e) {
    console.error("データの読み込みに失敗しました:", e);
  }
}
loadData();

// ================= クイズ開始 =================
async function startQuiz(lv) {
  if (!dataReady) { alert("準備中です"); return; }

  runCountdown(() => {
    document.getElementById("level-select").classList.add("hidden");
    document.getElementById("quiz-container").classList.remove("hidden");

    filteredQuiz = allQuizData.filter(q => q.level === lv).sort(() => Math.random() - 0.5).slice(0, 10);
    currentIdx = 0; score = 0;
    timeLimit = (lv === "上級" || lv === "カルト級" || lv === "組み合わせ") ? 30 : 15;
    document.getElementById("display-level").innerText = lv;
    showQuestion();
  });
}

// --- カウントダウン演出 ---
function runCountdown(callback) {
  const overlay = document.getElementById("countdown-overlay");
  const numText = document.getElementById("countdown-num"); // ←ここを追加しました
  overlay.style.display = "flex";
  
  playSound("countdown"); // レーススタート音を再生
  
  let count = 3;
  numText.innerText = count;
  numText.classList.add("pop-num");

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      numText.innerText = count;
      numText.classList.remove("pop-num");
      void numText.offsetWidth;
      numText.classList.add("pop-num");
    } else {
      clearInterval(interval);
      numText.innerText = "START!";
      setTimeout(() => {
        overlay.style.display = "none";
        overlay.classList.add("hidden");
        callback();
      }, 500);
    }
  }, 1000);
}

// ================= 問題表示（統合版） =================
function showQuestion() {
  stopAllSounds();
  playSound("question");

  const q = filteredQuiz[currentIdx];
  if (!q) { showResult(); return; }

  document.getElementById("current-num").innerText = `${currentIdx + 1}/${filteredQuiz.length}`;
  document.getElementById("question-text").innerText = q.q;

  const box4 = document.getElementById("options-container");
  const boxMatch = document.getElementById("matching-container");
  
  document.getElementById("feedback").style.display = "none";
  document.getElementById("next-btn").style.display = "none";

  if (q.level === "組み合わせ") {
    box4.classList.add("hidden");
    boxMatch.classList.remove("hidden");
    setupMatching(q);
  } else {
    boxMatch.classList.add("hidden");
    box4.classList.remove("hidden");
    box4.innerHTML = "";
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

// --- 組み合わせ問題のロジック ---
let leftSelected = null;
let matchedCount = 0;

function setupMatching(q) {
  const boxMatch = document.getElementById("matching-container");
  boxMatch.innerHTML = '<div class="matching-grid"><div id="left-col" class="matching-column"></div><div id="right-col" class="matching-column"></div></div>';
  leftSelected = null;
  matchedCount = 0;

  const leftItems = [...q.pairs].sort(() => Math.random() - 0.5);
  const rightItems = [...q.pairs].sort(() => Math.random() - 0.5);

  leftItems.forEach(item => {
    const b = document.createElement("button");
    b.className = "match-btn";
    b.innerText = item.l;
    b.onclick = () => {
      document.querySelectorAll("#left-col .match-btn").forEach(el => el.classList.remove("selected"));
      b.classList.add("selected");
      leftSelected = item.l;
    };
    document.getElementById("left-col").appendChild(b);
  });

  rightItems.forEach(item => {
    const b = document.createElement("button");
    b.className = "match-btn";
    b.innerText = item.r;
    b.onclick = () => {
      if (!leftSelected) return;
      const correctPair = q.pairs.find(p => p.l === leftSelected);
      if (correctPair.r === item.r) {
        markMatched(leftSelected, item.r);
        matchedCount++;
        if (matchedCount === q.pairs.length) { check(99); }
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

// --- タイマーと判定 ---
function startTimer() {
  const bar = document.getElementById("timer-bar");
  bar.style.transition = "none";
  bar.style.width = "100%";
  void bar.offsetWidth;
  bar.style.transition = `width ${timeLimit}s linear`;
  bar.style.width = "0%";
  clearTimeout(timerId);
  timerId = setTimeout(() => check(-1), timeLimit * 1000);
}

function check(idx) {
  stopAllSounds();
  clearTimeout(timerId);
  const q = filteredQuiz[currentIdx];
  
  // 組み合わせ全問正解(99)の場合
  if (idx === 99) {
    score++;
    playSound("correct");
    showFeedback(true, q.r, "COMPLETE!");
    return;
  }

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
  document.getElementById("result-text").innerText = status;
  document.getElementById("result-text").style.color = ok ? "#4caf50" : "#ef5350";
  document.getElementById("rationale-text").innerText = txt || "";
  document.getElementById("feedback").style.display = "block";
  document.getElementById("next-btn").style.display = "block";
}

function handleNext() {
  currentIdx++;
  if (currentIdx < filteredQuiz.length) { showQuestion(); } else { showResult(); }
}

function showResult() {
  stopAllSounds();
  document.getElementById("quiz-container").classList.add("hidden");
  document.getElementById("result-container").classList.remove("hidden");
  document.getElementById("final-score").innerText = `${score}/${filteredQuiz.length}`;
  playSound("cheers");
  confetti({ particleCount:120, spread:70, origin:{y:0.6} });
}

function goHome() {
  stopAllSounds();
  clearTimeout(timerId);
  document.getElementById("result-container").classList.add("hidden");
  document.getElementById("quiz-container").classList.add("hidden");
  document.getElementById("level-select").classList.remove("hidden");
}