// ===============================
// 音声設定
// ===============================
const sounds = {
    correct: new Audio("sounds/correct.mp3"),
    incorrect: new Audio("sounds/incorrect.mp3"),
    cheers: new Audio("sounds/cheers.mp3"),

    // 考えている間ずっと流れるBGM
    countdown: new Audio("sounds/thinkingtime.mp3"),

    // 時間切れ
    timeup: new Audio("sounds/sinkingtime.mp3"),

    // 新しい問題が出たとき
    question: new Audio("sounds/question.mp3")
};
sounds.countdown.loop = true;

sounds.question.volume  = 1.0;
sounds.countdown.volume = 0.5;
// thinkingtime はループ再生
sounds.countdown.loop = true;

// ワンショット再生用
function playSound(name) {
    if (!sounds[name]) return;
    sounds[name].currentTime = 0;
    sounds[name].play().catch(() => {});
}

// thinkingtime 停止用
function stopThinkingTime() {
    sounds.countdown.pause();
    sounds.countdown.currentTime = 0;
}

// ===============================
// 状態管理
// ===============================
let allQuizData = [];
let filteredQuiz = [];
let currentIdx = 0;
let score = 0;
let timerId = null;
let timeLimit = 15;
let selectedLeft = null;
let matchedCount = 0;

// ===============================
// ランク（10問基準）
// ===============================
const ranks = [
    { threshold: 10, name: "琥珀の守護神", msg: "完璧です！マスター！" },
    { threshold: 8,  name: "至高の鑑定士", msg: "素晴らしい！" },
    { threshold: 5,  name: "熱心な愛好家", msg: "なかなかの腕前ですね。" },
    { threshold: 0,  name: "琥珀色の探求者", msg: "これから学びましょう！" }
];

// ===============================
// データ読み込み
// ===============================
async function loadData() {
    try {
        const response = await fetch("quizData_full.json");
        allQuizData = await response.json();
    } catch (e) {
        console.error("データ読み込みエラー:", e);
    }
}

// ===============================
// クイズ開始（ランダム・10問）
// ===============================
function startQuiz(lv) {
    const QUESTION_LIMIT = 10;

    let allQuestions = allQuizData.filter(d => d.level === lv);

    // ランダムシャッフル
    allQuestions.sort(() => Math.random() - 0.5);

    // 10問に制限
    filteredQuiz = allQuestions.slice(0, QUESTION_LIMIT);

    currentIdx = 0;
    score = 0;
    timeLimit = (lv === "上級" || lv === "カルト級") ? 30 : 15;

    document.getElementById("display-level").innerText = lv;
    document.getElementById("level-select").classList.add("hidden");
    document.getElementById("quiz-container").classList.remove("hidden");
    document.getElementById("timer-container").style.display =
        (lv === "組み合わせ") ? "none" : "block";

    showQuestion();
}

// ===============================
// 問題表示
// ===============================
function showQuestion() {
    // 新しい問題の合図
    playSound("question");

    // thinkingtime を必ずリセット
    stopThinkingTime();

    const q = filteredQuiz[currentIdx];

    document.getElementById("current-num").innerText =
        `${currentIdx + 1} / ${filteredQuiz.length}`;
    document.getElementById("question-text").innerText = q.q;

    const container = document.getElementById("options-container");
    container.innerHTML = "";

    document.getElementById("feedback").style.display = "none";
    document.getElementById("next-btn").style.display = "none";

    if (q.type === "matching") {
        matchedCount = 0;
        selectedLeft = null;
        renderMatching(q, container);
    } else {
        q.a.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.innerText = opt;
            btn.onclick = () => check(i);
            container.appendChild(btn);
        });
        startTimer();
    }
}

// ===============================
// マッチング問題
// ===============================
function renderMatching(q, container) {
    const grid = document.createElement("div");
    grid.className = "matching-grid";

    const leftCol = document.createElement("div");
    leftCol.className = "matching-column";

    const rightCol = document.createElement("div");
    rightCol.className = "matching-column";

    const shuffledRight = [...q.pairs].sort(() => Math.random() - 0.5);

    q.pairs.forEach(p => {
        const b = document.createElement("button");
        b.className = "match-btn";
        b.innerText = p.left;
        b.onclick = () => {
            document
                .querySelectorAll(".matching-column:first-child .match-btn")
                .forEach(x => x.classList.remove("selected"));
            b.classList.add("selected");
            selectedLeft = { b, id: p.id };
        };
        leftCol.appendChild(b);
    });

    shuffledRight.forEach(p => {
        const b = document.createElement("button");
        b.className = "match-btn";
        b.innerText = p.right;
        b.onclick = () => {
            if (!selectedLeft) return;
            if (selectedLeft.id === p.id) {
                playSound("correct");
                selectedLeft.b.classList.replace("selected", "matched");
                b.classList.add("matched");
                selectedLeft = null;
                matchedCount++;
                if (matchedCount === q.pairs.length) {
                    score++;
                    showFeedback(true, q.r, "COMPLETED!");
                }
            } else {
                playSound("incorrect");
                b.style.borderColor = "#ef5350";
                setTimeout(() => b.style.borderColor = "#555", 500);
            }
        };
        rightCol.appendChild(b);
    });

    grid.append(leftCol, rightCol);
    container.appendChild(grid);
}

// ===============================
// タイマー
// ===============================
function startTimer() {
    const bar = document.getElementById("timer-bar");
    bar.style.transition = "none";
    bar.style.width = "100%";
    void bar.offsetWidth;
    bar.style.transition = `width ${timeLimit}s linear`;
    bar.style.width = "0%";

    clearTimeout(timerId);

    // thinkingtime 開始
    sounds.countdown.currentTime = 0;
    sounds.countdown.play().catch(() => {});

    timerId = setTimeout(() => {
        stopThinkingTime();
        check(-1);
    }, timeLimit * 1000);
}

// ===============================
// 正誤判定
// ===============================
function check(idx) {
    stopThinkingTime();
    clearTimeout(timerId);

    const q = filteredQuiz[currentIdx];
    const btns = document.getElementsByClassName("option-btn");
    for (let b of btns) b.disabled = true;

    if (idx === q.c) {
        if (btns[idx]) btns[idx].classList.add("correct");
        playSound("correct");
        showFeedback(true, q.r, "CORRECT");
        score++;
    } else {
        if (idx !== -1 && btns[idx]) btns[idx].classList.add("wrong");
        if (btns[q.c]) btns[q.c].classList.add("correct");

        if (idx === -1) {
            playSound("timeup");
        } else {
            playSound("incorrect");
        }

        const app = document.getElementById("quiz-app");
        app.classList.add("shake");
        setTimeout(() => app.classList.remove("shake"), 300);

        showFeedback(false, q.r, idx === -1 ? "TIME UP" : "INCORRECT");
    }
}

// ===============================
// フィードバック
// ===============================
function showFeedback(isCorrect, rationale, status) {
    const resTxt = document.getElementById("result-text");
    resTxt.innerText = status;
    resTxt.style.color = isCorrect ? "#4caf50" : "#ef5350";
    document.getElementById("rationale-text").innerText = rationale;
    document.getElementById("feedback").style.display = "block";
    document.getElementById("next-btn").style.display = "block";
}

// ===============================
function handleNext() {
    currentIdx++;
    if (currentIdx < filteredQuiz.length) {
        showQuestion();
    } else {
        showResult();
    }
}

// ===============================
// 結果表示
// ===============================
function showResult() {
    stopThinkingTime();

    document.getElementById("timer-container").style.display = "none";
    document.getElementById("quiz-container").classList.add("hidden");
    document.getElementById("result-container").classList.remove("hidden");

    document.getElementById("final-score").innerText =
        `${score} / ${filteredQuiz.length}`;

    const rank = ranks.find(r => score >= r.threshold);
    document.getElementById("rank-name").innerText = rank.name;
    document.getElementById("praise-message").innerText = rank.msg;

    playSound("cheers");
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#D2691E", "#FFD700", "#F5F5F5"]
    });
}

// ===============================
function goHome() {
    stopThinkingTime();
    document.getElementById("result-container").classList.add("hidden");
    document.getElementById("level-select").classList.remove("hidden");
}

// ===============================
loadData();
