/* --- Shared Data Management --- */
let questions = []; 
let examSettings = {
    title: "Zinat Entrance Exam",
    duration: 2,
    passMark: 40 
};

/* --- STUDENT EXAM LOGIC --- */
let currentQuestionIndex = 0;
let studentAnswers = {};
let flaggedQuestions = new Set();
let timeLeft; 

/**
 * INIT EXAM
 * Fetches Questions AND Settings from the Cloud
 */
async function initExam() {
    if (!document.getElementById('question-text')) return; 
    
    document.getElementById('question-text').innerText = "Loading Exam Data... ⏳";

    try {
        // 1. FETCH SETTINGS (Title, Time, PassMark)
        const settingsResponse = await fetch('https://zinat-cbt-website.onrender.com/api/settings');
        const settingsData = await settingsResponse.json();
        if (settingsData.success) {
            examSettings = settingsData.settings;
        }

        // 2. FETCH QUESTIONS
        const qResponse = await fetch('https://zinat-cbt-website.onrender.com/api/questions');
        const qData = await qResponse.json();

        if (qData.success && qData.questions.length > 0) {
            questions = qData.questions.map(q => ({
                id: q._id,
                text: q.question,
                options: {
                    A: q.options[0],
                    B: q.options[1],
                    C: q.options[2],
                    D: q.options[3]
                },
                correct: q.correctAnswer
            }));
        } else {
            document.getElementById('question-text').innerText = "No questions found. Contact Admin.";
            return;
        }
    } catch (error) {
        console.error("Cloud Fetch Error:", error);
        document.getElementById('question-text').innerText = "Connection Error. Check your internet.";
        return;
    }

    // Apply the Cloud Settings to the UI
    const subjectDisplay = document.getElementById('subject-name');
    if (subjectDisplay) {
        subjectDisplay.innerText = examSettings.title;
    }
    
    generateQuestionMap();
    renderQuestion(currentQuestionIndex);
    startTimer();
}

/**
 * RENDER QUESTION
 */
function renderQuestion(index) {
    const q = questions[index];
    if (!q) return;

    document.querySelector('.question-number').innerText = `Question ${index + 1} of ${questions.length}`;
    document.getElementById('question-text').innerHTML = q.text;

    const optionsContainer = document.querySelector('.options-container');
    optionsContainer.innerHTML = ''; 

    for (const [key, value] of Object.entries(q.options)) {
        const isChecked = studentAnswers[q.id] === key ? 'checked' : '';
        optionsContainer.innerHTML += `
            <label class="option">
                <input type="radio" name="answer" value="${key}" ${isChecked} onchange="saveAnswer('${q.id}', '${key}')">
                <span class="custom-radio">${key}</span>
                <span class="option-text">${value}</span>
            </label>
        `;
    }
    updateSidebarUI();
}

/**
 * SIDEBAR & MAP LOGIC
 */
function generateQuestionMap() {
    const mapContainer = document.getElementById('question-map');
    if (!mapContainer) return;
    mapContainer.innerHTML = questions.map((_, i) => `
        <div class="map-item" id="map-item-${i}" onclick="jumpToQuestion(${i})">${i + 1}</div>
    `).join('');
}

function jumpToQuestion(index) {
    currentQuestionIndex = index;
    renderQuestion(index);
}

function updateSidebarUI() {
    questions.forEach((q, i) => {
        const mapItem = document.getElementById(`map-item-${i}`);
        if (!mapItem) return;
        mapItem.classList.remove('active', 'answered', 'flagged');
        if (i === currentQuestionIndex) mapItem.classList.add('active');
        if (studentAnswers[q.id]) mapItem.classList.add('answered');
        if (flaggedQuestions.has(i)) mapItem.classList.add('flagged');
    });
}

function saveAnswer(questionId, choice) {
    studentAnswers[questionId] = choice;
    updateSidebarUI();
}

/**
 * TIMER LOGIC (Uses Cloud Duration)
 */
function startTimer() {
    const timerDisplay = document.getElementById('timer');
    if (!timerDisplay) return;

    const savedTime = localStorage.getItem('zinat_time_left');
    timeLeft = savedTime ? parseInt(savedTime) : examSettings.duration * 60; 

    const countdown = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(countdown);
            localStorage.removeItem('zinat_time_left');
            submitExam();
            return;
        }
        timeLeft--;
        localStorage.setItem('zinat_time_left', timeLeft);

        let h = Math.floor(timeLeft / 3600);
        let m = Math.floor((timeLeft % 3600) / 60);
        let s = timeLeft % 60;
        timerDisplay.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);
}

/**
 * SUBMIT EXAM (Updated for Cloud Results)
 */
async function submitExam() {
    let score = 0;
    questions.forEach(q => {
        if (studentAnswers[q.id] === q.correct) {
            score++;
        }
    });

    const finalScore = Math.round((score / questions.length) * 100);
    
    let performanceStatus = "";
    if (finalScore >= 80) performanceStatus = "Excellent";
    else if (finalScore >= 60) performanceStatus = "Very Good";
    else if (finalScore >= 50) performanceStatus = "Good";
    else if (finalScore >= 40) performanceStatus = "Pass";
    else performanceStatus = "Fail";

    const loggedInStudent = JSON.parse(localStorage.getItem('current_student'));

    // CREATE DATA OBJECT FOR SERVER
    const resultData = {
        reg: loggedInStudent ? loggedInStudent.reg : "N/A",
        name: loggedInStudent ? loggedInStudent.name : "Unknown Student", 
        score: finalScore,
        status: performanceStatus
    };

    try {
        // PUSH RESULT TO SERVER
        await fetch('https://zinat-cbt-website.onrender.com/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData)
        });
    } catch (err) {
        console.error("Cloud Save Error:", err);
    }
    
    localStorage.removeItem('zinat_time_left'); 
    alert(`Exam Submitted Successfully!\nScore: ${finalScore}%\nGrade: ${performanceStatus}`);
    window.location.href = "login.html"; 
}

/**
 * EVENT LISTENERS
 */
window.addEventListener('DOMContentLoaded', () => {
    initExam();
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                renderQuestion(currentQuestionIndex);
            }
        };
    }
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderQuestion(currentQuestionIndex);
            }
        };
    }
});