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
        // --- LIVE DATABASE FETCH ---
        const response = await fetch('https://zinat-cbt-website.onrender.com/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reg: inputReg })
        });

        const data = await response.json();

        if (data.success) {
            const student = data.student;
            const photoId = student.reg.replace(/\//g, "-");

            localStorage.setItem('current_student', JSON.stringify({
                reg: student.reg,
                name: student.name,
                score: student.score || 0,
                status: student.status || "Pending",
                photoFileName: photoId
            }));
            window.location.href = "index.html";
        } else {
            alert("Access Denied: Registration Number not found in our records.");
        }
    } catch (error) {
        console.error("Error:", error);
        // Fallback to local list if the server is offline
        const foundStudent = authorizedStudents.find(s => s.reg === inputReg);
        if (foundStudent) {
            const photoId = foundStudent.reg.replace(/\//g, "-");
            localStorage.setItem('current_student', JSON.stringify({
                reg: foundStudent.reg,
                name: foundStudent.name,
                photoFileName: photoId
            }));
            window.location.href = "index.html";
        } else {
            alert("Connection error or Reg Number not found.");
        }
    }
}

function loginAdmin() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;

    if (user === "Zinat schools" && pass === "Zinatschools") {
        window.location.href = "admin.html";
    } else {
        alert("Invalid Admin Credentials!");
    }
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('current_student');
        window.location.href = "login.html";
    }
}