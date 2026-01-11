// ================= 音声 =================
let soundEnabled = localStorage.getItem("sound") !== "off";

const sounds = {
  correct: new Audio("sounds/correct.mp3"),
  incorrect: new Audio("sounds/incorrect.mp3"),
  cheers: new Audio("sounds/cheers.mp3"),
  countdown: new Audio("sounds/thinkingtime.mp3"), // ここがsinkingtimeになっていないか確認
  timeup: new Audio("sounds/sinkingtime.mp3"),
  question: new Audio("sounds/question.mp3")
};
sounds.countdown.loop = true;
sounds.countdown.volume = 0.1;

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

// ================= クイズ =================
async function startQuiz(lv) {
  if (!dataReady) { alert("準備中です"); return; }

  // カウントダウン開始
  runCountdown(() => {
    document.getElementById("level-select").classList.add("hidden");
    document.getElementById("quiz-container").classList.remove("hidden");

    filteredQuiz = allQuizData.filter(q => q.level === lv).sort(() => Math.random() - 0.5).slice(0, 10);
    currentIdx = 0; score = 0;
    timeLimit = (lv === "上級" || lv === "カルト級") ? 30 : 15;
    document.getElementById("display-level").innerText = lv;
    showQuestion();
  });
}

// 追加：演出用カウントダウン関数
function runCountdown(callback) {
  const overlay = document.getElementById("countdown-overlay");
  const numText = document.getElementById("countdown-num");
  overlay.style.display = "flex"; // ここで表示
  overlay.classList.remove("hidden");
  
  let count = 3;
  numText.innerText = count;
  numText.classList.add("pop-num");

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      numText.innerText = count;
      // アニメーションを再トリガー
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

function showQuestion() {
  stopAllSounds();
  playSound("question");

  const q = filteredQuiz[currentIdx];
  if (!q) { showResult(); return; } // 安全策

  document.getElementById("current-num").innerText = `${currentIdx + 1}/${filteredQuiz.length}`;
  document.getElementById("question-text").innerText = q.q;

  const box = document.getElementById("options-container");
  box.innerHTML = "";
  document.getElementById("feedback").style.display = "none";
  document.getElementById("next-btn").style.display = "none";

  q.a.forEach((t, i) => {
    const b = document.createElement("button");
    b.className = "option-btn";
    b.innerText = t;
    b.onclick = () => check(i);
    box.appendChild(b);
  });
  startTimer();
}

function startTimer() {
  const bar = document.getElementById("timer-bar");
  bar.style.transition = "none";
  bar.style.width = "100%";
  void bar.offsetWidth; // リフロー強制
  bar.style.transition = `width ${timeLimit}s linear`;
  bar.style.width = "0%";

  playSound("countdown");
  clearTimeout(timerId);
  timerId = setTimeout(() => check(-1), timeLimit * 1000);
}

function check(idx) {
  stopAllSounds();
  clearTimeout(timerId);
  const q = filteredQuiz[currentIdx];
  const btns = document.querySelectorAll(".option-btn");
  btns.forEach(b => b.disabled = true);

  const correct = q.c;
  if (idx === correct) {
    if (btns[idx]) btns[idx].classList.add("correct");
    score++;
    playSound("correct");
    showFeedback(true, q.r, "CORRECT");
  } else {
    if (idx > -1 && btns[idx]) btns[idx].classList.add("wrong");
    if (btns[correct]) btns[correct].classList.add("correct");
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
  if (currentIdx < filteredQuiz.length) {
    showQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  stopAllSounds();
  document.getElementById("quiz-container").classList.add("hidden");
  document.getElementById("result-container").classList.remove("hidden");
  document.getElementById("final-score").innerText = `${score}/${filteredQuiz.length}`;
  playSound("cheers");
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.6 }
  });
}

function goHome() {
  stopAllSounds();
  clearTimeout(timerId);
  document.getElementById("result-container").classList.add("hidden");
  document.getElementById("quiz-container").classList.add("hidden");
  document.getElementById("level-select").classList.remove("hidden");
}