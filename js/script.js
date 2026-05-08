// --- Core Data ---
let questions = []; 

// --- Tab Switching ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.admin-sidebar li').forEach(l => l.classList.remove('active'));

    document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById('li-' + tabId).classList.add('active');

    if (tabId === 'results') renderAdminResults();
    if (tabId === 'questions') renderAdminQuestions();
}

// --- Modal Functions ---
function openModal() {
    const modal = document.getElementById('question-modal');
    modal.style.display = 'flex'; 
}

function closeModal() {
    const modal = document.getElementById('question-modal');
    modal.style.display = 'none';
}

// Setup Event Listeners after page loads
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeModalBtn');
    if(closeBtn) closeBtn.onclick = closeModal;

    const saveBtn = document.getElementById('saveQuestionBtn');
    if(saveBtn) saveBtn.onclick = saveNewQuestion;

    // Load everything from the Cloud on start
    refreshData();
});

/**
 * REFRESH DATA FROM CLOUD
 */
async function refreshData() {
    try {
        const response = await fetch('https://zinat-cbt-website.onrender.com/api/questions');
        const data = await response.json();
        if (data.success) {
            questions = data.questions.map(q => ({
                id: q._id,
                text: q.question,
                options: { A: q.options[0], B: q.options[1], C: q.options[2], D: q.options[3] },
                correct: q.correctAnswer
            }));
            renderAdminQuestions();
        }
        
        const setRes = await fetch('https://zinat-cbt-website.onrender.com/api/settings');
        const setData = await setRes.json();
        if (setData.success) {
            document.getElementById('set-title').value = setData.settings.title;
            document.getElementById('set-duration').value = setData.settings.duration;
        }
    } catch (err) {
        console.error("Error loading cloud data:", err);
    }
}

// --- Question Management (CLOUD SYNC) ---
async function saveNewQuestion() {
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

    const newQuestion = {
        question: text,
        options: [a, b, c, d],
        correctAnswer: correct
    };

    const serverReadyList = questions.map(q => ({
        question: q.text,
        options: [q.options.A, q.options.B, q.options.C, q.options.D],
        correctAnswer: q.correct
    }));
    serverReadyList.push(newQuestion);

    try {
        const response = await fetch('https://zinat-cbt-website.onrender.com/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: serverReadyList })
        });

        if (response.ok) {
            alert("Question Saved to Cloud!");
            closeModal();
            refreshData(); 
            document.getElementById('q-text').value = "";
            document.getElementById('q-opt-a').value = "";
            document.getElementById('q-opt-b').value = "";
            document.getElementById('q-opt-c').value = "";
            document.getElementById('q-opt-d').value = "";
        }
    } catch (err) {
        alert("Error saving to cloud: " + err.message);
    }
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
                <button onclick="deleteQuestion('${q.id}')" class="btn-flag" style="background:red; padding:5px 10px; color:white; border:none; border-radius:4px; cursor:pointer;">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteQuestion(id) {
    if(confirm("Delete this question from the cloud?")) {
        const remainingQuestions = questions.filter(q => q.id !== id).map(q => ({
            question: q.text,
            options: [q.options.A, q.options.B, q.options.C, q.options.D],
            correctAnswer: q.correct
        }));

        try {
            await fetch('https://zinat-cbt-website.onrender.com/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: remainingQuestions })
            });
            refreshData();
        } catch (err) {
            alert("Delete failed: " + err.message);
        }
    }
}

// --- Results & Settings (FIXED FOR CLOUD SYNC) ---
async function renderAdminResults() {
    const list = document.getElementById('result-list');
    if (!list) return;

    list.innerHTML = "<tr><td colspan='4'>Fetching Results... ⏳</td></tr>";

    try {
        const response = await fetch('https://zinat-cbt-website.onrender.com/api/results');
        const data = await response.json();

        if (data.success && data.results.length > 0) {
            list.innerHTML = data.results.map(r => `
                <tr>
                    <td>${r.reg}</td>
                    <td>${r.name}</td>
                    <td>${r.score}%</td>
                    <td>${r.status}</td>
                </tr>
            `).join('');
        } else {
            list.innerHTML = "<tr><td colspan='4'>No results found in the cloud yet.</td></tr>";
        }
    } catch (err) {
        console.error("Cloud Result Fetch Error:", err);
        list.innerHTML = "<tr><td colspan='4'>Error loading results from server.</td></tr>";
    }
}

async function saveSettings() {
    const title = document.getElementById('set-title').value;
    const duration = document.getElementById('set-duration').value;
    const passMark = 40; 

    try {
        const response = await fetch('https://zinat-cbt-website.onrender.com/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, duration, passMark })
        });
        if (response.ok) alert("Global settings updated!");
    } catch (err) {
        alert("Failed to sync settings.");
    }
}

function clearAllData() {
    alert("Manual clearing of cloud results is disabled for safety. Please contact the DB admin to wipe records.");
}