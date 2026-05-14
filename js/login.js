// --- Student Database ---
const authorizedStudents = [
    { reg: "ZINAT/2026/001", name: "Adeniyi Pelumi" },
    { reg: "ZINAT/2026/002", name: "Akintayo Karimat" },
    { reg: "ZINAT/2026/003", name: "Alabi Mercy" },
    { reg: "ZINAT/2026/004", name: "Adepoju Khalid" },
    { reg: "ZINAT/2026/005", name: "Ayegboyin Tobi" },
    { reg: "ZINAT/2026/006", name: "Olukunle Moses" },
    { reg: "ZINAT/2026/007", name: "Olapade Sofiyat" },
    { reg: "ZINAT/2026/008", name: "Taiwo Usman" },
    { reg: "ZINAT/2026/009", name: "Akintude Abiola" },
    { reg: "ZINAT/2026/10", name: "Akintayo Islamiah" },
    { reg: "ZINAT/2026/11", name: "Jimoh Fatimoh" },
    { reg: "ZINAT/2026/12", name: "Adeniyi Femi" },
    { reg: "ZINAT/2026/13", name: "Akintayo Kamil" },
    { reg: "ZINAT/2026/14", name: "Alabi Blessing" },
    { reg: "ZINAT/2026/15", name: "Alagbada Boluwatife" },
    { reg: "ZINAT/2026/16", name: "Lawal Aminat" },
    { reg: "ZINAT/2026/17", name: "Muritala Ikimot" },
    { reg: "ZINAT/2026/18", name: "Olapade Amirat" },
    { reg: "ZINAT/2026/19", name: "Odubella Darasimi" },
    { reg: "ZINAT/2026/20", name: "Odubella Moyosore" }
];

// FULL SUBJECT LIST (Matches Admin Panel)
const allSubjects = [
    "Mathematics", "English Language", "Biology", "Chemistry", "Physics", 
    "Further Mathematics", "Agricultural Science", "Economics", "Geography", 
    "Government", "Civic Education", "Literature-in-English", "History", 
    "CRS", "IRS", "Financial Accounting", "Commerce", "Computer/Data Processing",
    "Basic Science", "Basic Tech", "Social Studies", "Business Studies", 
    "Home Economics", "PHE", "French", "Yoruba", "CCA"
];

function switchLogin(type) {
    const sForm = document.getElementById('student-form');
    const aForm = document.getElementById('admin-form');
    const sTab = document.getElementById('student-tab');
    const aTab = document.getElementById('admin-tab');

    if (type === 'student') {
        sForm.style.display = 'block';
        aForm.style.display = 'none';
        sTab.classList.add('active');
        aTab.classList.remove('active');
    } else {
        sForm.style.display = 'none';
        aForm.style.display = 'block';
        aTab.classList.add('active');
        sTab.classList.remove('active');
    }
}

async function loginStudent() {
    const inputReg = document.getElementById('student-reg').value.trim().toUpperCase();

    if (inputReg === "") {
        alert("Please enter your Registration Number");
        return;
    }

    try {
        const response = await fetch('https://zinat-cbt-website.onrender.com/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reg: inputReg })
        });
        const data = await response.json();

        if (data.success) {
            saveStudentAndShowSubjects(data.student);
            return;
        } else if (response.status === 403) {
            alert(data.message);
            return;
        }
    } catch (error) { console.warn("Cloud login failed, checking fallback..."); }

    const foundLocal = authorizedStudents.find(s => s.reg === inputReg);
    if (foundLocal) {
        saveStudentAndShowSubjects(foundLocal);
    } else {
        alert("Access Denied: Registration Number not found.");
    }
}

function saveStudentAndShowSubjects(student) {
    const photoId = student.reg.replace(/\//g, "-");
    
    localStorage.setItem('current_student', JSON.stringify({
        reg: student.reg,
        name: student.name,
        photoFileName: photoId
    }));

    localStorage.removeItem('zinat_time_left');
    localStorage.removeItem('selected_subject');

    showSubjectModal();
}

function showSubjectModal() {
    const modal = document.getElementById('subject-modal');
    const container = document.getElementById('subject-list-container');
    
    modal.style.display = 'flex';
    container.innerHTML = ''; 

    allSubjects.forEach(subject => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.innerText = subject;
        card.onclick = () => startExam(subject);
        container.appendChild(card);
    });
}

function startExam(subject) {
    localStorage.setItem('selected_subject', subject);
    window.location.href = "index.html"; 
}

function closeSubjectModal() {
    document.getElementById('subject-modal').style.display = 'none';
}

function loginAdmin() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;

    if (user === "Zinat schools" && pass === "Smurf123") {
        window.location.href = "admin.html";
    } else {
        alert("Invalid Admin Credentials!");
    }
}

// FIX: Added Logout Logic back in
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('current_student');
        localStorage.removeItem('selected_subject');
        localStorage.removeItem('zinat_time_left');
        window.location.href = "login.html";
    }
}