// --- 音声オブジェクト ---
const sfx = {
    countdown: new Audio('sounds/countdown.mp3'),
    question: new Audio('sounds/question.mp3'),
    correct: new Audio('sounds/correct.mp3'),
    incorrect: new Audio('sounds/incorrect.mp3'),
    thinking: new Audio('sounds/thinkingtime.mp3'),
    cheers: new Audio('sounds/cheers.mp3')
};
sfx.thinking.loop = true;

// --- グローバル変数 ---
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timerInterval;
let timeLeft = 100;
let selectedMatches = { left: null, right: null };
let matchCount = 0;
let soundEnabled = true;
let currentWrongCount = 0;

function playSound(key) {
    if (soundEnabled && sfx[key]) {
        sfx[key].currentTime = 0;
        sfx[key].play().catch(() => {});
    }
}

function stopAllSounds() {
    Object.values(sfx).forEach(a => { a.pause(); a.currentTime = 0; });
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('sound-toggle');
    btn.innerText = soundEnabled ? '🔊 ON' : '🔈 OFF';
    if (!soundEnabled) stopAllSounds();
}

// ★ここが「startQuiz」関数です！
function startQuiz(level) {
    stopAllSounds();
    
    if (level === '実力テスト') {
        // 全問題データを使用
        currentQuestions = [...whiskyQuizData]; 
    } else {
        // 指定されたレベルのみ抽出
        currentQuestions = whiskyQuizData.filter(q => q.level === level);
    }

    // 10問をランダムに選ぶ
    currentQuestions = currentQuestions.sort(() => Math.random() - 0.5).slice(0, 10);
    
    if (currentQuestions.length === 0) return alert("問題データが見つかりません。");

    score = 0;
    currentQuestionIndex = 0;
    document.getElementById('level-select').classList.add('hidden');
    
    showCountdown(() => {
        document.getElementById('quiz-container').classList.remove('hidden');
        showQuestion();
    });
}

function showCountdown(callback) {
    const overlay = document.getElementById('countdown-overlay');
    const numDisplay = document.getElementById('countdown-num');
    overlay.classList.remove('hidden');
    playSound('countdown');
    let count = 3;
    numDisplay.innerText = count;
    const interval = setInterval(() => {
        count--;
        if (count > 0) { numDisplay.innerText = count; } 
        else { clearInterval(interval); overlay.classList.add('hidden'); callback(); }
    }, 1000);
}

function showQuestion() {
    stopAllSounds();
    resetUI();
    currentWrongCount = 0;
    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('display-level').innerText = q.level;
    document.getElementById('current-num').innerText = `${currentQuestionIndex + 1} / ${currentQuestions.length}`;
    document.getElementById('question-text').innerText = q.q;

    playSound('question');
    setTimeout(() => playSound('thinking'), 500);

    if (q.type === 'matching') { renderMatching(q); } 
    else { renderOptions(q); }
    startTimer();
}

function renderOptions(q) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    container.classList.remove('hidden');

    q.a.forEach((text, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = text;
        if (q.type === 'multiple') {
            btn.onclick = () => btn.classList.toggle('selected');
        } else {
            btn.onclick = () => checkAnswer(index);
        }
        container.appendChild(btn);
    });

    if (q.type === 'multiple') {
        const submitBtn = document.createElement('button');
        submitBtn.className = 'next-btn';
        submitBtn.style.display = 'block';
        submitBtn.innerText = '回答を確定する';
        submitBtn.onclick = () => {
            const btns = document.querySelectorAll('.option-btn');
            const selected = [];
            btns.forEach((b, i) => { if(b.classList.contains('selected')) selected.push(i); });
            const isCorrect = q.c.length === selected.length && q.c.every(v => selected.includes(v));
            finalizeQuestion(isCorrect, q);
        };
        container.appendChild(submitBtn);
    }
}

function checkAnswer(idx) {
    const q = currentQuestions[currentQuestionIndex];
    const isCorrect = (idx === q.c);
    finalizeQuestion(isCorrect, q, idx);
}

function finalizeQuestion(isCorrect, q, idx = -1) {
    clearInterval(timerInterval);
    sfx.thinking.pause();
    playSound(isCorrect ? 'correct' : 'incorrect');

    const btns = document.querySelectorAll('.option-btn');
    btns.forEach((btn, i) => {
        btn.disabled = true;
        const isAnswer = Array.isArray(q.c) ? q.c.includes(i) : i === q.c;
        if (isAnswer) {
            btn.classList.add('correct');
        } else if (i === idx || btn.classList.contains('selected')) {
            btn.classList.add('wrong');
        }
    });

    if (isCorrect) score += (q.points || 10);
    showFeedback(isCorrect, q.r);
}

function renderMatching(q) {
    const container = document.getElementById('matching-container');
    container.innerHTML = '';
    container.classList.remove('hidden');
    matchCount = 0;
    const grid = document.createElement('div');
    grid.className = 'matching-grid';
    const leftCol = document.createElement('div');
    leftCol.className = 'matching-column';
    const rightCol = document.createElement('div');
    rightCol.className = 'matching-column';

    const lefts = q.pairs.map((p, i) => ({ text: p.left, id: i })).sort(() => Math.random() - 0.5);
    const rights = q.pairs.map((p, i) => ({ text: p.right, id: i })).sort(() => Math.random() - 0.5);

    lefts.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'match-btn';
        btn.innerText = item.text;
        btn.onclick = () => selectMatch(btn, 'left', item.id, q);
        leftCol.appendChild(btn);
    });
    rights.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'match-btn';
        btn.innerText = item.text;
        btn.onclick = () => selectMatch(btn, 'right', item.id, q);
        rightCol.appendChild(btn);
    });
    grid.appendChild(leftCol); grid.appendChild(rightCol);
    container.appendChild(grid);
}

function selectMatch(btn, side, id, q) {
    if (btn.classList.contains('matched')) return;
    const siblings = btn.parentElement.querySelectorAll('.match-btn');
    siblings.forEach(s => s.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMatches[side] = { btn, id };

    if (selectedMatches.left && selectedMatches.right) {
        if (selectedMatches.left.id === selectedMatches.right.id) {
            playSound('correct');
            selectedMatches.left.btn.classList.replace('selected', 'matched');
            selectedMatches.right.btn.classList.replace('selected', 'matched');
            selectedMatches = { left: null, right: null };
            matchCount++;
            if (matchCount === q.pairs.length) {
                clearInterval(timerInterval);
                const finalPoints = Math.max(0, (q.points || 10) - currentWrongCount);
                score += finalPoints;
                showFeedback(true, `全正解！(減点: -${currentWrongCount})\n${q.r}`);
            }
        } else {
            currentWrongCount++;
            playSound('incorrect');
            document.getElementById('quiz-app').classList.add('shake');
            
            if (currentWrongCount >= 3) {
                clearInterval(timerInterval);
                setTimeout(() => {
                    document.getElementById('quiz-app').classList.remove('shake');
                    showFeedback(false, `3回ミスで終了！正解は：\n${q.pairs.map(p => p.left + "ー" + p.right).join(", ")}`);
                }, 500);
            } else {
                setTimeout(() => {
                    document.getElementById('quiz-app').classList.remove('shake');
                    selectedMatches.left.btn.classList.remove('selected');
                    selectedMatches.right.btn.classList.remove('selected');
                    selectedMatches = { left: null, right: null };
                }, 500);
            }
        }
    }
}

function showFeedback(isCorrect, rationale) {
    const fb = document.getElementById('feedback');
    fb.style.display = 'block';
    const resText = document.getElementById('result-text');
    resText.innerText = isCorrect ? '正解！' : '不正解...';
    resText.style.color = isCorrect ? '#4caf50' : '#ef5350';
    document.getElementById('rationale-text').innerText = rationale;
    document.getElementById('next-btn').style.display = 'block';
}

function startTimer() {
    timeLeft = 100;
    const bar = document.getElementById('timer-bar');
    const q = currentQuestions[currentQuestionIndex];
    timerInterval = setInterval(() => {
        timeLeft -= 0.67; 
        bar.style.width = timeLeft + '%';
        if (timeLeft <= 0) { 
            clearInterval(timerInterval); 
            if (q.type === 'matching') {
                showFeedback(false, `時間切れ！正解は：\n${q.pairs.map(p => p.left + "ー" + p.right).join(", ")}`);
            } else {
                checkAnswer(-1); 
            }
        }
    }, 100);
}

function resetUI() {
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('options-container').classList.add('hidden');
    document.getElementById('matching-container').classList.add('hidden');
    document.getElementById('timer-bar').style.width = '100%';
}

function handleNext() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) showQuestion();
    else showFinalResult();
}

function showFinalResult() {
    stopAllSounds();
    document.getElementById('quiz-container').classList.add('hidden');
    document.getElementById('result-container').classList.remove('hidden');
    
    const myRank = quizRanks.sort((a,b) => b.minScore - a.minScore).find(r => score >= r.minScore) || quizRanks[0];
    
    document.getElementById('final-score').innerText = score;
    document.getElementById('rank-emblem').innerText = myRank.emblem;
    document.getElementById('rank-name').innerText = myRank.name;
    document.getElementById('praise-message').innerText = myRank.message;
    
    playSound('cheers');
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}