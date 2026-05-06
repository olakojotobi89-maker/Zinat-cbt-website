/* --- Shared Data Management --- */
// Grabs the questions from localStorage or uses a default if empty
let questions = JSON.parse(localStorage.getItem('zinat_questions')) || [
    {
        id: Date.now(),
        text: "What is the capital of Nigeria?",
        options: { A: "Lagos", B: "Abuja", C: "Kano", D: "Ibadan" },
        correct: "B"
    }
];

// Grabs the exam settings (Title and Time) from Admin
let examSettings = JSON.parse(localStorage.getItem('zinat_settings')) || {
    title: "Zinat Entrance Exam",
    duration: 2,
    passMark: 40 // Updated default passmark to match your new scale
};

/* --- STUDENT EXAM LOGIC --- */
let currentQuestionIndex = 0;
let studentAnswers = {};
let flaggedQuestions = new Set();
let timeLeft; 

/**
 * INIT EXAM
 * This is the "Engine" of your page. It pulls the latest data and starts the UI.
 */
function initExam() {
    if (!document.getElementById('question-text')) return; 
    
    // Refresh questions from localStorage to get what Admin just set
    const latestQuestions = JSON.parse(localStorage.getItem('zinat_questions'));
    if (latestQuestions && latestQuestions.length > 0) {
        questions = latestQuestions;
    }

    // Set the Exam Title in the sidebar
    const subjectDisplay = document.getElementById('subject-name');
    if (subjectDisplay) {
        subjectDisplay.innerText = examSettings.title;
    }
    
    // Initialize UI components
    generateQuestionMap();
    renderQuestion(currentQuestionIndex);
    startTimer();
}

/**
 * RENDER QUESTION
 * Displays the current question and its options
 */
function renderQuestion(index) {
    const q = questions[index];
    if (!q) return;

    // Update Question Number
    document.querySelector('.question-number').innerText = `Question ${index + 1} of ${questions.length}`;
    
    // Support for MathJax/Images/HTML in question text
    document.getElementById('question-text').innerHTML = q.text;

    const optionsContainer = document.querySelector('.options-container');
    optionsContainer.innerHTML = ''; 

    // Generate Radio Buttons for Options
    for (const [key, value] of Object.entries(q.options)) {
        const isChecked = studentAnswers[q.id] === key ? 'checked' : '';
        optionsContainer.innerHTML += `
            <label class="option">
                <input type="radio" name="answer" value="${key}" ${isChecked} onchange="saveAnswer(${q.id}, '${key}')">
                <span class="custom-radio">${key}</span>
                <span class="option-text">${value}</span>
            </label>
        `;
    }
    updateSidebarUI();
}

/**
 * QUESTION MAP
 * Creates the grid of numbers in the sidebar
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

/**
 * SIDEBAR UI
 * Updates colors: Purple (Active), Green (Answered), Red (Flagged)
 */
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

/**
 * FLAG LOGIC
 */
if (document.getElementById('flag-btn')) {
    document.getElementById('flag-btn').onclick = () => {
        if (flaggedQuestions.has(currentQuestionIndex)) {
            flaggedQuestions.delete(currentQuestionIndex);
        } else {
            flaggedQuestions.add(currentQuestionIndex);
        }
        updateSidebarUI();
    };
}

function saveAnswer(questionId, choice) {
    studentAnswers[questionId] = choice;
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
 * SUBMIT EXAM WITH NEW GRADING SCALE
 */
function submitExam() {
    let score = 0;
    questions.forEach(q => {
        if (studentAnswers[q.id] === q.correct) {
            score++;
        }
    });

    const finalScore = Math.round((score / questions.length) * 100);
    
    // --- NEW GRADING LOGIC FOR ZINAT GROUP OF SCHOOLS ---
    let performanceStatus = "";
    
    if (finalScore >= 80) {
        performanceStatus = "Excellent";
    } else if (finalScore >= 60) {
        performanceStatus = "Very Good";
    } else if (finalScore >= 50) {
        performanceStatus = "Good";
    } else if (finalScore >= 40) {
        performanceStatus = "Pass";
    } else {
        performanceStatus = "Fail"; // This catches everything below 40
    }

    const loggedInStudent = JSON.parse(localStorage.getItem('current_student'));
    let results = JSON.parse(localStorage.getItem('zinat_results')) || [];
    
    results.push({
        reg: loggedInStudent ? loggedInStudent.reg : "N/A",
        name: loggedInStudent ? loggedInStudent.name : "Unknown Student", 
        score: finalScore,
        status: performanceStatus, // Stores the specific grade
        date: new Date().toLocaleString()
    });
    
    localStorage.setItem('zinat_results', JSON.stringify(results));
    localStorage.removeItem('zinat_time_left'); 
    
    // Alert now shows both percentage and the Grade
    alert(`Exam Submitted Successfully!\nScore: ${finalScore}%\nGrade: ${performanceStatus}`);
    window.location.href = "login.html"; 
}

/**
 * EVENT LISTENERS
 * This runs as soon as the page is ready.
 */
window.addEventListener('DOMContentLoaded', () => {
    // 1. Start the Exam Logic
    initExam();

    // 2. Setup Next Button
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                renderQuestion(currentQuestionIndex);
            }
        };
    }

    // 3. Setup Previous Button
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