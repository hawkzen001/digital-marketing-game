import { auth, isFirebaseConfigured, signInWithEmailAndPassword } from './firebase-config.js';

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('error-msg');
const submitBtn = loginForm.querySelector('button[type="submit"]');

// Check if already logged in (Mock)
if (!isFirebaseConfigured && localStorage.getItem('dm_mock_user')) {
    window.location.href = 'index.html';
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    
    errorMsg.style.display = 'none';
    submitBtn.innerText = 'Signing in...';
    submitBtn.disabled = true;

    if (!isFirebaseConfigured) {
        // MOCK LOGIN FOR PROTOTYPE
        setTimeout(() => {
            if (email.toLowerCase() === '001nilesh.sharma@gmail.com' || email.includes('admin')) {
                localStorage.setItem('dm_mock_user', JSON.stringify({ email, role: 'admin' }));
                window.location.href = 'admin.html';
            } else {
                localStorage.setItem('dm_mock_user', JSON.stringify({ email, role: 'student' }));
                window.location.href = 'index.html';
            }
        }, 1000);
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("Logged in user email:", user.email);
        if (user.email && user.email.toLowerCase() === '001nilesh.sharma@gmail.com') {
            const modal = document.getElementById('admin-role-modal');
            if (modal) {
                modal.classList.remove('hidden');
                document.getElementById('go-admin-btn').onclick = () => { window.location.href = 'admin.html'; };
                document.getElementById('go-student-btn').onclick = () => { window.location.href = 'index.html'; };
                return; 
            }
        }
        
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Login error:", error);
        errorMsg.innerText = error.message;
        errorMsg.style.display = 'block';
        submitBtn.innerText = 'Sign In';
        submitBtn.disabled = false;
    }
});
