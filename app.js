import { auth, db, isFirebaseConfigured, vertexAI, getGenerativeModel, onAuthStateChanged, collection, getDocs, getDoc, setDoc, doc, updateProfile, query, orderBy, limit, signOut, addDoc, updateDoc } from './firebase-config.js';
import { coreModules, activitiesData } from './content.js';
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const GEMINI_API_KEY = "AQ.Ab8RN6Lat2G5hyK6yAYCA_i9rozYtVvUqVwjQq6Uzpu1b6VCJA";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);


// --- Auth Check ---
let currentUser = null;
if (!isFirebaseConfigured) {
    const mockUser = localStorage.getItem('dm_mock_user');
    if (!mockUser) window.location.href = 'login.html';
    else {
        currentUser = JSON.parse(mockUser);
        window.addEventListener('DOMContentLoaded', init);
    }
} else {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            init();
        } else {
            window.location.href = 'login.html';
        }
    });
}

// --- Data & State ---
const state = {
    user: {
        points: 0,
        xp: 0,
        level: 1,
        badges: [],
        completedModules: [],
        progress: {},
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null
    },
    currentCoreModuleId: null,
    currentActivityId: null,
    currentQuestionIndex: 0,
    score: 0
};

const LEVEL_THRESHOLDS = [0, 500, 1200, 2500, 5000, 10000, 20000];

// --- DOM Elements ---
const DOM = {
    views: {
        dashboard: document.getElementById('dashboard-view'),
        moduleDetails: document.getElementById('module-details-view'),
        quiz: document.getElementById('quiz-view'),
        simulation: document.getElementById('simulation-view'),
        results: document.getElementById('results-view'),
        leaderboard: document.getElementById('leaderboard-view'),
        profile: document.getElementById('profile-view'),
        badges: document.getElementById('badges-view'),
        quizLevels: document.getElementById('quiz-levels-view'),
        timeAttack: document.getElementById('time-attack-view'),
        pvp: document.getElementById('pvp-view')
    },
    navBtns: document.querySelectorAll('.nav-btn'),
    stats: {
        points: document.getElementById('total-points'),
        xpFill: document.getElementById('xp-fill'),
        xpText: document.getElementById('user-xp'),
        level: document.getElementById('user-level'),
        xp: document.getElementById('user-xp'),
        badgesCard: document.getElementById('badges-stat-card'),
        badgesCount: document.getElementById('badges-earned'),
        streak: document.getElementById('user-streak'),
        userName: document.getElementById('user-name')
    },
    containers: {
        coreModules: document.getElementById('core-modules-container'),
        activities: document.getElementById('activities-container')
    },
    details: {
        title: document.getElementById('details-title'),
        description: document.getElementById('details-description'),
        backBtn: document.getElementById('details-back-btn')
    },
    quiz: {
        title: document.getElementById('quiz-title'),
        currentQ: document.getElementById('current-q'),
        totalQ: document.getElementById('total-q'),
        questionText: document.getElementById('question-text'),
        optionsContainer: document.getElementById('options-container'),
        feedbackOverlay: document.getElementById('quiz-feedback'),
        feedbackTitle: document.getElementById('feedback-title'),
        feedbackMessage: document.getElementById('feedback-message'),
        nextBtn: document.getElementById('next-q-btn'),
        backBtn: document.getElementById('back-btn')
    },
    sim: {
        title: document.getElementById('sim-title'),
        budgetTxt: document.getElementById('sim-budget'),
        inputsContainer: document.getElementById('sim-inputs'),
        runBtn: document.getElementById('sim-run-btn'),
        feedback: document.getElementById('sim-feedback'),
        backBtn: document.getElementById('sim-back-btn'),
        imageContainer: document.getElementById('sim-image-container'),
        image: document.getElementById('sim-image')
    },
    aiSim: {
        title: document.getElementById('ai-sim-title'),
        imageContainer: document.getElementById('ai-sim-image-container'),
        image: document.getElementById('ai-sim-image'),
        prompt: document.getElementById('ai-sim-prompt'),
        input: document.getElementById('ai-sim-input'),
        submitBtn: document.getElementById('ai-sim-submit-btn'),
        feedback: document.getElementById('ai-sim-feedback'),
        score: document.getElementById('ai-sim-score'),
        scoreTitle: document.getElementById('ai-sim-score-title'),
        feedbackText: document.getElementById('ai-sim-feedback-text'),
        continueBtn: document.getElementById('ai-sim-continue-btn'),
        backBtn: document.getElementById('ai-sim-back-btn')
    },
    ta: {
        title: document.getElementById('time-attack-title'),
        timer: document.getElementById('ta-timer'),
        roas: document.getElementById('ta-roas'),
        status: document.getElementById('ta-status'),
        actions: document.getElementById('ta-actions-container'),
        overlay: document.getElementById('ta-feedback-overlay'),
        fTitle: document.getElementById('ta-feedback-title'),
        fMessage: document.getElementById('ta-feedback-message'),
        fXp: document.getElementById('ta-feedback-xp'),
        finishBtn: document.getElementById('ta-finish-btn'),
        backBtn: document.getElementById('time-attack-back-btn')
    },
    pvp: {
        title: document.getElementById('pvp-title'),
        prompt: document.getElementById('pvp-prompt'),
        opponentPitch: document.getElementById('pvp-opponent-pitch'),
        input: document.getElementById('pvp-input'),
        submitBtn: document.getElementById('pvp-submit-btn'),
        feedback: document.getElementById('pvp-feedback'),
        resultTitle: document.getElementById('pvp-result-title'),
        feedbackText: document.getElementById('pvp-feedback-text'),
        continueBtn: document.getElementById('pvp-continue-btn'),
        backBtn: document.getElementById('pvp-back-btn')
    },
    results: {
        earnedPoints: document.getElementById('earned-points'),
        returnBtn: document.getElementById('return-dashboard-btn')
    },
    logoutBtn: document.getElementById('logout-btn')
};

// --- Initialization ---
async function init() {
    if (currentUser) {
        DOM.stats.userName.innerText = currentUser.displayName || currentUser.email.split('@')[0];
        const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';
        const userAvatar = currentUser.photoURL || defaultAvatar;
        const sidebarAvatar = document.getElementById('sidebar-avatar');
        const profileAvatar = document.getElementById('profile-avatar-img');
        if (sidebarAvatar) {
            sidebarAvatar.src = userAvatar;
            sidebarAvatar.style.opacity = '1';
        }
        if (profileAvatar) profileAvatar.src = userAvatar;

        if (currentUser.email && currentUser.email.toLowerCase() === '001nilesh.sharma@gmail.com') {
            const adminBtn = document.getElementById('switch-to-admin-btn');
            if (adminBtn) {
                adminBtn.style.display = 'inline-block';
                adminBtn.onclick = () => window.location.href = 'admin.html';
            }
        }
    }
    await loadLocalState();
    updateUIStats();
    renderCoreModules();
    setupEventListeners();
    populateLeaderboard();

    // Hide global loader once everything is loaded
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
    }
}

async function loadLocalState() {
    if (isFirebaseConfigured && currentUser) {
        try {
            const docSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.banned) {
                    alert("Your account has been banned by the administrator.");
                    await signOut(auth);
                    localStorage.removeItem('dm_game_state');
                    window.location.href = 'login.html';
                    return;
                }

                Object.assign(state.user, {
                    points: data.points || 0,
                    xp: data.xp || 0,
                    level: data.level || 1,
                    badges: data.badges || [],
                    completedModules: data.completedModules || [],
                    progress: data.progress || {},
                    currentStreak: data.currentStreak || 0,
                    longestStreak: data.longestStreak || 0,
                    lastActiveDate: data.lastActiveDate || null
                });
                localStorage.setItem('dm_game_state', JSON.stringify(state.user));
                return;
            }
        } catch (e) {
            console.error("Error fetching state from Firestore:", e);
        }
    }

    const saved = localStorage.getItem('dm_game_state');
    if (saved) {
        try { Object.assign(state.user, JSON.parse(saved)); } catch (e) { }
    }
}

function saveLocalState() {
    localStorage.setItem('dm_game_state', JSON.stringify(state.user));
    if (!isFirebaseConfigured) {
        let lb = JSON.parse(localStorage.getItem('dm_mock_leaderboard') || '[]');
        const name = currentUser ? (currentUser.displayName || currentUser.email.split('@')[0]) : 'You';
        lb = lb.filter(u => u.name !== name); // remove self
        lb.push({ name: name, points: state.user.points, level: state.user.level });
        lb.sort((a, b) => b.points - a.points);
        localStorage.setItem('dm_mock_leaderboard', JSON.stringify(lb));
    } else if (currentUser) {
        setDoc(doc(db, "users", currentUser.uid), {
            name: currentUser.displayName || currentUser.email.split('@')[0],
            points: state.user.points,
            xp: state.user.xp,
            level: state.user.level,
            badges: state.user.badges,
            completedModules: state.user.completedModules,
            progress: state.user.progress,
            currentStreak: state.user.currentStreak,
            longestStreak: state.user.longestStreak,
            lastActiveDate: state.user.lastActiveDate,
            lastSaved: new Date()
        }, { merge: true }).catch(e => console.error("Error saving state:", e));
    }
}

// --- UI Updates ---
function updateUIStats() {
    DOM.stats.points.innerHTML = state.user.points;
    let newLevel = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (state.user.xp >= LEVEL_THRESHOLDS[i]) { newLevel = i + 1; break; }
    }
    state.user.level = newLevel;
    DOM.stats.level.innerText = state.user.level;
    DOM.stats.xp.innerText = state.user.xp.toLocaleString();
    if (DOM.stats.streak) DOM.stats.streak.innerText = `🔥 ${state.user.currentStreak || 0}`;
    if (DOM.stats.badgesCount) DOM.stats.badgesCount.innerText = state.user.completedModules.length;
    DOM.stats.xpText.innerText = state.user.xp;

    const currentLevelXP = LEVEL_THRESHOLDS[state.user.level - 1];
    const nextLevelXP = LEVEL_THRESHOLDS[state.user.level] || (currentLevelXP + 1000);
    const progressPercent = Math.min(100, Math.max(0, ((state.user.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100));
    DOM.stats.xpFill.style.width = `${progressPercent}%`;

    const leagueEl = document.getElementById('user-league');
    if (leagueEl) {
        const league = getLeague(state.user.points || 0);
        leagueEl.innerHTML = `<span class="league-badge ${league.class}">${league.icon} ${league.name}</span>`;
    }
}

function switchView(viewName) {
    Object.values(DOM.views).forEach(v => {
        if (v) { v.classList.remove('active'); v.classList.add('hidden'); }
    });
    if (DOM.aiSim.view) { DOM.aiSim.view.classList.remove('active'); DOM.aiSim.view.classList.add('hidden'); }
    if (DOM.views[viewName]) {
        DOM.views[viewName].classList.remove('hidden');
        DOM.views[viewName].classList.add('active');
    } else if (viewName === 'aiSim') {
        DOM.aiSim.view.classList.remove('hidden');
        DOM.aiSim.view.classList.add('active');
    }
}

function renderBadges() {
    const container = document.getElementById('badges-container');
    if (!container) return;
    container.innerHTML = '';

    if (state.user.completedModules.length === 0) {
        container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">You haven\'t earned any badges yet. Complete activities to earn them!</p>';
        return;
    }

    state.user.completedModules.forEach(activityId => {
        const act = activitiesData.find(a => a.id === activityId);
        if (!act) return;

        const card = document.createElement('div');
        card.className = 'module-card';
        card.style.textAlign = 'center';

        let icon = '🏆';
        if (act.type === 'quiz') icon = '🧠';
        else if (act.type === 'scenario_sim' || act.type === 'budget_sim') icon = '🎮';
        else if (act.type === 'ai_free_text') icon = '🤖';

        card.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem;">${icon}</div>
            <h3 style="margin-bottom: 0.5rem;">${act.title}</h3>
            <p style="font-size: 0.85rem; color: var(--success);">Earned +${act.pointsReward} XP</p>
        `;
        container.appendChild(card);
    });
}

// --- Dashboard Flow Logic ---
function renderCoreModules() {
    DOM.containers.coreModules.innerHTML = '';
    coreModules.forEach(module => {
        const moduleActivities = activitiesData.filter(a => a.coreModuleId === module.id);
        const completedCount = moduleActivities.filter(a => state.user.completedModules.includes(a.id)).length;
        const totalCount = moduleActivities.length;
        const isFullyCompleted = totalCount > 0 && completedCount === totalCount;

        const isAdmin = currentUser && currentUser.email && currentUser.email.toLowerCase() === '001nilesh.sharma@gmail.com';
        const isLocked = !isAdmin && state.user.level < (module.requiredLevel || 1);

        const card = document.createElement('div');
        card.className = 'module-card';

        card.innerHTML = `
            <div class="module-icon">${module.icon}</div>
            <h3>${module.title}</h3>
            <p>${module.description}</p>
            <div class="module-meta">
                <span class="module-points">${completedCount}/${totalCount} Activities</span>
                ${isLocked ? `<span class="module-status" style="color:var(--error);">🔒 Lvl ${module.requiredLevel}</span>` :
                isFullyCompleted ? '<span class="module-status completed">✓ Done</span>' : '<span class="module-status">Open</span>'}
            </div>
        `;

        if (isLocked) {
            card.style.opacity = '0.5';
            card.style.cursor = 'not-allowed';
            card.onclick = () => alert(`This module is locked! Reach Level ${module.requiredLevel} to unlock it.`);
        } else {
            card.onclick = () => openCoreModule(module.id);
        }

        DOM.containers.coreModules.appendChild(card);
    });
}

function openCoreModule(moduleId) {
    state.currentCoreModuleId = moduleId;
    const module = coreModules.find(m => m.id === moduleId);
    if (!module) return;

    DOM.details.title.innerText = module.title;
    DOM.details.description.innerText = module.description;

    // Render Master Cards
    DOM.containers.activities.innerHTML = '';
    const activities = activitiesData.filter(a => a.coreModuleId === moduleId);
    const quizActivities = activities.filter(a => a.type === 'quiz');
    const simActivity = activities.find(a => a.type === 'scenario_sim');
    const aiActivity = activities.find(a => a.type === 'ai_free_text');

    const quizzesCompleted = quizActivities.filter(a => state.user.completedModules.includes(a.id)).length;
    const allQuizzesDone = quizActivities.length > 0 && quizzesCompleted === quizActivities.length;

    // 1. Knowledge Quizzes Master Card
    if (quizActivities.length > 0) {
        const quizCard = document.createElement('div');
        quizCard.className = 'module-card';
        quizCard.onclick = () => openQuizLevels(moduleId);
        quizCard.innerHTML = `
            <span class="activity-badge badge-quiz">[Quizzes]</span>
            <h3>Knowledge Quizzes</h3>
            <p>Test your knowledge across ${quizActivities.length} progressive difficulty levels.</p>
            <div class="module-meta">
                <span class="module-points">${quizzesCompleted}/${quizActivities.length} Levels</span>
                ${allQuizzesDone ? '<span class="module-status completed">✓ Mastered</span>' : '<span class="module-status">Start</span>'}
            </div>
        `;
        DOM.containers.activities.appendChild(quizCard);
    }

    // 2. Scenario Sim Master Card
    if (simActivity) {
        const isSimDone = state.user.completedModules.includes(simActivity.id);
        const simCard = document.createElement('div');
        simCard.className = 'module-card';
        simCard.onclick = () => startActivity(simActivity.id);
        simCard.innerHTML = `
            <span class="activity-badge badge-sim">[Simulation]</span>
            <h3>${simActivity.title}</h3>
            <p>${simActivity.description}</p>
            <div class="module-meta">
                <span class="module-points">+${simActivity.pointsReward} XP</span>
                ${isSimDone ? '<span class="module-status completed">✓ Completed</span>' : '<span class="module-status">Start</span>'}
            </div>
        `;
        DOM.containers.activities.appendChild(simCard);
    }

    // 3. AI Pitch Master Card
    if (aiActivity) {
        const isAiDone = state.user.completedModules.includes(aiActivity.id);
        const aiCard = document.createElement('div');
        aiCard.className = 'module-card';
        aiCard.onclick = () => startActivity(aiActivity.id);
        aiCard.innerHTML = `
            <span class="activity-badge badge-sim" style="background:var(--accent-purple);color:white;">[AI Eval]</span>
            <h3>${aiActivity.title}</h3>
            <p>${aiActivity.description}</p>
            <div class="module-meta">
                <span class="module-points">+${aiActivity.pointsReward} XP</span>
                ${isAiDone ? '<span class="module-status completed">✓ Completed</span>' : '<span class="module-status">Start</span>'}
            </div>
        `;
        DOM.containers.activities.appendChild(aiCard);
    }
    // 4. Time Attack Master Card
    const taCard = document.createElement('div');
    taCard.className = 'module-card';
    taCard.onclick = () => renderTimeAttack();
    taCard.innerHTML = `
        <span class="activity-badge badge-sim" style="background:var(--error);color:white;">[Time Attack]</span>
        <h3>Live Campaign Simulator</h3>
        <p>60-second real-time pressure test. Stabilize the dropping ROAS!</p>
        <div class="module-meta">
            <span class="module-points">Up to +500 XP</span>
            <span class="module-status">Start</span>
        </div>
    `;
    DOM.containers.activities.appendChild(taCard);

    // 5. PvP Master Card
    const pvpCard = document.createElement('div');
    pvpCard.className = 'module-card';
    pvpCard.onclick = () => renderPvP(moduleId);
    pvpCard.innerHTML = `
        <span class="activity-badge badge-sim" style="background:var(--accent-orange);color:white;">[PvP Arena]</span>
        <h3>Agency Pitch Battle</h3>
        <p>Battle a real student's strategy using Vertex AI as the judge. Winner steals XP!</p>
        <div class="module-meta">
            <span class="module-points">Steal +100 XP</span>
            <span class="module-status">Battle</span>
        </div>
    `;
    DOM.containers.activities.appendChild(pvpCard);
    switchView('moduleDetails');
}

function openQuizLevels(moduleId) {
    const quizActivities = activitiesData.filter(a => a.coreModuleId === moduleId && a.type === 'quiz');
    const container = document.getElementById('quiz-levels-container');
    if (!container) return;
    
    container.innerHTML = '';
    quizActivities.forEach(act => {
        const isCompleted = state.user.completedModules.includes(act.id);
        const card = document.createElement('div');
        card.className = 'module-card';
        card.onclick = () => startActivity(act.id);

        card.innerHTML = `
            <span class="activity-badge badge-quiz">[Level]</span>
            <h3>${act.title}</h3>
            <p>${act.description}</p>
            <div class="module-meta">
                <span class="module-points">+${act.pointsReward} XP</span>
                ${isCompleted ? '<span class="module-status completed">✓ Completed</span>' : '<span class="module-status">Start</span>'}
            </div>
        `;
        container.appendChild(card);
    });

    switchView('quizLevels');
}

function startActivity(activityId) {
    state.currentActivityId = activityId;
    const act = activitiesData.find(a => a.id === activityId);
    if (!act) return;

    if (act.type === 'quiz' || act.type === 'scenario_sim') {
        const savedProgress = state.user.progress[act.id] || { index: 0, score: 0 };
        state.currentQuestionIndex = savedProgress.index;
        state.score = savedProgress.score;
        DOM.quiz.title.innerText = act.title;
        DOM.quiz.totalQ.innerText = (act.type === 'quiz') ? act.questions.length : act.scenarios.length;
        renderQuizOrScenario();
        switchView('quiz');
    } else if (act.type === 'budget_sim') {
        renderSimulation(act);
        switchView('sim');
    } else if (act.type === 'ai_free_text') {
        const savedProgress = state.user.progress[act.id] || { index: 0, score: 0 };
        currentAiIndex = savedProgress.index;
        totalAiScore = savedProgress.score;
        renderAIFreeText(act);
        switchView('aiSim');
    }
}

// --- Quiz & Scenario Logic ---
function renderQuizOrScenario() {
    const act = activitiesData.find(a => a.id === state.currentActivityId);
    let item;

    if (act.type === 'quiz') {
        item = act.questions[state.currentQuestionIndex];
        DOM.quiz.questionText.innerText = item.text;
    } else {
        item = act.scenarios[state.currentQuestionIndex];
        DOM.quiz.questionText.innerText = item.prompt;
    }

    const imgContainer = document.getElementById('question-image-container');
    const imgEl = document.getElementById('question-image');
    if (imgContainer && imgEl) {
        if (item.image) {
            imgEl.src = item.image;
            imgContainer.classList.remove('hidden');
        } else {
            imgContainer.classList.add('hidden');
            imgEl.src = "";
        }
    }

    DOM.quiz.currentQ.innerText = state.currentQuestionIndex + 1;
    DOM.quiz.optionsContainer.innerHTML = '';
    DOM.quiz.feedbackOverlay.classList.add('hidden');

    item.options.forEach((optText, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (act.type === 'scenario_sim') btn.classList.add('scenario-btn');
        btn.innerText = optText;
        btn.onclick = () => handleAnswer(index, btn, item, act);
        DOM.quiz.optionsContainer.appendChild(btn);
    });
}

function handleAnswer(selectedIndex, btnElement, item, act) {
    const isCorrect = selectedIndex === item.correctIndex;
    const allBtns = DOM.quiz.optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(b => b.disabled = true);

    const xpPerQuestion = Math.floor(act.pointsReward / (act.questions ? act.questions.length : act.scenarios.length));

    if (isCorrect) {
        btnElement.classList.add('correct');
        DOM.quiz.feedbackTitle.innerText = act.type === 'scenario_sim' ? "Great Choice!" : "Excellent!";
        DOM.quiz.feedbackTitle.style.color = "var(--success)";
        DOM.quiz.feedbackMessage.innerText = `+${xpPerQuestion} XP. ${item.feedback || item.explanation || ''}`;
        state.score += xpPerQuestion;
    } else {
        btnElement.classList.add('wrong');
        allBtns[item.correctIndex].classList.add('correct');
        DOM.quiz.feedbackTitle.innerText = "Not quite.";
        DOM.quiz.feedbackTitle.style.color = "var(--error)";
        DOM.quiz.feedbackMessage.innerText = item.feedback || item.explanation || '';
    }
    DOM.quiz.feedbackOverlay.classList.remove('hidden');
}

DOM.quiz.nextBtn.addEventListener('click', () => {
    const act = activitiesData.find(a => a.id === state.currentActivityId);
    const totalItems = act.type === 'quiz' ? act.questions.length : act.scenarios.length;

    if (state.currentQuestionIndex < totalItems - 1) {
        state.currentQuestionIndex++;
        state.user.progress[act.id] = { index: state.currentQuestionIndex, score: state.score };
        saveLocalState();
        renderQuizOrScenario();
    } else {
        finishActivity(act, state.score);
    }
});

// --- Budget Simulation Logic ---
function renderBudgetSimulation(act) {
    DOM.sim.title.innerText = act.title;
    DOM.sim.budgetTxt.innerText = `₹${act.simulation.budget.toLocaleString()}`;
    DOM.sim.inputsContainer.innerHTML = '';
    DOM.sim.feedback.innerHTML = '';
    act.simulation.channels.forEach(ch => {
        const row = document.createElement('div');
        row.className = 'form-group';
        row.innerHTML = `
            <label>${ch.name} Budget (₹)</label>
            <input type="number" class="form-input sim-input" data-id="${ch.id}" placeholder="0" min="0" step="1000">
        `;
        DOM.sim.inputsContainer.appendChild(row);
    });
}

DOM.sim.runBtn.addEventListener('click', () => {
    const act = activitiesData.find(a => a.id === state.currentActivityId);
    if (act.type !== 'budget_sim') return;

    let totalSpent = 0;
    let expectedReturn = 0;
    let valid = true;

    document.querySelectorAll('.sim-input').forEach(input => {
        const val = parseInt(input.value) || 0;
        const ch = act.simulation.channels.find(c => c.id === input.dataset.id);
        if (val < ch.min) {
            DOM.sim.feedback.innerHTML = `<span style="color:var(--error)">${ch.name} requires a minimum budget of ₹${ch.min.toLocaleString()}</span>`;
            valid = false;
        }
        totalSpent += val;
        const roi = ch.baseRoi * (1 - (val / 200000));
        expectedReturn += val * roi;
    });

    if (!valid) return;

    if (totalSpent > act.simulation.budget) {
        DOM.sim.feedback.innerHTML = `<span style="color:var(--error)">Over Budget! You spent ₹${totalSpent.toLocaleString()} of ₹${act.simulation.budget.toLocaleString()}</span>`;
        return;
    }

    const overallRoi = expectedReturn / totalSpent;

    if (overallRoi >= act.simulation.targetRoi) {
        DOM.sim.feedback.innerHTML = `<span style="color:var(--success)">Great Job! Your ROI is ${(overallRoi * 100).toFixed(0)}%. You generated ₹${expectedReturn.toFixed(0)} in revenue!</span>`;
        setTimeout(() => {
            finishActivity(act, act.pointsReward);
        }, 3000);
    } else {
        DOM.sim.feedback.innerHTML = `<span style="color:var(--error)">Your ROI was ${(overallRoi * 100).toFixed(0)}% (Target: ${(act.simulation.targetRoi * 100).toFixed(0)}%). Try shifting budget to higher ROI channels.</span>`;
    }
});

let currentAiIndex = 0;
let totalAiScore = 0;

// --- AI Free Text Simulation Logic ---
function renderAIFreeText(act) {
    const aiScenario = act.scenarios[currentAiIndex];
    DOM.aiSim.title.innerText = act.title + ` (Q${currentAiIndex + 1}/${act.scenarios.length})`;
    DOM.aiSim.prompt.innerText = aiScenario.scenario;
    DOM.aiSim.input.value = '';
    DOM.aiSim.input.disabled = false;
    DOM.aiSim.feedbackOverlay.classList.add('hidden');
    DOM.aiSim.submitBtn.innerHTML = '<span>Submit for AI Evaluation</span>';
    DOM.aiSim.submitBtn.disabled = false;

    const imgContainer = document.getElementById('ai-sim-image-container');
    const imgEl = document.getElementById('ai-sim-image');
    if (imgContainer && imgEl) {
        if (aiScenario.image) {
            imgEl.src = aiScenario.image;
            imgContainer.classList.remove('hidden');
        } else {
            imgContainer.classList.add('hidden');
            imgEl.src = "";
        }
    }
}

DOM.aiSim.submitBtn.addEventListener('click', async () => {
    const act = activitiesData.find(a => a.id === state.currentActivityId);
    if (act.type !== 'ai_free_text') return;

    const userInput = DOM.aiSim.input.value.trim();
    if (userInput.length < 10) {
        alert("Please provide a more detailed answer before submitting.");
        return;
    }

    DOM.aiSim.submitBtn.innerHTML = '<span>Evaluating... ⏳</span>';
    DOM.aiSim.submitBtn.disabled = true;
    DOM.aiSim.input.disabled = true;

    let aiGrade = 0;
    let aiFeedbackText = '';

    const evaluationSchema = {
        type: "object",
        properties: {
            grade: { type: "number", description: "Grade from 0 to 100 based on marketing best practices." },
            feedback: { type: "string", description: "Detailed feedback explaining why they got this grade." }
        },
        required: ["grade", "feedback"]
    };

    const aiScenario = act.scenarios[currentAiIndex];
    const systemPrompt = `You are an expert digital marketing instructor grading a student's submission. 
Scenario: ${aiScenario.scenario}
Student Answer: "${userInput}"

Evaluate the student's answer. Grade it from 0 to 100 based on marketing best practices, relevance to the prompt, and creativity.`;

    // Try Firebase Vertex AI first
    if (vertexAI) {
        try {
            const model = getGenerativeModel(vertexAI, {
                model: 'gemini-2.5-flash',
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: "application/json",
                    responseSchema: evaluationSchema
                }
            });

            const result = await model.generateContent(systemPrompt);
            const responseText = result.response.text();

            const parsed = JSON.parse(responseText);
            aiGrade = parsed.grade || 0;
            aiFeedbackText = parsed.feedback || 'No feedback provided.';

        } catch (error) {
            console.warn("Vertex AI Evaluation failed. Falling back to raw Gemini API:", error);
            try {
                const model = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash",
                    generationConfig: {
                        temperature: 0.2,
                        responseMimeType: "application/json",
                        responseSchema: evaluationSchema
                    }
                });
                const result = await model.generateContent(systemPrompt);
                const parsed = JSON.parse(result.response.text());
                aiGrade = parsed.grade || 0;
                aiFeedbackText = parsed.feedback || 'No feedback provided.';
            } catch (fallbackError) {
                console.error("Fallback AI Evaluation failed:", fallbackError);
                aiGrade = 75;
                aiFeedbackText = `AI Evaluation failed: ${fallbackError.message}`;
            }
        }
    } else {
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: "application/json",
                    responseSchema: evaluationSchema
                }
            });
            const result = await model.generateContent(systemPrompt);
            const parsed = JSON.parse(result.response.text());
            aiGrade = parsed.grade || 0;
            aiFeedbackText = parsed.feedback || 'No feedback provided.';
        } catch (fallbackError) {
            console.error("Fallback AI Evaluation failed:", fallbackError);
            aiGrade = 75;
            aiFeedbackText = `AI Evaluation failed: ${fallbackError.message}`;
        }
    }

    // Calculate XP based on grade
    const pointsEarned = Math.floor((act.pointsReward / act.scenarios.length) * (aiGrade / 100));
    totalAiScore += pointsEarned;
    state.score = pointsEarned;

    // Save high scoring pitches for PvP
    if (aiGrade >= 80 && isFirebaseConfigured) {
        try {
            await addDoc(collection(db, 'pitches'), {
                moduleId: state.currentCoreModuleId,
                scenario: aiScenario.scenario,
                prompt: aiScenario.prompt,
                studentId: currentUser.uid,
                studentName: currentUser.displayName || 'Anonymous Strategist',
                pitch: userInput,
                grade: aiGrade,
                timestamp: new Date().toISOString(),
                lastLostDate: null // SHIELD: Tracks when this pitch last lost XP
            });
            console.log("High-scoring pitch saved for PvP Arena!");
        } catch (e) {
            console.error("Error saving pitch for PvP:", e);
        }
    }

    // Display Feedback
    DOM.aiSim.score.innerText = `${aiGrade}/100`;
    DOM.aiSim.score.style.color = aiGrade >= 70 ? 'var(--success)' : 'var(--error)';
    DOM.aiSim.feedbackText.innerText = aiFeedbackText;
    DOM.aiSim.feedbackOverlay.classList.remove('hidden');
    DOM.aiSim.submitBtn.innerHTML = '<span>Evaluation Complete</span>';
});

DOM.aiSim.continueBtn.addEventListener('click', () => {
    const act = activitiesData.find(a => a.id === state.currentActivityId);
    currentAiIndex++;
    if (currentAiIndex >= act.scenarios.length) {
        finishActivity(act, totalAiScore);
        currentAiIndex = 0;
        totalAiScore = 0;
    } else {
        state.user.progress[act.id] = { index: currentAiIndex, score: totalAiScore };
        saveLocalState();
        renderAIFreeText(act);
    }
});

// --- Time Attack Logic ---
let taInterval;
let taTimeLeft;
let taRoas;

function renderTimeAttack() {
    state.currentActivityId = 'time_attack_' + state.currentCoreModuleId;
    switchView('timeAttack');
    
    taTimeLeft = 60;
    taRoas = 3.5;
    
    DOM.ta.timer.innerText = taTimeLeft;
    DOM.ta.roas.innerText = taRoas.toFixed(1) + 'x';
    DOM.ta.status.innerText = "Campaign is stable.";
    DOM.ta.overlay.classList.add('hidden');
    DOM.ta.actions.innerHTML = '';
    
    const actions = [
        { label: "A/B Test Ad Copy", effect: 0.3 },
        { label: "Pause Underperforming Keyword", effect: 0.5 },
        { label: "Increase CPC Bid", effect: -0.2 },
        { label: "Optimize Landing Page", effect: 0.4 },
        { label: "Broaden Audience", effect: -0.4 }
    ];
    
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = action.label;
        btn.onclick = () => {
            taRoas += action.effect;
            DOM.ta.roas.innerText = Math.max(0, taRoas).toFixed(1) + 'x';
            btn.disabled = true;
            btn.style.opacity = '0.5';
            setTimeout(() => {
                btn.disabled = false;
                btn.style.opacity = '1';
            }, 3000); // Cooldown
        };
        DOM.ta.actions.appendChild(btn);
    });
    
    if (taInterval) clearInterval(taInterval);
    taInterval = setInterval(() => {
        taTimeLeft--;
        DOM.ta.timer.innerText = taTimeLeft;
        
        // ROAS naturally decays
        taRoas -= (Math.random() * 0.4 + 0.1); 
        DOM.ta.roas.innerText = Math.max(0, taRoas).toFixed(1) + 'x';
        
        if (taRoas < 1.0) {
            DOM.ta.status.innerText = "CRITICAL: You are losing money!";
            DOM.ta.status.style.color = "var(--error)";
            DOM.ta.roas.style.color = "var(--error)";
        } else if (taRoas > 3.0) {
            DOM.ta.status.innerText = "Campaign is highly profitable.";
            DOM.ta.status.style.color = "var(--success)";
            DOM.ta.roas.style.color = "var(--success)";
        } else {
            DOM.ta.status.innerText = "Campaign is stable.";
            DOM.ta.status.style.color = "var(--text-light)";
            DOM.ta.roas.style.color = "var(--text-light)";
        }
        
        if (taTimeLeft <= 0) {
            clearInterval(taInterval);
            finishTimeAttack();
        }
    }, 1000);
}

function finishTimeAttack() {
    let xpEarned = 0;
    if (taRoas >= 4.0) xpEarned = 500;
    else if (taRoas >= 2.0) xpEarned = 250;
    else if (taRoas >= 1.0) xpEarned = 100;
    else xpEarned = 10; // Participation

    DOM.ta.fTitle.innerText = "Time's Up!";
    DOM.ta.fMessage.innerText = `Final ROAS: ${Math.max(0, taRoas).toFixed(1)}x`;
    DOM.ta.fXp.innerText = `+${xpEarned} XP`;
    
    DOM.ta.overlay.classList.remove('hidden');
    
    DOM.ta.finishBtn.onclick = () => {
        finishActivity({ id: state.currentActivityId }, xpEarned);
    };
}


// --- PvP Logic ---
let currentOpponentPitch = null;

async function renderPvP(moduleId) {
    state.currentActivityId = 'pvp_' + moduleId;
    switchView('pvp');
    
    DOM.pvp.prompt.innerText = "Finding a worthy opponent...";
    DOM.pvp.opponentPitch.innerText = "Loading...";
    DOM.pvp.input.value = "";
    DOM.pvp.feedback.classList.add('hidden');
    DOM.pvp.submitBtn.disabled = true;
    DOM.pvp.submitBtn.innerHTML = "Submit & Battle!";
    
    if (!isFirebaseConfigured) {
        DOM.pvp.prompt.innerText = "PvP requires Firebase to be configured to fetch opponents.";
        DOM.pvp.opponentPitch.innerText = "No opponent found.";
        return;
    }
    
    try {
        const q = query(collection(db, 'pitches'), limit(10));
        const querySnapshot = await getDocs(q);
        
        let opponents = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.studentId !== currentUser.uid && data.moduleId === moduleId) {
                opponents.push({ id: docSnap.id, ...data });
            }
        });
        
        if (opponents.length === 0) {
            const moduleAct = activitiesData.find(a => a.coreModuleId === moduleId && a.type === 'ai_free_text');
            const fallbackPrompt = moduleAct ? moduleAct.scenarios[0].scenario : "Pitch a creative digital marketing campaign for a new product.";
            currentOpponentPitch = {
                prompt: fallbackPrompt,
                pitch: "We will leverage a multi-channel approach focusing on high-ROI targeted ads, influencer partnerships, and aggressive A/B testing on our landing pages to maximize conversion rates.",
                grade: 85,
                isAI: true
            };
            DOM.pvp.prompt.innerHTML = `<strong>Challenge:</strong> ${currentOpponentPitch.prompt}`;
            DOM.pvp.opponentPitch.innerText = "AI Mastermind has set the benchmark:\n\n" + currentOpponentPitch.pitch;
            DOM.pvp.submitBtn.disabled = false;
            return;
        }
        
        currentOpponentPitch = opponents[Math.floor(Math.random() * opponents.length)];
        
        DOM.pvp.prompt.innerHTML = `<strong>Challenge:</strong> ${currentOpponentPitch.prompt}`;
        DOM.pvp.opponentPitch.innerText = currentOpponentPitch.pitch;
        DOM.pvp.submitBtn.disabled = false;
        
    } catch (e) {
        console.error("Error fetching opponent:", e);
        DOM.pvp.prompt.innerText = "Error connecting to the PvP Arena.";
    }
}


// --- Completion ---
function finishActivity(act, pointsEarned) {
    checkAndUpdateStreak();
    if (state.user.progress[act.id]) {
        delete state.user.progress[act.id];
    }
    if (!state.user.completedModules.includes(act.id)) {
        state.user.completedModules.push(act.id);
        state.user.points += pointsEarned;
        state.user.xp += pointsEarned;
        saveLocalState();
        updateUIStats();
        // re-render the modules lists to update ticks
        renderCoreModules();
    }
    DOM.results.earnedPoints.innerText = `+${pointsEarned}`;
    switchView('results');
}

// --- Events ---
function setupEventListeners() {
    DOM.navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            DOM.navBtns.forEach(b => b.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');

            const view = target.dataset.view;
            if (view) switchView(view);
            if (view === 'leaderboard') populateLeaderboard();
        });
    });

    DOM.details.backBtn.addEventListener('click', () => switchView('dashboard'));
    const quizLevelsBackBtn = document.getElementById('quiz-levels-back-btn');
    if (quizLevelsBackBtn) quizLevelsBackBtn.addEventListener('click', () => openCoreModule(state.currentCoreModuleId));
    
    DOM.quiz.backBtn.addEventListener('click', () => {
        const act = activitiesData.find(a => a.id === state.currentActivityId);
        if (act && act.type === 'quiz') openQuizLevels(state.currentCoreModuleId);
        else openCoreModule(state.currentCoreModuleId);
    });
    
    DOM.sim.backBtn.addEventListener('click', () => openCoreModule(state.currentCoreModuleId));
    if (DOM.aiSim.backBtn) DOM.aiSim.backBtn.addEventListener('click', () => openCoreModule(state.currentCoreModuleId));
    
    // TA and PvP back buttons
    if (DOM.ta.backBtn) DOM.ta.backBtn.addEventListener('click', () => {
        if (taInterval) clearInterval(taInterval);
        openCoreModule(state.currentCoreModuleId);
    });
    if (DOM.pvp.backBtn) DOM.pvp.backBtn.addEventListener('click', () => openCoreModule(state.currentCoreModuleId));
    
    DOM.results.returnBtn.addEventListener('click', () => {
        const act = activitiesData.find(a => a.id === state.currentActivityId);
        if (act && act.type === 'quiz') openQuizLevels(state.currentCoreModuleId);
        else openCoreModule(state.currentCoreModuleId);
    });

    const handleRestart = () => {
        if (confirm("Are you sure you want to restart this activity? All saved progress will be lost.")) {
            if (state.user.progress[state.currentActivityId]) {
                delete state.user.progress[state.currentActivityId];
                saveLocalState();
            }
            const act = activitiesData.find(a => a.id === state.currentActivityId);
            openActivity(act);
        }
    };

    const restartQuizBtn = document.getElementById('restart-quiz-btn');
    if (restartQuizBtn) restartQuizBtn.addEventListener('click', handleRestart);
    
    const restartSimBtn = document.getElementById('restart-sim-btn');
    if (restartSimBtn) restartSimBtn.addEventListener('click', handleRestart);

    const restartAiBtn = document.getElementById('restart-ai-sim-btn');
    if (restartAiBtn) restartAiBtn.addEventListener('click', handleRestart);

    const badgesBackBtn = document.getElementById('badges-back-btn');
    if (badgesBackBtn) {
        badgesBackBtn.addEventListener('click', () => switchView('dashboard'));
    }

    if (DOM.stats.badgesCard) {
        DOM.stats.badgesCard.addEventListener('click', () => {
            renderBadges();
            switchView('badges');
        });
    }

    if (DOM.logoutBtn) {
        DOM.logoutBtn.addEventListener('click', () => {
            if (isFirebaseConfigured) {
                signOut(auth).then(() => {
                    localStorage.removeItem('dm_mock_user');
                    window.location.href = 'login.html';
                });
            } else {
                localStorage.removeItem('dm_mock_user');
                window.location.href = 'login.html';
            }
        });
    }

    let selectedAvatarUrl = currentUser ? (currentUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix') : 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';
    const avatarSeeds = ["Felix", "Aneka", "Oliver", "Bella", "Max", "Luna", "Leo", "Chloe", "Milo", "Mia", "Charlie", "Lily", "Simba", "Zoe", "Jack"];

    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            switchView('profile');
            document.getElementById('profile-name').value = currentUser.displayName || '';

            const avatarGrid = document.getElementById('avatar-selection-grid');
            if (avatarGrid) {
                avatarGrid.innerHTML = '';
                selectedAvatarUrl = currentUser ? (currentUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix') : 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';

                avatarSeeds.forEach(seed => {
                    const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                    const img = document.createElement('img');
                    img.src = url;
                    img.className = 'avatar-option';
                    if (selectedAvatarUrl === url) img.classList.add('selected');
                    img.onclick = () => {
                        document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
                        img.classList.add('selected');
                        selectedAvatarUrl = url;
                    };
                    avatarGrid.appendChild(img);
                });
            }
        });
    }

    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const newName = document.getElementById('profile-name').value.trim();
            const feedback = document.getElementById('profile-feedback');
            if (!newName) {
                feedback.innerHTML = '<span style="color:var(--error)">Please enter a name.</span>';
                return;
            }
            saveProfileBtn.disabled = true;
            feedback.innerText = 'Saving...';
            try {
                if (isFirebaseConfigured) {
                    await updateProfile(currentUser, { displayName: newName, photoURL: selectedAvatarUrl });
                    await setDoc(doc(db, "users", currentUser.uid), {
                        name: newName,
                        photoURL: selectedAvatarUrl,
                        points: state.user.points,
                        level: state.user.level,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                } else {
                    currentUser.displayName = newName;
                    currentUser.photoURL = selectedAvatarUrl;
                    localStorage.setItem('dm_mock_user', JSON.stringify(currentUser));
                }
                DOM.stats.userName.innerText = newName;
                const sidebarAvatar = document.getElementById('sidebar-avatar');
                const profileAvatar = document.getElementById('profile-avatar-img');
                if (sidebarAvatar) sidebarAvatar.src = selectedAvatarUrl;
                if (profileAvatar) profileAvatar.src = selectedAvatarUrl;
                feedback.innerHTML = '<span style="color:var(--success)">Profile saved!</span>';
                setTimeout(() => {
                    feedback.innerText = '';
                    switchView('dashboard');
                }, 1500);
            } catch (e) {
                console.error(e);
                feedback.innerHTML = '<span style="color:var(--error)">Error saving profile.</span>';
            }
            saveProfileBtn.disabled = false;
        });
    }

    // PvP Events
    DOM.pvp.submitBtn.addEventListener('click', async () => {
        if (!currentOpponentPitch) return;
        
        const userInput = DOM.pvp.input.value.trim();
        if (userInput.length < 10) {
            alert("Please write a complete strategy to battle!");
            return;
        }
        
        DOM.pvp.submitBtn.disabled = true;
        DOM.pvp.input.disabled = true;
        DOM.pvp.submitBtn.innerHTML = "Vertex AI is Judging the Battle... ⚔️";
        
        const evaluationSchema = {
            type: "object",
            properties: {
                winner: { type: "string", description: "Either 'challenger' or 'opponent'" },
                feedback: { type: "string", description: "Detailed explanation of why that strategy won." }
            },
            required: ["winner", "feedback"]
        };
        
        const systemPrompt = `You are an expert digital marketing judge. Two marketers have submitted strategies for the same prompt.
    Prompt: ${currentOpponentPitch.prompt}
    
    Opponent Strategy (Score: ${currentOpponentPitch.grade}): "${currentOpponentPitch.pitch}"
    Challenger Strategy: "${userInput}"
    
    Evaluate both strategies. Decide the absolute winner based on marketing ROI, creativity, and realism.`;
    
        let winner = 'opponent';
        let feedback = '';
        
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: "application/json",
                    responseSchema: evaluationSchema
                }
            });
            const result = await model.generateContent(systemPrompt);
            const parsed = JSON.parse(result.response.text());
            winner = parsed.winner;
            feedback = parsed.feedback;
        } catch (e) {
            console.error("PvP Eval Failed", e);
            winner = 'challenger';
            feedback = "The judges had a technical error, so we award the victory to the Challenger!";
        }
        
        DOM.pvp.feedback.classList.remove('hidden');
        DOM.pvp.feedbackText.innerText = feedback;
        
        if (winner === 'challenger') {
            DOM.pvp.resultTitle.innerText = "🏆 Victory!";
            DOM.pvp.resultTitle.style.color = "var(--success)";
            DOM.pvp.submitBtn.innerHTML = "You Won +100 XP!";
            finishActivity({ id: state.currentActivityId }, 100);
            
            if (!currentOpponentPitch.isAI) {
                const todayStr = new Date().toISOString().split('T')[0];
                if (currentOpponentPitch.lastLostDate !== todayStr && isFirebaseConfigured) {
                    try {
                        const pitchRef = doc(db, 'pitches', currentOpponentPitch.id);
                        await updateDoc(pitchRef, { lastLostDate: todayStr });
                    } catch(e) {
                        console.error("Error applying shield/penalty:", e);
                    }
                }
            }
        } else {
            DOM.pvp.resultTitle.innerText = "💀 Defeat!";
            DOM.pvp.resultTitle.style.color = "var(--error)";
            
            if (currentOpponentPitch.isAI) {
                DOM.pvp.submitBtn.innerHTML = "You Lost against AI (No XP Penalty)";
            } else {
                DOM.pvp.submitBtn.innerHTML = "You Lost -50 XP!";
                state.user.xp = Math.max(0, state.user.xp - 50);
                state.user.points = Math.max(0, state.user.points - 50);
                saveLocalState();
                updateUIStats();
            }
        }
    });
    
    DOM.pvp.continueBtn.addEventListener('click', () => {
        openCoreModule(state.currentCoreModuleId);
    });
}

function checkAndUpdateStreak() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    if (!state.user.lastActiveDate) {
        // First time playing!
        state.user.currentStreak = 1;
        if (state.user.longestStreak < 1) state.user.longestStreak = 1;
        state.user.lastActiveDate = today.toISOString();
        saveLocalState();
        updateUIStats();
        return;
    }

    const lastDate = new Date(state.user.lastActiveDate);
    lastDate.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        // Logged in exactly 1 day later!
        state.user.currentStreak++;
        if (state.user.currentStreak > state.user.longestStreak) {
            state.user.longestStreak = state.user.currentStreak;
        }
        state.user.lastActiveDate = today.toISOString();
        saveLocalState();
        updateUIStats();
        
        // Rewards for streaks
        if (state.user.currentStreak === 3) alert("🔥 3-Day Streak! Keep it up!");
        if (state.user.currentStreak === 7) {
            alert("🔥🔥🔥 7-Day Streak! You earned +2000 Bonus XP!");
            state.user.xp += 2000;
            state.user.points += 2000;
            saveLocalState();
        }
    } else if (diffDays > 1) {
        // Missed a day
        state.user.currentStreak = 1;
        state.user.lastActiveDate = today.toISOString();
        saveLocalState();
        updateUIStats();
    }
}

// --- General UI ---
function getLeague(points) {
    if (points >= 5000) return { name: 'Diamond', class: 'league-diamond', icon: '💎' };
    if (points >= 2500) return { name: 'Platinum', class: 'league-platinum', icon: '👑' };
    if (points >= 1000) return { name: 'Gold', class: 'league-gold', icon: '🥇' };
    if (points >= 500) return { name: 'Silver', class: 'league-silver', icon: '🥈' };
    return { name: 'Bronze', class: 'league-bronze', icon: '🥉' };
}

async function populateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

    let data = [];
    if (!isFirebaseConfigured) {
        data = JSON.parse(localStorage.getItem('dm_mock_leaderboard') || '[]');
        if (data.length === 0) {
            data = [
                { name: 'Sarah M.', points: 4200, level: 4 },
                { name: 'John D.', points: 3100, level: 3 },
                { name: 'Alex Student', points: 1500, level: 2 }
            ];
            localStorage.setItem('dm_mock_leaderboard', JSON.stringify(data));
        }
    } else {
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, orderBy("points", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                data.push(doc.data());
            });
        } catch (e) {
            console.error("Error fetching leaderboard:", e);
            list.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--error);">Failed to load leaderboard: ${e.message}</td></tr>`;
            return;
        }
    }

    list.innerHTML = '';
    data.sort((a, b) => b.points - a.points).forEach((u, i) => {
        const tr = document.createElement('tr');
        const league = getLeague(u.points || 0);
        tr.innerHTML = `
            <td>#${i + 1}</td>
            <td>${u.name || 'Anonymous'}</td>
            <td><span class="league-badge ${league.class}">${league.icon} ${league.name}</span></td>
            <td>Lvl ${u.level || 1}</td>
            <td style="color:var(--accent-blue); font-weight:bold;">${u.points || 0}</td>
        `;
        list.appendChild(tr);
    });
}
