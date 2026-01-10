async function startQuiz(lv) {
    if (allQuizData.length === 0) return;

    // 画面切り替え
    document.getElementById("level-select").classList.add("hidden");
    const overlay = document.getElementById("countdown-overlay");
    const numDisplay = document.getElementById("countdown-num");
    const labelDisplay = document.getElementById("countdown-label");
    overlay.classList.remove("hidden");

    // データの準備
    let allQuestions = allQuizData.filter(d => d.level === lv);
    allQuestions.sort(() => Math.random() - 0.5);
    filteredQuiz = allQuestions.slice(0, 10);
    currentIdx = 0; score = 0;
    document.getElementById("display-level").innerText = lv;

    // 音の再生（エラーが起きても無視して進む設定）
    try {
        if (sounds.raceStart) {
            sounds.raceStart.currentTime = 0;
            sounds.raceStart.play().catch(e => console.log("Audio play blocked"));
        }
    } catch (e) { console.log("Sound Error, but continuing..."); }

    const counts = ["3", "2", "1", "GO!"];
    for (let i = 0; i < counts.length; i++) {
        numDisplay.innerText = counts[i];
        labelDisplay.innerText = (i === 3) ? "START!" : "READY...";

        if (i === 3) overlay.classList.add("flash-white");

        numDisplay.classList.remove("pop-num");
        void numDisplay.offsetWidth; 
        numDisplay.classList.add("pop-num");

        // 1秒待機（ここが実行されれば 3, 2, 1 と動きます）
        await new Promise(r => setTimeout(r, 1000));
    }

    overlay.classList.remove("flash-white");
    overlay.classList.add("hidden");
    document.getElementById("quiz-container").classList.remove("hidden");
    showQuestion();
}
sounds.countdown.loop = true;

// ===============================
// 2. 状態管理
// ===============================
let allQuizData = [], filteredQuiz = [], currentIdx = 0, score = 0, timerId = null;
let timeLimit = 15, selectedLeft = null, matchedCount = 0;

const ranks = [
    { threshold: 10, name: "琥珀の守護神", msg: "完璧です！マスター！" },
    { threshold: 8,  name: "至高の鑑定士", msg: "素晴らしい！" },
    { threshold: 5,  name: "熱心な愛好家", msg: "なかなかの腕前ですね。" },
    { threshold: 0,  name: "琥珀色の探求者", msg: "これから学びましょう！" }
];

async function loadData() {
    try {
        const response = await fetch("quizData_full.json");
        allQuizData = await response.json();
        console.log("Data Loaded");
    } catch (e) { console.error("Load Error", e); }
}

function playSound(name) { 
    if (sounds[name]) { 
        sounds[name].currentTime = 0; 
        sounds[name].play().catch(() => {}); 
    } 
}

function stopThinkingTime() { sounds.countdown.pause(); sounds.countdown.currentTime = 0; }

// ===============================
// 3. クイズ開始（3-2-1 カウントダウン）
// ===============================
async function startQuiz(lv) {
    if (allQuizData.length === 0) return;

    // 画面切り替え
    document.getElementById("level-select").classList.add("hidden");
    const overlay = document.getElementById("countdown-overlay");
    const numDisplay = document.getElementById("countdown-num");
    const labelDisplay = document.getElementById("countdown-label");
    overlay.classList.remove("hidden");

    // データの準備
    let allQuestions = allQuizData.filter(d => d.level === lv);
    allQuestions.sort(() => Math.random() - 0.5);
    filteredQuiz = allQuestions.slice(0, 10);
    currentIdx = 0; score = 0;
    timeLimit = (lv === "上級" || lv === "カルト級") ? 30 : 15;
    document.getElementById("display-level").innerText = lv;

    // 音の再生（ピッ、ピッ、ピッ、ピー！）
    playSound("raceStart");

    const counts = ["3", "2", "1", "GO!"];
    for (let i = 0; i < counts.length; i++) {
        numDisplay.innerText = counts[i];
        labelDisplay.innerText = (i === 3) ? "START!" : "READY...";

        // GO!でフラッシュ演出
        if (i === 3) overlay.classList.add("flash-white");

        numDisplay.classList.remove("pop-num");
        void numDisplay.offsetWidth; 
        numDisplay.classList.add("pop-num");

        await new Promise(r => setTimeout(r, 1000));
    }

    // クイズ本編へ
    overlay.classList.remove("flash-white");
    overlay.classList.add("hidden");
    document.getElementById("quiz-container").classList.remove("hidden");
    document.getElementById("timer-container").style.display = (lv === "組み合わせ") ? "none" : "block";
    showQuestion();
}

// ===============================
// 4. クイズ本編のロジック
// ===============================
function showQuestion() {
    playSound("question");
    stopThinkingTime();
    const q = filteredQuiz[currentIdx];
    document.getElementById("current-num").innerText = `${currentIdx + 1} / ${filteredQuiz.length}`;
    document.getElementById("question-text").innerText = q.q;
    const container = document.getElementById("options-container");
    container.innerHTML = "";
    document.getElementById("feedback").style.display = "none";
    document.getElementById("next-btn").style.display = "none";

    if (q.type === "matching") {
        matchedCount = 0; selectedLeft = null;
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

function renderMatching(q, container) {
    const grid = document.createElement("div");
    grid.className = "matching-grid";
    const leftCol = document.createElement("div"); leftCol.className = "matching-column";
    const rightCol = document.createElement("div"); rightCol.className = "matching-column";
    const shuffledRight = [...q.pairs].sort(() => Math.random() - 0.5);
    q.pairs.forEach(p => {
        const b = document.createElement("button"); b.className = "match-btn"; b.innerText = p.left;
        b.onclick = () => {
            document.querySelectorAll(".matching-column:first-child .match-btn").forEach(x => x.classList.remove("selected"));
            b.classList.add("selected");
            selectedLeft = { b, id: p.id };
        };
        leftCol.appendChild(b);
    });
    shuffledRight.forEach(p => {
        const b = document.createElement("button"); b.className = "match-btn"; b.innerText = p.right;
        b.onclick = () => {
            if (!selectedLeft) return;
            if (selectedLeft.id === p.id) {
                playSound("correct");
                selectedLeft.b.classList.replace("selected", "matched");
                b.classList.add("matched");
                selectedLeft = null; matchedCount++;
                if (matchedCount === q.pairs.length) { score++; showFeedback(true, q.r, "COMPLETED!"); }
            } else { playSound("incorrect"); }
        };
        rightCol.appendChild(b);
    });
    grid.append(leftCol, rightCol); container.appendChild(grid);
}

function startTimer() {
    const bar = document.getElementById("timer-bar");
    bar.style.transition = "none"; bar.style.width = "100%";
    void bar.offsetWidth;
    bar.style.transition = `width ${timeLimit}s linear`;
    bar.style.width = "0%";
    clearTimeout(timerId);
    sounds.countdown.play().catch(() => {});
    timerId = setTimeout(() => { stopThinkingTime(); check(-1); }, timeLimit * 1000);
}

function check(idx) {
    stopThinkingTime(); clearTimeout(timerId);
    const q = filteredQuiz[currentIdx];
    const btns = document.getElementsByClassName("option-btn");
    for (let b of btns) b.disabled = true;
    if (idx === q.c) {
        if (btns[idx]) btns[idx].classList.add("correct");
        playSound("correct"); showFeedback(true, q.r, "CORRECT"); score++;
    } else {
        if (idx !== -1 && btns[idx]) btns[idx].classList.add("wrong");
        if (btns[q.c]) btns[q.c].classList.add("correct");
        playSound(idx === -1 ? "timeup" : "incorrect");
        document.getElementById("quiz-app").classList.add("shake");
        setTimeout(() => document.getElementById("quiz-app").classList.remove("shake"), 300);
        showFeedback(false, q.r, idx === -1 ? "TIME UP" : "INCORRECT");
    }
}

function showFeedback(isCorrect, rationale, status) {
    document.getElementById("result-text").innerText = status;
    document.getElementById("result-text").style.color = isCorrect ? "#4caf50" : "#ef5350";
    document.getElementById("rationale-text").innerText = rationale;
    document.getElementById("feedback").style.display = "block";
    document.getElementById("next-btn").style.display = "block";
}

function handleNext() {
    currentIdx++;
    if (currentIdx < filteredQuiz.length) showQuestion(); else showResult();
}

function showResult() {
    stopThinkingTime();
    document.getElementById("quiz-container").classList.add("hidden");
    document.getElementById("result-container").classList.remove("hidden");
    document.getElementById("final-score").innerText = `${score} / ${filteredQuiz.length}`;
    const rank = ranks.find(r => score >= r.threshold);
    document.getElementById("rank-name").innerText = rank.name;
    document.getElementById("praise-message").innerText = rank.msg;
    playSound("cheers");
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#D2691E", "#FFD700", "#F5F5F5"] });
}

function goHome() {
    stopThinkingTime();
    document.getElementById("result-container").classList.add("hidden");
    document.getElementById("level-select").classList.remove("hidden");
}

loadData();