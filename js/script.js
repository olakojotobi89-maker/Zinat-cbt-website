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
                subject: q.subject || "Unassigned", 
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
    const subject = document.getElementById('q-subject').value; 
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
        subject: subject, 
        question: text,
        options: [a, b, c, d],
        correctAnswer: correct
    };

    const serverReadyList = questions.map(q => ({
        subject: q.subject, 
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
            alert(`Question added successfully to ${subject}!`);
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

    list.innerHTML = questions.map((q, index) => {
        const isSSS = q.subject.includes("SSS");
        const badgeColor = isSSS ? "#2c3e50" : "#6a1b9a";
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <span style="background:${badgeColor}; color:white; padding:2px 8px; border-radius:4px; font-size:0.8rem;">
                        ${q.subject}
                    </span>
                </td> 
                <td>${q.text}</td>
                <td><strong style="color:green;">${q.correct}</strong></td>
                <td>
                    <button onclick="deleteQuestion('${q.id}')" class="btn-flag" style="background:#ff4444; padding:5px 10px; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteQuestion(id) {
    if(confirm("Are you sure you want to delete this question?")) {
        const remainingQuestions = questions.filter(q => q.id !== id).map(q => ({
            subject: q.subject, 
            question: q.text,
            options: [q.options.A, q.options.B, q.options.C, q.options.D],
            correctAnswer: q.correct
        }));

        try {
            const response = await fetch('https://zinat-cbt-website.onrender.com/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: remainingQuestions })
            });
            if (response.ok) refreshData();
        } catch (err) {
            alert("Delete failed: " + err.message);
        }
    }
}

async function renderAdminResults() {
    const list = document.getElementById('result-list');
    if (!list) return;

    list.innerHTML = "<tr><td colspan='5'>Fetching Results... ⏳</td></tr>";

    try {
        const response = await fetch('https://zinat-cbt-website.onrender.com/api/results');
        const data = await response.json();

        if (data.success && data.results.length > 0) {
            list.innerHTML = data.results.map(r => `
                <tr>
                    <td>${r.reg}</td>
                    <td>${r.name}</td>
                    <td style="font-weight:bold; color:#6a1b9a;">${r.subject}</td> 
                    <td><strong style="font-size:1.1rem;">${r.score}%</strong></td>
                    <td><span style="color:${r.status === 'PASSED' ? 'green' : 'red'}; font-weight:bold;">${r.status}</span></td>
                </tr>
            `).join('');
        } else {
            list.innerHTML = "<tr><td colspan='5'>No results found in the cloud yet.</td></tr>";
        }
    } catch (err) {
        list.innerHTML = "<tr><td colspan='5'>Error loading results from server.</td></tr>";
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

// --- FIXED: Delete Exam Data Function ---
async function clearAllData() {
    if (confirm("DANGER: This will wipe ALL student results!")) {
        const confirmPhrase = prompt("Type 'DELETE' to confirm:");
        if (confirmPhrase === "DELETE") {
            try {
                const response = await fetch('https://zinat-cbt-website.onrender.com/api/results', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    alert("Results cleared successfully.");
                    // Immediately refresh the UI
                    await renderAdminResults();
                } else {
                    alert("Delete failed. Your server might not have the DELETE route configured.");
                }
            } catch (err) {
                alert("Error connecting to server: " + err.message);
            }
        }
    }
}

function adminLogout() {
    if (confirm("Logout from Admin Dashboard?")) {
        window.location.href = "login.html";
    }
}