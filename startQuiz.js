
// --- 音声設定（soundsフォルダの中を参照するように修正） ---
const sounds = {
    correct: new Audio("sounds/correct.mp3"),
    incorrect: new Audio("sounds/incorrect.mp3"),
    cheers: new Audio("sounds/cheers.mp3"),
    countdown: new Audio("sounds/countdown.mp3"),
    timeup: new Audio("sounds/sinkingtime.mp3")
};

function playSound(name) {
    if (!sounds[name]) return;
    sounds[name].currentTime = 0;
    sounds[name].play().catch(() => {});
}

let allQuizData = [];
let filteredQuiz = [];
let currentIdx = 0;
let score = 0;
let timerId = null;
let countdownInterval = null;
let timeLimit = 15;
let selectedLeft = null;
let matchedCount = 0;

// 10問制限に合わせた評価基準
const ranks = [
    { threshold: 10, name: "琥珀の守護神", msg: "完璧です！マスター！" },
    { threshold: 8,  name: "至高の鑑定士", msg: "素晴らしい！" },
    { threshold: 5,  name: "熱心な愛好家", msg: "なかなかの腕前ですね。" },
    { threshold: 0,  name: "琥珀色の探求者", msg: "これから学びましょう！" }
];

// --- データの読み込み部分 ---
async function loadData() {
    try {
        // ここを書き換えます
        const response = await fetch('quizData_full.json'); 
        allQuizData = await response.json();
    } catch (e) { 
        console.error("データ読み込みエラー:", e); 
    }
}
// ★ ランダム & 10問制限を実装した関数
function startQuiz(lv) {
    const QUESTION_LIMIT = 10;

    // レベルで問題を抽出
    let allQuestions = allQuizData.filter(d => d.level === lv);

    // ランダムに並び替え
    allQuestions.sort(() => Math.random() - 0.5);

    // 10問だけ使う
    filteredQuiz = allQuestions.slice(0, QUESTION_LIMIT);

    currentIdx = 0;
    score = 0;
    timeLimit = (lv === '上級' || lv === 'カルト級') ? 30 : 15;

    document.getElementById('display-level').innerText = lv;
    document.getElementById('level-select').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
    document.getElementById('timer-container').style.display =
        (lv === '組み合わせ') ? 'none' : 'block';

    showQuestion();
}

// --- 以下、クイズ進行の基本ロジック ---
function showQuestion() {
    const q = filteredQuiz[currentIdx];
    document.getElementById('current-num').innerText = `${currentIdx + 1} / ${filteredQuiz.length}`;
    document.getElementById('question-text').innerText = q.q;
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';

    if (q.type === "matching") {
        matchedCount = 0; selectedLeft = null;
        renderMatching(q, container);
    } else {
        q.a.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt;
            btn.onclick = () => check(i);
            container.appendChild(btn);
        });
        startTimer();
    }
}

function renderMatching(q, container) {
    const grid = document.createElement('div'); grid.className = 'matching-grid';
    const leftCol = document.createElement('div'); leftCol.className = 'matching-column';
    const rightCol = document.createElement('div'); rightCol.className = 'matching-column';
    const shuffledRight = [...q.pairs].sort(() => Math.random() - 0.5);

    q.pairs.forEach(p => {
        const b = document.createElement('button'); b.className = 'match-btn'; b.innerText = p.left;
        b.onclick = () => {
            document.querySelectorAll('.matching-column:first-child .match-btn').forEach(x => x.classList.remove('selected'));
            b.classList.add('selected'); selectedLeft = { b, id: p.id };
        };
        leftCol.appendChild(b);
    });

    shuffledRight.forEach(p => {
        const b = document.createElement('button'); b.className = 'match-btn'; b.innerText = p.right;
        b.onclick = () => {
            if(!selectedLeft) return;
            if(selectedLeft.id === p.id) {
                playSound('correct');
                selectedLeft.b.classList.replace('selected', 'matched');
                b.classList.add('matched'); selectedLeft = null; matchedCount++;
                if(matchedCount === q.pairs.length) { score++; showFeedback(true, q.r, "COMPLETED!"); }
            } else {
                playSound('incorrect');
                b.style.borderColor = "#ef5350"; setTimeout(() => b.style.borderColor = "#555", 500);
            }
        };
        rightCol.appendChild(b);
    });
    grid.append(leftCol, rightCol); container.appendChild(grid);
}

function startTimer() {
    const bar = document.getElementById('timer-bar');
    bar.style.transition = 'none'; bar.style.width = '100%'; void bar.offsetWidth;
    bar.style.transition = `width ${timeLimit}s linear`; bar.style.width = '0%';
    clearTimeout(timerId);
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => playSound('countdown'), 1000);
    timerId = setTimeout(() => {
        clearInterval(countdownInterval);
        check(-1);
    }, timeLimit * 1000);
}

function check(idx) {
    clearTimeout(timerId);
    clearInterval(countdownInterval);
    const q = filteredQuiz[currentIdx];
    const btns = document.getElementsByClassName('option-btn');
    for(let b of btns) b.disabled = true;

    if(idx === q.c) {
        if(btns[idx]) btns[idx].classList.add('correct');
        playSound('correct');
        showFeedback(true, q.r, "CORRECT"); score++;
    } else {
        if(idx !== -1 && btns[idx]) btns[idx].classList.add('wrong');
        if(btns[q.c]) btns[q.c].classList.add('correct');
        if (idx === -1) { playSound('timeup'); } else { playSound('incorrect'); }
        const app = document.getElementById('quiz-app');
        app.classList.add('shake'); setTimeout(() => app.classList.remove('shake'), 300);
        showFeedback(false, q.r, idx === -1 ? "TIME UP" : "INCORRECT");
    }
}

function showFeedback(isCorrect, rationale, status) {
    const resTxt = document.getElementById('result-text');
    resTxt.innerText = status; resTxt.style.color = isCorrect ? "#4caf50" : "#ef5350";
    document.getElementById('rationale-text').innerText = rationale;
    document.getElementById('feedback').style.display = 'block';
    document.getElementById('next-btn').style.display = 'block';
}

function handleNext() {
    currentIdx++;
    if(currentIdx < filteredQuiz.length) showQuestion(); else showResult();
}

function showResult() {
    document.getElementById('timer-container').style.display = 'none';
    document.getElementById('quiz-container').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');
    document.getElementById('final-score').innerText = `${score} / ${filteredQuiz.length}`;
    const rank = ranks.find(r => score >= r.threshold);
    document.getElementById('rank-name').innerText = rank.name;
    document.getElementById('praise-message').innerText = rank.msg;
    playSound('cheers');
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#D2691E', '#FFD700', '#F5F5F5'] });
}

function goHome() {
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('level-select').classList.remove('hidden');
}

loadData();