// --- Core Data ---
let questions = JSON.parse(localStorage.getItem('zinat_questions')) || [];

// --- Tab Switching ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.admin-sidebar li').forEach(l => l.classList.remove('active'));

    document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById('li-' + tabId).classList.add('active');

    if (tabId === 'results') renderAdminResults();
    if (tabId === 'questions') renderAdminQuestions();
}

// --- Modal Functions (The Fix) ---
function openModal() {
    const modal = document.getElementById('question-modal');
    modal.style.display = 'flex'; // This forces it to show
}

function closeModal() {
    const modal = document.getElementById('question-modal');
    modal.style.display = 'none';
}

// Setup Event Listeners after page loads
document.addEventListener('DOMContentLoaded', () => {
    // Connect the Cancel button
    const closeBtn = document.getElementById('closeModalBtn');
    if(closeBtn) closeBtn.onclick = closeModal;

    // Connect the Save button
    const saveBtn = document.getElementById('saveQuestionBtn');
    if(saveBtn) saveBtn.onclick = saveNewQuestion;

    // Initial table load
    renderAdminQuestions();
});

// --- Question Management ---
function saveNewQuestion() {
    const text = document.getElementById('q-text').value;
    const a = document.getElementById('q-opt-a').value;
    const b = document.getElementById('q-opt-b').value;
    const c = document.getElementById('q-opt-c').value;
    const d = document.getElementById('q-opt-d').value;
    const correct = document.getElementById('q-correct').value;

    if (!text || !a || !b) {
        alert("Please enter a question and at least two options!");
        return;
    }

    const newQ = {
        id: Date.now(),
        text: text,
        options: { A: a, B: b, C: c, D: d },
        correct: correct
    };

    questions.push(newQ);
    localStorage.setItem('zinat_questions', JSON.stringify(questions));
    
    alert("Question Saved!");
    closeModal();
    renderAdminQuestions();
    
    // Clear the form
    document.getElementById('q-text').value = "";
    document.getElementById('q-opt-a').value = "";
    document.getElementById('q-opt-b').value = "";
}

function renderAdminQuestions() {
    const list = document.getElementById('question-list');
    if (!list) return;

    list.innerHTML = questions.map((q, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${q.text}</td>
            <td>${q.correct}</td>
            <td>
                <button onclick="deleteQuestion(${q.id})" class="btn-flag" style="background:red; padding:5px 10px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function deleteQuestion(id) {
    if(confirm("Delete this question?")) {
        questions = questions.filter(q => q.id !== id);
        localStorage.setItem('zinat_questions', JSON.stringify(questions));
        renderAdminQuestions();
    }
}

// --- Results & Settings ---
function renderAdminResults() {
    const list = document.getElementById('result-list');
    if (!list) return;
    const results = JSON.parse(localStorage.getItem('zinat_results')) || [];
    list.innerHTML = results.map(r => `
        <tr>
            <td>${r.reg}</td>
            <td>${r.name}</td>
            <td>${r.score}%</td>
            <td>${r.status}</td>
        </tr>
    `).join('');
}

function saveSettings() {
    const title = document.getElementById('set-title').value;
    const duration = document.getElementById('set-duration').value;
    localStorage.setItem('zinat_settings', JSON.stringify({title, duration}));
    alert("Settings saved!");
}

function clearAllData() {
    if(confirm("Delete all student records?")) {
        localStorage.removeItem('zinat_results');
        renderAdminResults();
    }
}