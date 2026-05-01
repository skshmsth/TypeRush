// API Configuration - Simple Backend
const API_BASE = 'http://localhost:4000/api';

// DOM Elements
const elements = {
    textContent: document.getElementById("textContent"),
    typingInput: document.getElementById("typing-input"),
    startBtn: document.getElementById("startBtn"),
    resetBtn: document.getElementById("resetBtn"),
    timerEl: document.getElementById("time"),
    progressFill: document.getElementById("progressFill"),
    progressText: document.getElementById("progressText"),
    wpmEl: document.getElementById("wpm"),
    accuracyEl: document.getElementById("accuracy"),
    charactersEl: document.getElementById("characters"),
    timeSelect: document.getElementById("timeSelect"),
    difficultySelect: document.getElementById("difficultySelect"),
    themeToggle: document.getElementById("themeToggle"),
    userDropdown: document.getElementById("userDropdown"),
    dropdownTrigger: document.getElementById("dropdownTrigger"),
    dropdownMenu: document.getElementById("dropdownMenu"),
    authText: document.getElementById("authText"),
    leaderboardBtn: document.getElementById("leaderboardBtn"),
    saveScoreBtn: document.getElementById("saveScoreBtn")
};

// Modals
const modals = {
    results: document.getElementById("resultsModal"),
    auth: document.getElementById("authModal"),
    profile: document.getElementById("profileModal")
};

// Result elements
const resultElements = {
    finalWPM: document.getElementById("finalWPM"),
    finalAccuracy: document.getElementById("finalAccuracy"),
    finalCharacters: document.getElementById("finalCharacters"),
    finalDifficulty: document.getElementById("finalDifficulty"),
    finalTime: document.getElementById("finalTime"),
    finalErrors: document.getElementById("finalErrors")
};

// App State
let state = {
    timer: 60,
    interval: null,
    textToType: "",s
    charIndex: 0,
    correctChars: 0,
    totalTyped: 0,
    errorCount: 0,
    currentTheme: 'dark',
    currentUser: null,
    token: localStorage.getItem('typerush_token'),
    currentScore: null,
    scoreSaved: false,
    isTestRunning: false,
    // MonkeyType state
    keypresses: [], // Array of { timestamp, key, correct } objects
    currentInput: "",
    expectedText: ""
};

// Text database with difficulty levels
const texts = {
    easy: [
        "The quick brown fox jumps over the lazy dog.",
        "Practice makes perfect, so type every day.",
        "Typing speed is measured in words per minute.",
        "Accuracy is more important than speed.",
        "Keep your eyes on the text, not the keyboard.",
        "Learning to type faster can improve productivity.",
        "Consistency is key when improving typing skills.",
        "Focus on accuracy first, then speed will follow.",
        "A fast typist is a more efficient programmer.",
        "Good posture and hand position help typing speed."
    ],
    medium: [
        "Typing is not just about speed; accuracy is equally important. When you focus on typing each character correctly, your overall speed naturally improves. Practicing daily and maintaining good posture can help you type efficiently without straining your hands.",
        "The art of typing efficiently involves maintaining focus and rhythm. By training your fingers to remember key positions on the keyboard, you develop muscle memory that allows you to type without looking at your hands. This skill can greatly enhance productivity over time.",
        "Learning to type quickly is a combination of patience, practice, and proper technique. Beginners should prioritize accuracy over speed, gradually increasing their typing pace as they become more confident.",
        "Modern life demands proficiency in typing, whether for professional tasks or personal projects. By dedicating a few minutes each day to focused typing exercises, you can improve both your speed and accuracy."
    ],
    hard: [
        "The phenomenal quantum computer, juxtaposed with bewildering algorithmic complexity, demonstrates unprecedented computational prowess when analyzing multifaceted data structures. Sophisticated neural networks, incorporating recursive feedback mechanisms, facilitate autonomous decision-making processes that transcend conventional artificial intelligence paradigms.",
        "Metaphysical contemplations regarding existential phenomenology often intersect with epistemological inquiries about the nature of consciousness. Philosophers throughout history have grappled with ontological questions that challenge our fundamental understanding of reality and subjective experience in the cosmos.",
        "Revolutionary biotechnology advancements, particularly in CRISPR gene-editing platforms, have catalyzed paradigm shifts in therapeutic interventions. These sophisticated molecular techniques enable precise genomic modifications, potentially eradicating hereditary disorders and transforming regenerative medicine methodologies.",
        "Cryptographic algorithms, employing elliptic curve mathematics and zero-knowledge proofs, ensure robust cybersecurity frameworks in decentralized digital ecosystems. Blockchain architectures leverage consensus mechanisms that guarantee immutable transaction records while maintaining pseudonymous participant anonymity across distributed networks."
    ]
};

// Initialize the application
function init() {
    loadUserState();
    setupEventListeners();
    generateText();
    updateUI();
}

// Load user state from localStorage
function loadUserState() {
    const savedTheme = localStorage.getItem('typerush_theme');
    if (savedTheme) {
        state.currentTheme = savedTheme;
        document.body.className = savedTheme + '-theme';
        updateThemeIcon();
    }

    if (state.token) {
        const userData = localStorage.getItem('typerush_user');
        if (userData) {
            state.currentUser = JSON.parse(userData);
        }
    }
    updateAuthUI();
}

// Setup event listeners
function setupEventListeners() {
    elements.startBtn.addEventListener("click", startTest);
    elements.resetBtn.addEventListener("click", resetTest);
    elements.themeToggle.addEventListener("click", toggleTheme);
    elements.leaderboardBtn.addEventListener("click", () => window.location.href = 'leaderboard.html');
    elements.dropdownTrigger.addEventListener("click", toggleDropdown);

    // Typing input handler
    elements.typingInput.addEventListener("keydown", handleTyping);

    // Modal close handlers
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
        
        // Close dropdown when clicking outside
        if (!elements.userDropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    // Settings changes
    elements.timeSelect.addEventListener("change", resetTest);
    elements.difficultySelect.addEventListener("change", () => {
        resetTest();
        generateText();
    });

    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdown();
        }
    });
}

// Dropdown functions
function toggleDropdown() {
    if (state.currentUser) {
        elements.userDropdown.classList.toggle('active');
    } else {
        showAuthModal();
    }
}

function closeDropdown() {
    elements.userDropdown.classList.remove('active');
}

// Update UI based on state
function updateUI() {
    updateAuthUI();
}

// Theme management
function toggleTheme() {
    state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
    document.body.className = state.currentTheme + '-theme';
    localStorage.setItem('typerush_theme', state.currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = elements.themeToggle.querySelector('i');
    icon.className = state.currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// Update auth UI with dropdown functionality
function updateAuthUI() {
    if (state.currentUser) {
        // User is logged in - show username in dropdown
        elements.authText.textContent = state.currentUser.username;
        elements.dropdownTrigger.innerHTML = `
            <i class="fas fa-user"></i>
            <span>${state.currentUser.username}</span>
            <i class="fas fa-chevron-down dropdown-arrow"></i>
        `;
    } else {
        // User is logged out - show login option
        elements.authText.textContent = 'Login';
        elements.dropdownTrigger.innerHTML = `
            <i class="fas fa-user"></i>
            <span>Login</span>
            <i class="fas fa-chevron-down dropdown-arrow"></i>
        `;
    }
}

// Logout function
function logout() {
    state.token = null;
    state.currentUser = null;
    localStorage.removeItem('typerush_token');
    localStorage.removeItem('typerush_user');
    updateAuthUI();
    showMessage('Logged out successfully!', 'success');
    closeAllModals();
    closeDropdown();
    resetTest();
}

// Show temporary message
function showMessage(message, type) {
    let messageEl = document.getElementById('tempMessage');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'tempMessage';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.style.background = type === 'success' ? '#10b981' : '#ef4444';
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        if (messageEl) {
            messageEl.style.display = 'none';
        }
    }, 3000);
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

// Text generation
function generateText() {
    const difficulty = elements.difficultySelect.value;
    const availableTexts = texts[difficulty];
    state.textToType = availableTexts[Math.floor(Math.random() * availableTexts.length)];
    state.expectedText = state.textToType;
    
    elements.textContent.innerHTML = state.textToType.split("").map(
        (c, i) => `<span class="char${i===0?' current':''}">${c}</span>`
    ).join("");

    resetTestState();
    updateStats();
}

function resetTestState() {
    state.charIndex = 0;
    state.correctChars = 0;
    state.totalTyped = 0;
    state.errorCount = 0;
    state.isTestRunning = false;
    state.keypresses = [];
    state.currentInput = "";
    elements.typingInput.value = "";
    elements.progressFill.style.width = "0%";
    elements.progressText.innerText = "Ready to Start";
    
    // Reset all stats to 0 (without errors)
    elements.wpmEl.textContent = "0";
    elements.accuracyEl.textContent = "0%";
    elements.charactersEl.textContent = "0";
}

// Test control functions
function startTest() {
    if (state.isTestRunning) return;
    
    resetTest();
    generateText();

    elements.typingInput.disabled = false;
    elements.typingInput.focus();

    state.timer = parseInt(elements.timeSelect.value);
    elements.timerEl.innerText = state.timer + "s";

    clearInterval(state.interval);
    state.interval = setInterval(() => {
        state.timer--;
        elements.timerEl.innerText = state.timer + "s";
        if (state.timer <= 0) endTest();
    }, 1000);
    
    state.isTestRunning = true;
    // Reset score saved flag when starting new test
    state.scoreSaved = false;
}

function resetTest() {
    clearInterval(state.interval);
    state.timer = parseInt(elements.timeSelect.value);
    elements.timerEl.innerText = state.timer + "s";

    elements.typingInput.value = "";
    elements.typingInput.disabled = true;

    resetTestState();
    updateStats();
    
    elements.textContent.innerHTML = "";
    closeModal('resultsModal');
    
    // Reset score saved flag
    state.scoreSaved = false;
}

function endTest() {
    clearInterval(state.interval);
    elements.typingInput.disabled = true;
    state.isTestRunning = false;

    const stats = calculateFinalStats();

    // Update result display
    resultElements.finalWPM.textContent = stats.wpm;
    resultElements.finalAccuracy.textContent = stats.accuracy + '%';
    resultElements.finalCharacters.textContent = stats.correctChars;
    resultElements.finalErrors.textContent = stats.errors;
    resultElements.finalDifficulty.textContent = elements.difficultySelect.value.charAt(0).toUpperCase() + elements.difficultySelect.value.slice(1);
    resultElements.finalTime.textContent = elements.timeSelect.value + 's';

    // Save current score for potential saving
    state.currentScore = {
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        characters: stats.correctChars,
        difficulty: elements.difficultySelect.value,
        timeSetting: parseInt(elements.timeSelect.value)
    };

    // Reset score saved flag for this new test
    state.scoreSaved = false;

    showModal('resultsModal');
}

// MonkeyType typing handler
function handleTyping(e) {
    if (!state.isTestRunning) return;
    
    const timestamp = Date.now();
    const chars = document.querySelectorAll(".char");
    
    if (e.key === "Backspace") {
        // Record backspace as a keypress
        state.keypresses.push({
            timestamp,
            key: "Backspace",
            correct: null
        });
        
        // Remove last character from current input
        state.currentInput = state.currentInput.slice(0, -1);
        
        // Update visual feedback
        if (state.charIndex > 0) {
            chars[state.charIndex].classList.remove("current");
            state.charIndex--;
            chars[state.charIndex].classList.add("current");
            
            // Remove incorrect class when backing up
            if (chars[state.charIndex].classList.contains("incorrect")) {
                chars[state.charIndex].classList.remove("incorrect");
                state.errorCount = Math.max(0, state.errorCount - 1);
            }
            
            state.totalTyped--;
        }
        
    } else if (e.key.length === 1) {
        // Record regular keypress
        const expectedChar = state.expectedText[state.currentInput.length];
        const isCorrect = e.key === expectedChar;
        
        state.keypresses.push({
            timestamp,
            key: e.key,
            correct: isCorrect
        });
        
        state.currentInput += e.key;
        state.totalTyped++;
        
        // Update visual feedback and counters
        if (isCorrect) {
            state.correctChars++;
        } else {
            chars[state.charIndex].classList.add("incorrect");
            state.errorCount++;
        }
        
        chars[state.charIndex].classList.remove("current");
        state.charIndex++;
        
        if (state.charIndex < chars.length) {
            chars[state.charIndex].classList.add("current");
        }
    }
    
    updateStats();
    
    if (state.charIndex >= chars.length) endTest();
    
    // REMOVED: e.preventDefault(); - This allows characters to show in input field
}

// MonkeyType accuracy calculation for real-time stats
function calculateRealTimeAccuracy() {
    if (state.currentInput.length === 0) return 0;
    
    let correctChars = 0;
    const currentInput = state.currentInput;
    const expectedText = state.expectedText;
    
    for (let i = 0; i < Math.min(currentInput.length, expectedText.length); i++) {
        if (currentInput[i] === expectedText[i]) {
            correctChars++;
        }
    }
    
    // If user typed more characters than expected, don't count extras
    const totalPossibleCorrect = Math.min(currentInput.length, expectedText.length);
    
    return totalPossibleCorrect > 0 ? Math.round((correctChars / expectedText.length) * 100) : 0;
}

// MonkeyType final stats calculation - ONLY at end of test
function calculateFinalStats() {
    // Reconstruct what user actually submitted
    const finalText = state.currentInput;
    const expectedText = state.expectedText;
    
    // Calculate correct characters by comparing final texts
    let correctChars = 0;
    let errors = 0;
    
    for (let i = 0; i < Math.min(finalText.length, expectedText.length); i++) {
        if (finalText[i] === expectedText[i]) {
            correctChars++;
        } else {
            errors++;
        }
    }
    
    // If user typed more characters than expected, count extras as errors
    if (finalText.length > expectedText.length) {
        errors += finalText.length - expectedText.length;
    }
    
    // If user typed less characters than expected, count missing as errors  
    if (finalText.length < expectedText.length) {
        errors += expectedText.length - finalText.length;
    }
    
    const accuracy = Math.round((correctChars / expectedText.length) * 100);
    const wpm = calculateWPM(state.keypresses);
    
    return { wpm, accuracy, correctChars, errors };
}

// Calculate WPM based on keypresses
function calculateWPM(keypresses) {
    if (keypresses.length === 0) return 0;
    
    // Filter out backspaces and get only character keypresses
    const charKeypresses = keypresses.filter(kp => kp.key !== "Backspace" && kp.correct !== null);
    
    if (charKeypresses.length === 0) return 0;
    
    // Calculate time taken in minutes
    const startTime = keypresses[0].timestamp;
    const endTime = keypresses[keypresses.length - 1].timestamp;
    const timeInMinutes = (endTime - startTime) / 60000;
    
    if (timeInMinutes === 0) return 0;
    
    // Calculate WPM: (correct characters / 5) / time in minutes
    const correctChars = charKeypresses.filter(kp => kp.correct === true).length;
    const words = correctChars / 5;
    const wpm = Math.round(words / timeInMinutes);
    
    return wpm;
}

// Update statistics display - REAL TIME stats during test
function updateStats() {
    // Calculate real-time stats during the test
    const elapsed = parseInt(elements.timeSelect.value) - state.timer;
    const words = state.correctChars / 5;
    const wpm = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;
    
    // Use MonkeyType accuracy calculation for real-time
    const accuracy = calculateRealTimeAccuracy();

    elements.wpmEl.textContent = wpm;
    elements.accuracyEl.textContent = accuracy + '%';
    elements.charactersEl.textContent = state.correctChars;
    // Errors removed from real-time stats - now only in results modal

    const progress = (state.currentInput.length / state.textToType.length * 100);
    elements.progressFill.style.width = progress + "%";
    elements.progressText.innerText = `${state.currentInput.length}/${state.textToType.length} characters (${Math.round(progress)}%)`;
}

// Save score function - PREVENTS MULTIPLE SAVES
async function saveScore() {
    if (!state.currentUser) {
        showAuthMessage('Please login to save your score', 'error');
        showModal('authModal');
        return;
    }

    // Prevent multiple saves for the same test
    if (state.scoreSaved) {
        showAuthMessage('Score already saved for this test!', 'error');
        return;
    }

    // Disable the save button to prevent multiple clicks
    const saveBtn = document.getElementById('saveScoreBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify(state.currentScore)
        });

        if (response.ok) {
            state.scoreSaved = true; // Mark as saved
            showAuthMessage('Score saved successfully!', 'success');
            
            // Update button to show it's saved
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Score Saved';
            saveBtn.style.background = '#10b981';
            
            setTimeout(() => {
                closeModal('resultsModal');
                // Reset button after modal closes
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                    saveBtn.disabled = false;
                    saveBtn.style.background = '';
                }, 500);
            }, 1500);
        } else {
            showAuthMessage('Failed to save score', 'error');
            // Re-enable button on error
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    } catch (error) {
        showAuthMessage('Network error. Please check backend connection.', 'error');
        // Re-enable button on error
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Modal functions
function showModal(modalId) {
    modals[modalId.replace('Modal', '')].classList.add('show');
    closeDropdown();
}

function closeModal(modalId) {
    modals[modalId.replace('Modal', '')].classList.remove('show');
}

function showAuthModal() {
    showModal('authModal');
}

function showProfile() {
    if (state.currentUser) {
        loadUserProfile();
        showModal('profileModal');
        closeDropdown();
    } else {
        showAuthModal();
    }
}

// Auth tab switching
function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('authModalTitle').textContent = tab === 'login' ? 'Login to TypeRush' : 'Create Account';
}

// Authentication functions
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('authMessage');

    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            state.token = data.token;
            state.currentUser = data.user;
            localStorage.setItem('typerush_token', data.token);
            localStorage.setItem('typerush_user', JSON.stringify(data.user));
            showAuthMessage('Login successful!', 'success');
            updateAuthUI();
            setTimeout(() => closeModal('authModal'), 1500);
        } else {
            showAuthMessage(data.error, 'error');
        }
    } catch (error) {
        showAuthMessage('Network error. Please check if backend is running.', 'error');
    }
}

async function register() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const messageEl = document.getElementById('authMessage');

    if (!username || !email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            state.token = data.token;
            state.currentUser = data.user;
            localStorage.setItem('typerush_token', data.token);
            localStorage.setItem('typerush_user', JSON.stringify(data.user));
            showAuthMessage('Account created successfully!', 'success');
            updateAuthUI();
            setTimeout(() => closeModal('authModal'), 1500);
        } else {
            showAuthMessage(data.error, 'error');
        }
    } catch (error) {
        showAuthMessage('Network error. Please check if backend is running.', 'error');
    }
}

function showAuthMessage(message, type) {
    const messageEl = document.getElementById('authMessage');
    messageEl.textContent = message;
    messageEl.className = `auth-message ${type}`;
}

// Load user profile
async function loadUserProfile() {
    if (!state.currentUser) return;

    try {
        const [statsRes, scoresRes] = await Promise.all([
            fetch(`${API_BASE}/my-stats`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            }),
            fetch(`${API_BASE}/my-scores`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            })
        ]);

        if (statsRes.ok && scoresRes.ok) {
            const statsData = await statsRes.json();
            const scoresData = await scoresRes.json();

            displayProfile(statsData.stats, scoresData.scores);
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        showAuthMessage('Failed to load statistics', 'error');
    }
}

function displayProfile(stats, scores) {
    document.getElementById('profileTests').textContent = stats.tests_taken || 0;
    document.getElementById('profileBestWPM').textContent = stats.best_wpm || 0;
    document.getElementById('profileAvgWPM').textContent = Math.round(stats.avg_wpm) || 0;

    const scoresList = document.getElementById('recentScoresList');
    if (scores && scores.length > 0) {
        scoresList.innerHTML = scores.map(score => `
            <div class="score-item">
                <div class="score-wpm">${score.wpm} WPM</div>
                <div class="score-details">
                    ${score.accuracy}% • ${score.characters} chars • ${score.difficulty}
                </div>
            </div>
        `).join('');
    } else {
        scoresList.innerHTML = '<p>No scores yet. Complete a typing test to see your statistics!</p>';
    }

    document.getElementById('profileContent').style.display = 'block';
    document.getElementById('profileLoginPrompt').style.display = 'none';
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Global functions for HTML onclick handlers
window.closeResults = () => closeModal('resultsModal');
window.saveScore = saveScore;
window.switchAuthTab = switchAuthTab;
window.login = login;
window.register = register;
window.closeModal = closeModal;
window.showAuthModal = showAuthModal;
window.showProfile = showProfile;
window.logout = logout;
window.toggleDropdown = toggleDropdown;