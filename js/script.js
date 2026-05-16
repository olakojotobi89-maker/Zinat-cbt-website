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
    // ADDED: Load trash contents when switching to trash tab
    if (tabId === 'trash') fetchAndRenderTrash();
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
        if (setData.success && setData.settings) {
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

    const serverReadyList = questions
        .filter(q => q.subject === subject)
        .map(q => ({
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
            body: JSON.stringify({ subject: subject, questions: serverReadyList })
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
                    <button onclick="deleteQuestion('${q.id}', '${q.subject}')" class="btn-flag" style="background:#ff4444; padding:5px 10px; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteQuestion(id, subject) {
    if(confirm("Are you sure you want to delete this question?")) {
        const remainingQuestions = questions
            .filter(q => q.id !== id && q.subject === subject)
            .map(q => ({
                subject: q.subject, 
                question: q.text,
                options: [q.options.A, q.options.B, q.options.C, q.options.D],
                correctAnswer: q.correct
            }));

        try {
            const response = await fetch('https://zinat-cbt-website.onrender.com/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject: subject, questions: remainingQuestions })
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

async function clearAllData() {
    if (confirm("DANGER: This will wipe ALL student results!")) {
        const confirmPhrase = prompt("Type 'DELETE' to confirm:");
        if (confirmPhrase === "DELETE") {
            try {
                const response = await fetch('https://zinat-cbt-website.onrender.com/api/results', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (response.ok) {
                    alert("Results moved to Trash Bin successfully.");
                    await renderAdminResults();
                } else {
                    alert("Delete failed.");
                }
            } catch (err) {
                alert("Error connecting to server: " + err.message);
            }
        }
    }
}

// --- NEW FEATURES: CONTROL HUB & TRASH LIFECYCLE ---

// 1. System Nuke: Soft delete questions, results, and config settings profile data instantly
async function nukeAllSystemData() {
    if (confirm("🚨 WARNING: You are about to wipe ALL questions, student performance logs, and settings parameters from live view!")) {
        const passwordCheck = prompt("Type 'NUKE SYSTEM' to authorize complete archival profile reset:");
        if (passwordCheck === "NUKE SYSTEM") {
            try {
                const response = await fetch('https://zinat-cbt-website.onrender.com/api/danger/nuke-all', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const resData = await response.json();
                if (resData.success) {
                    alert(resData.message);
                    // Clear out memory array cache parameters and refresh views
                    questions = [];
                    document.getElementById('set-title').value = "";
                    document.getElementById('set-duration').value = "";
                    await refreshData();
                } else {
                    alert("Nuke command denied by server profile routing layout.");
                }
            } catch (err) {
                alert("Connection disruption error: " + err.message);
            }
        }
    }
}

// 2. Fetch and render items inside the recovery hub UI dashboard warehouse interface
async function fetchAndRenderTrash() {
    const trashTableBody = document.getElementById('trash-list');
    if (!trashTableBody) return;

    trashTableBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px;'>Reading cloud trash backup vaults... ⏳</td></tr>";

    try {
        const response = await fetch('https://zinat-cbt-website.onrender.com/api/trash');
        const resData = await response.json();

        if (resData.success && resData.trash.length > 0) {
            trashTableBody.innerHTML = resData.trash.map(item => {
                let infoDescription = "";
                let itemTypeBadgeColor = "#777";

                if (item.type === 'question') {
                    itemTypeBadgeColor = "#2c3e50";
                    infoDescription = `<strong>[${item.data.subject}]</strong> ${item.data.question.substring(0, 60)}...`;
                } else if (item.type === 'result') {
                    itemTypeBadgeColor = "#6a1b9a";
                    infoDescription = `Student: <strong>${item.data.name} (${item.data.reg})</strong> scored ${item.data.score}% in ${item.data.subject || 'Exam'}`;
                } else if (item.type === 'settings') {
                    itemTypeBadgeColor = "#d63031";
                    infoDescription = `System profile configurations reset: "${item.data.title}" (${item.data.duration} mins)`;
                }

                const deletionTimestamp = new Date(item.deletedAt).toLocaleString();

                return `
                    <tr>
                        <td>
                            <span style="background:${itemTypeBadgeColor}; color:white; padding:4px 8px; border-radius:4px; font-size:0.75rem; text-transform:uppercase; font-weight:bold;">
                                ${item.type}
                            </span>
                        </td>
                        <td style="font-size:0.9rem; max-width:400px; word-wrap:break-word;">${infoDescription}</td>
                        <td style="font-size:0.85rem; color:#555;">${deletionTimestamp}</td>
                        <td style="text-align:center;">
                            <div style="display:flex; gap:8px; justify-content:center;">
                                <button onclick="restoreTrashItem('${item._id}')" style="background:#2ecc71; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:bold;">♻️ Restore</button>
                                <button onclick="permanentlyEraseTrashItem('${item._id}')" style="background:#ff4444; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:bold;">❌ Purge</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            trashTableBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:30px; color:#777; font-weight:bold;'>🎉 Trash is empty! No records found.</td></tr>";
        }
    } catch (err) {
        trashTableBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:red;'>Failed to load trash archives: " + err.message + "</td></tr>";
    }
}

// 3. Restore an item cleanly back to active status view
async function restoreTrashItem(id) {
    try {
        const response = await fetch(`https://zinat-cbt-website.onrender.com/api/trash/restore/${id}`, {
            method: 'POST'
        });
        const data = await response.json();
        if (data.success) {
            alert("Data item successfully restored to active arrays!");
            await fetchAndRenderTrash();
            await refreshData();
        }
    } catch (err) {
        alert("Restore operation mapping fault: " + err.message);
    }
}

// 4. Erase an individual resource item cleanly from primary record context data structures completely
async function permanentlyEraseTrashItem(id) {
    if (confirm("Are you absolutely certain you want to delete this specific data component forever? This bypasses storage backups.")) {
        try {
            const response = await fetch(`https://zinat-cbt-website.onrender.com/api/trash/permanent/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                await fetchAndRenderTrash();
            }
        } catch (err) {
            alert("Permanent purge connection fault structural layout: " + err.message);
        }
    }
}

// 5. Purge entire backup trash database profiles at once
async function purgeTrashBinPermanently() {
    if (confirm("💥 CRITICAL CRASH RISK: You are about to clear the entire Trash Bin archive! Nothing inside here can EVER be recovered again!")) {
        const doubleAuthCheck = prompt("Type 'WIPE TRASH FOREVER' to empty the entire trash database:");
        if (doubleAuthCheck === "WIPE TRASH FOREVER") {
            try {
                const response = await fetch('https://zinat-cbt-website.onrender.com/api/trash/purge-all', {
                    method: 'DELETE'
                });
                const data = await response.json();
                if (data.success) {
                    alert("Trash repository storage entirely cleared out.");
                    await fetchAndRenderTrash();
                }
            } catch (err) {
                alert("Bulk purge pipeline command failure state: " + err.message);
            }
        }
    }
}

function adminLogout() {
    if (confirm("Logout from Admin Dashboard?")) {
        window.location.href = "login.html";
    }
}