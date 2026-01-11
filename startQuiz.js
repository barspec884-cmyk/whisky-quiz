/ ================= 音声 =================
let soundEnabled = localStorage.getItem("sound") !== "off";

const sounds = {
  correct:new Audio("sounds/correct.mp3"),
  incorrect:new Audio("sounds/incorrect.mp3"),
  cheers:new Audio("sounds/cheers.mp3"),
  countdown:new Audio("sounds/thinkingtime.mp3"),
  timeup:new Audio("sounds/sinkingtime.mp3"),
  question:new Audio("sounds/question.mp3")
};
sounds.countdown.loop = true;
sounds.countdown.volume = 0.1;

function playSound(name){
  if(!soundEnabled || !sounds[name]) return;
  sounds[name].currentTime = 0;
  sounds[name].play().catch(()=>{});
}
function stopAllSounds(){
  Object.values(sounds).forEach(s=>{
    s.pause(); s.currentTime=0;
  });
}
function toggleSound(){
  soundEnabled = !soundEnabled;
  localStorage.setItem("sound", soundEnabled?"on":"off");
  document.getElementById("sound-toggle").innerText = soundEnabled?"🔊 ON":"🔇 OFF";
  if(!soundEnabled) stopAllSounds();
}

// ================= 状態 =================
let allQuizData=[], filteredQuiz=[];
let currentIdx=0, score=0, timerId=null, timeLimit=15;
let dataReady=false;

// ================= データ =================
async function loadData(){
  const res = await fetch("quizData_full.json");
  allQuizData = await res.json();
  dataReady=true;
}
loadData();

// ================= クイズ =================
async function startQuiz(lv){
  if(!dataReady){alert("準備中です");return;}

  document.getElementById("level-select").classList.add("hidden");
  document.getElementById("quiz-container").classList.remove("hidden");

  filteredQuiz = allQuizData.filter(q=>q.level===lv).sort(()=>Math.random()-0.5).slice(0,10);
  currentIdx=0; score=0;
  timeLimit = (lv==="上級"||lv==="カルト級")?30:15;
  document.getElementById("display-level").innerText = lv;

  document.getElementById("sound-toggle").innerText = soundEnabled?"🔊 ON":"🔇 OFF";
  showQuestion();
}

function showQuestion(){
  playSound("question");
  stopAllSounds();

  const q = filteredQuiz[currentIdx];
  document.getElementById("current-num").innerText = `${currentIdx+1}/${filteredQuiz.length}`;
  document.getElementById("question-text").innerText = q.q;

  const box = document.getElementById("options-container");
  box.innerHTML="";
  document.getElementById("feedback").style.display="none";
  document.getElementById("next-btn").style.display="none";

  q.a.forEach((t,i)=>{
    const b=document.createElement("button");
    b.className="option-btn";
    b.innerText=t;
    b.onclick=()=>check(i);
    box.appendChild(b);
  });
  startTimer();
}

function startTimer(){
  const bar=document.getElementById("timer-bar");
  bar.style.transition="none"; bar.style.width="100%";
  void bar.offsetWidth;
  bar.style.transition=`width ${timeLimit}s linear`;
  bar.style.width="0%";

  playSound("countdown");
  clearTimeout(timerId);
  timerId=setTimeout(()=>check(-1),timeLimit*1000);
}

function check(idx){
  stopAllSounds(); clearTimeout(timerId);
  const q=filteredQuiz[currentIdx];
  const btns=document.querySelectorAll(".option-btn");
  btns.forEach(b=>b.disabled=true);

  const correct=q.c;
  if(idx===correct){
    btns[idx].classList.add("correct");
    score++; playSound("correct");
    showFeedback(true,q.r,"CORRECT");
  }else{
    if(idx>-1) btns[idx].classList.add("wrong");
    btns[correct].classList.add("correct");
    playSound(idx===-1?"timeup":"incorrect");
    showFeedback(false,q.r,idx===-1?"TIME UP":"INCORRECT");
  }
}

function showFeedback(ok,txt,status){
  document.getElementById("result-text").innerText=status;
  document.getElementById("result-text").style.color=ok?"#4caf50":"#ef5350";
  document.getElementById("rationale-text").innerText=txt||"";
  document.getElementById("feedback").style.display="block";
  document.getElementById("next-btn").style.display="block";
}

function handleNext(){
  currentIdx++;
  currentIdx<filteredQuiz.length?showQuestion():showResult();
}

function showResult(){
  stopAllSounds();
  document.getElementById("quiz-container").classList.add("hidden");
  document.getElementById("result-container").classList.remove("hidden");
  document.getElementById("final-score").innerText=`${score}/${filteredQuiz.length}`;
  playSound("cheers");
  confetti({particleCount:120,spread:70,origin:{y:.6}});
}
