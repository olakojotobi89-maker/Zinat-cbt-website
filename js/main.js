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
let isSubmitting = false; // Prevents double submission

/**
 * INIT EXAM
 * Fetches Questions AND Settings from the Cloud
 */
async function initExam() {
    if (!document.getElementById('question-text')) return; 

    const loggedInStudent = JSON.parse(localStorage.getItem('current_student'));
    const selectedSubject = localStorage.getItem('selected_subject');
    
    // --- SESSION GUARD ---
    if (!loggedInStudent || !selectedSubject) {
        window.location.replace("login.html");
        return;
    }

    try {
        // Double check results to ensure student hasn't submitted THIS subject already
        const checkRes = await fetch('https://zinat-cbt-website.onrender.com/api/results');
        const checkData = await checkRes.json();
        
        if (checkData.success) {
            const hasFinished = checkData.results.some(r => 
                r.reg === loggedInStudent.reg && r.subject === selectedSubject
            );
            if (hasFinished) {
                alert(`You have already submitted the ${selectedSubject} exam.`);
                window.location.replace("login.html");
                return;
            }
        }
    } catch (e) {
        console.warn("Security check bypass: Proceeding with caution.");
    }
    
    document.getElementById('question-text').innerText = `Loading ${selectedSubject} Data... ⏳`;

    try {
        const settingsResponse = await fetch('https://zinat-cbt-website.onrender.com/api/settings');
        const settingsData = await settingsResponse.json();
        if (settingsData.success) {
            examSettings = settingsData.settings;
        }

        // FETCH QUESTIONS FOR SPECIFIC SUBJECT ONLY
        const qResponse = await fetch(`https://zinat-cbt-website.onrender.com/api/questions?subject=${encodeURIComponent(selectedSubject)}`);
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
            document.getElementById('question-text').innerText = "No questions found for this subject. Contact Admin.";
            return;
        }
    } catch (error) {
        console.error("Cloud Fetch Error:", error);
        document.getElementById('question-text').innerText = "Connection Error. Check your internet.";
        return;
    }

    const subjectDisplay = document.getElementById('subject-name');
    if (subjectDisplay) {
        subjectDisplay.innerText = `${selectedSubject} - ${examSettings.title}`;
    }
    
    generateQuestionMap();
    renderQuestion(currentQuestionIndex);
    startTimer();
    enableSecurity(); // Activate anti-cheating
}

/**
 * ANTI-MALPRACTICE SECURITY
 */
function enableSecurity() {
    // Detect tab switching or minimizing
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && !isSubmitting) {
            forceSubmit("System detected tab switching or minimization.");
        }
    });

    // Detect clicking away from the browser window
    window.addEventListener('blur', () => {
        if (!isSubmitting) {
            forceSubmit("System detected window focus loss (clicking away).");
        }
    });
}

function forceSubmit(reason) {
    isSubmitting = true;
    alert(`SECURITY ALERT: ${reason}\nYour exam is being submitted automatically.`);
    submitExam();
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

function toggleFlag() {
    if (flaggedQuestions.has(currentQuestionIndex)) {
        flaggedQuestions.delete(currentQuestionIndex);
    } else {
        flaggedQuestions.add(currentQuestionIndex);
    }
    updateSidebarUI();
}

/**
 * TIMER LOGIC
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
 * SUBMIT EXAM 
 */
async function submitExam() {
    if (isSubmitting && timeLeft > 0) return; // Prevent double trigger unless forced
    isSubmitting = true;

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
    const selectedSubject = localStorage.getItem('selected_subject');

    const resultData = {
        reg: loggedInStudent ? loggedInStudent.reg : "N/A",
        name: loggedInStudent ? loggedInStudent.name : "Unknown Student", 
        subject: selectedSubject || "General",
        score: finalScore,
        status: performanceStatus
    };

    try {
        const response = await fetch('https://zinat-cbt-website.onrender.com/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData)
        });

        if (!response.ok) {
            console.error("Server refused to save result");
        }
    } catch (err) {
        console.error("Cloud Save Error:", err);
        let localResults = JSON.parse(localStorage.getItem('zinat_results')) || [];
        localResults.push(resultData);
        localStorage.setItem('zinat_results', JSON.stringify(localResults));
    }
    
    localStorage.removeItem('zinat_time_left'); 
    localStorage.removeItem('selected_subject'); // Clear subject after submission
    alert(`Exam Submitted Successfully!\nSubject: ${resultData.subject}\nScore: ${finalScore}%\nGrade: ${performanceStatus}`);
    window.location.replace("login.html"); 
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

    const flagBtn = document.getElementById('flag-btn');
    if (flagBtn) flagBtn.onclick = toggleFlag;

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) submitBtn.onclick = () => {
        if(confirm("Are you sure you want to submit?")) submitExam();
    };
});