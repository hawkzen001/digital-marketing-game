import { auth, db, isFirebaseConfigured, collection, setDoc, doc, getDocs, firebaseConfig, initializeApp, getAuth, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateDoc, deleteDoc, sendPasswordResetEmail } from './firebase-config.js';

window.resetAllUsers = async () => {
    if (!isFirebaseConfigured) return;
    const qs = await getDocs(collection(db, 'users'));
    for (let d of qs.docs) {
        await updateDoc(d.ref, { level: 1, points: 0, xp: 0, completedModules: [] });
    }
    console.log("All users reset!");
};

// Access Control
if (!isFirebaseConfigured) {
    const user = JSON.parse(localStorage.getItem('dm_mock_user') || '{}');
    if (user.role !== 'admin') {
        window.location.href = 'login.html';
    }
} else {
    onAuthStateChanged(auth, (user) => {
        if (!user || user.email.toLowerCase() !== '001nilesh.sharma@gmail.com') {
            window.location.href = 'index.html';
        }
    });
}

const addForm = document.getElementById('add-user-form');
const createMsg = document.getElementById('create-msg');
const usersList = document.getElementById('users-list');
const modeIndicator = document.getElementById('mode-indicator');
const logoutBtn = document.getElementById('logout-btn');

if (isFirebaseConfigured) {
    modeIndicator.innerText = 'Firebase Mode';
    modeIndicator.style.color = 'var(--success)';
}

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-name').value;
    const email = document.getElementById('new-email').value;
    const password = document.getElementById('new-password').value;

    if (!isFirebaseConfigured) {
        // Mock save
        const users = JSON.parse(localStorage.getItem('dm_mock_users_list') || '[]');
        users.push({ id: Date.now().toString(), name, email, level: 1 });
        localStorage.setItem('dm_mock_users_list', JSON.stringify(users));
        
        createMsg.style.display = 'block';
        setTimeout(() => createMsg.style.display = 'none', 3000);
        addForm.reset();
        loadUsers();
        return;
    }

    try {
        // Create user in Firebase Auth using a secondary app instance
        // so the admin does not get logged out of the primary app.
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCredential.user.uid;
        await signOut(secondaryAuth); // Sign out of the secondary app

        // Save user details to Firestore
        await setDoc(doc(db, "users", uid), {
            name: name,
            email: email,
            role: 'student',
            level: 1,
            xp: 0,
            points: 0
        });

        createMsg.innerText = "User account created successfully!";
        createMsg.style.color = "var(--success)";
        createMsg.style.display = 'block';
        setTimeout(() => createMsg.style.display = 'none', 3000);
        addForm.reset();
        loadUsers();
    } catch(err) {
        console.error(err);
        createMsg.innerText = "Error: " + err.message;
        createMsg.style.color = "var(--error)";
        createMsg.style.display = 'block';
    }
});

async function loadUsers() {
    usersList.innerHTML = '';
    
    if (!isFirebaseConfigured) {
        const users = JSON.parse(localStorage.getItem('dm_mock_users_list') || '[]');
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.level}</td>
                <td>${u.xp || 0}</td>
                <td>${u.points || 0}</td>
                <td><button class="action-btn" onclick="alert('Cannot edit in Mock Mode')">Edit</button></td>
            `;
            usersList.appendChild(tr);
        });
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        querySnapshot.forEach((doc) => {
            const u = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.level || 1}</td>
                <td>${u.xp || 0}</td>
                <td>${u.points || 0}</td>
                <td style="display:flex; gap:0.5rem; align-items:center;">
                    <button class="action-btn edit-btn" style="font-size:0.7rem;">Edit</button>
                    <button class="action-btn reset-pass-btn" style="font-size:0.7rem;" data-email="${u.email}">Reset Pass</button>
                    ${u.banned 
                        ? `<button class="action-btn ban-btn" style="font-size:0.7rem; color: var(--success); border-color: var(--success);" data-id="${doc.id}" data-action="unban">Unban</button>`
                        : `<button class="action-btn ban-btn" style="font-size:0.7rem; color: var(--warning); border-color: var(--warning);" data-id="${doc.id}" data-action="ban">Ban</button>`
                    }
                    <button class="action-btn delete-btn" style="font-size:0.7rem; color: var(--error);" data-id="${doc.id}">Delete</button>
                </td>
            `;
            tr.querySelector('.edit-btn').addEventListener('click', () => openEditModal(doc.id, u));
            tr.querySelector('.reset-pass-btn').addEventListener('click', (e) => handleResetPassword(e.target.getAttribute('data-email')));
            tr.querySelector('.ban-btn').addEventListener('click', (e) => handleBanUser(e.target.getAttribute('data-id'), e.target.getAttribute('data-action')));
            tr.querySelector('.delete-btn').addEventListener('click', (e) => handleDeleteUser(e.target.getAttribute('data-id')));
            usersList.appendChild(tr);
        });
    } catch(err) {
        console.error("Failed to load users from Firestore", err);
    }
}

// Nav Logic
document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
            v.classList.add('hidden');
        });
        document.getElementById(e.target.dataset.view + '-view').classList.remove('hidden');
        document.getElementById(e.target.dataset.view + '-view').classList.add('active');
    });
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('dm_mock_user');
    window.location.href = 'login.html';
});

document.getElementById('switch-to-student-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Modal Logic
let currentEditingId = null;
const editModal = document.getElementById('edit-student-modal');
const editName = document.getElementById('edit-student-name');
const editEmail = document.getElementById('edit-student-email');
const editLevel = document.getElementById('edit-level');
const editXp = document.getElementById('edit-xp');
const editPoints = document.getElementById('edit-points');

function openEditModal(id, user) {
    currentEditingId = id;
    editName.innerText = "Edit " + (user.name || 'Student');
    editEmail.innerText = user.email;
    editLevel.value = user.level || 1;
    editXp.value = user.xp || 0;
    editPoints.value = user.points || 0;
    editModal.classList.remove('hidden');
}

document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    editModal.classList.add('hidden');
});

document.getElementById('save-edit-btn').addEventListener('click', async () => {
    if (!currentEditingId || !isFirebaseConfigured) return;
    
    document.getElementById('save-edit-btn').innerText = "Saving...";
    try {
        await setDoc(doc(db, "users", currentEditingId), {
            level: parseInt(editLevel.value) || 1,
            xp: parseInt(editXp.value) || 0,
            points: parseInt(editPoints.value) || 0
        }, { merge: true });
        
        editModal.classList.add('hidden');
        document.getElementById('save-edit-btn').innerText = "Save Changes";
        loadUsers();
    } catch(err) {
        console.error("Error saving user", err);
        alert("Failed to save changes.");
        document.getElementById('save-edit-btn').innerText = "Save Changes";
    }
});

document.getElementById('reset-student-btn').addEventListener('click', async () => {
    if (!currentEditingId || !isFirebaseConfigured) return;
    
    const confirmReset = confirm("Are you absolutely sure you want to reset this student's progress? This will reset them to Level 1 and delete all their points, XP, and completed badges. This action CANNOT be undone.");
    
    if (confirmReset) {
        document.getElementById('reset-student-btn').innerText = "Resetting...";
        try {
            await updateDoc(doc(db, "users", currentEditingId), {
                level: 1,
                xp: 0,
                points: 0,
                completedModules: []
            });
            editModal.classList.add('hidden');
            document.getElementById('reset-student-btn').innerText = "⚠️ Reset Student Progress";
            loadUsers();
            alert("Student progress has been successfully reset.");
        } catch(err) {
            console.error("Error resetting user", err);
            alert("Failed to reset student.");
            document.getElementById('reset-student-btn').innerText = "⚠️ Reset Student Progress";
        }
    }
});

// Individual Delete & Reset Handlers
async function handleResetPassword(email) {
    if (!email || email === "undefined") {
        alert("Cannot reset password: No email found for this user.");
        return;
    }
    const confirmReset = confirm(`Send a password reset email to ${email}?`);
    if (confirmReset) {
        try {
            await sendPasswordResetEmail(auth, email);
            alert(`Password reset email sent to ${email}`);
        } catch(err) {
            console.error(err);
            alert("Failed to send reset email. " + err.message);
        }
    }
}

async function handleDeleteUser(id) {
    const confirmDelete = confirm("Are you sure you want to permanently delete this student's progress? This will remove them from the roster.");
    if (confirmDelete) {
        try {
            await deleteDoc(doc(db, "users", id));
            loadUsers();
            alert("Student deleted successfully.");
        } catch(err) {
            console.error("Error deleting student:", err);
            alert("Failed to delete student.");
        }
    }
}

async function handleBanUser(id, action) {
    const isBanning = action === 'ban';
    const confirmMsg = isBanning 
        ? "Are you sure you want to BAN this student? They will be forcefully logged out and prevented from playing."
        : "Are you sure you want to UNBAN this student? They will regain access to the game.";
        
    if (confirm(confirmMsg)) {
        try {
            await updateDoc(doc(db, "users", id), { banned: isBanning });
            loadUsers();
        } catch(err) {
            console.error("Error updating ban status:", err);
            alert("Failed to update ban status.");
        }
    }
}

// Init
loadUsers();
