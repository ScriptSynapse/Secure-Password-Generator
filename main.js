document.addEventListener('DOMContentLoaded', function() {
    const lengthSlider = document.getElementById('length');
    const lengthInput = document.getElementById('length-input');
    const lengthValue = document.getElementById('length-value');
    const uppercaseToggle = document.getElementById('uppercase');
    const lowercaseToggle = document.getElementById('lowercase');
    const numbersToggle = document.getElementById('numbers');
    const symbolsToggle = document.getElementById('symbols');
    const passwordOutput = document.getElementById('password');
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const toast = document.getElementById('toast');
    const strengthText = document.getElementById('strength-text');
    const strengthFill = document.getElementById('strength-fill');

    const charset = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    lengthSlider.addEventListener('input', function() {
        const value = lengthSlider.value;
        lengthValue.textContent = value;
        lengthInput.value = value;
        updateStrengthMeter();
    });

    lengthInput.addEventListener('input', function() {
        let value = parseInt(lengthInput.value);
        if (value < 4) value = 4;
        if (value > 64) value = 64;
        lengthSlider.value = value;
        lengthValue.textContent = value;
        lengthInput.value = value;
        updateStrengthMeter();
    });

    uppercaseToggle.addEventListener('change', updateStrengthMeter);
    lowercaseToggle.addEventListener('change', updateStrengthMeter);
    numbersToggle.addEventListener('change', updateStrengthMeter);
    symbolsToggle.addEventListener('change', updateStrengthMeter);

    function generatePassword() {
        const length = parseInt(lengthSlider.value);
        let chars = '';
        if (uppercaseToggle.checked) chars += charset.uppercase;
        if (lowercaseToggle.checked) chars += charset.lowercase;
        if (numbersToggle.checked) chars += charset.numbers;
        if (symbolsToggle.checked) chars += charset.symbols;

        if (chars === '') {
            lowercaseToggle.checked = true;
            chars = charset.lowercase;
        }

        let password = '';
        const array = new Uint32Array(length);
        window.crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            password += chars.charAt(array[i] % chars.length);
        }
        return password;
    }

    function calculateStrength() {
        const length = parseInt(lengthSlider.value);
        let complexity = 0;
        if (uppercaseToggle.checked) complexity += 26;
        if (lowercaseToggle.checked) complexity += 26;
        if (numbersToggle.checked) complexity += 10;
        if (symbolsToggle.checked) complexity += 32;

        const entropy = Math.log2(complexity) * length;
        if (entropy < 40) return { strength: 'weak', percentage: 33 };
        if (entropy < 80) return { strength: 'medium', percentage: 66 };
        return { strength: 'strong', percentage: 100 };
    }

    function updateStrengthMeter() {
        const strength = calculateStrength();
        strengthText.textContent = `Strength: ${strength.strength.charAt(0).toUpperCase() + strength.strength.slice(1)}`;
        strengthText.classList.remove('weak', 'medium', 'strong');
        strengthText.classList.add(strength.strength);
        strengthFill.style.width = `${strength.percentage}%`;

        if (strength.strength === 'weak') {
            strengthFill.style.backgroundColor = 'var(--danger)';
        } else if (strength.strength === 'medium') {
            strengthFill.style.backgroundColor = 'var(--warning)';
        } else {
            strengthFill.style.backgroundColor = 'var(--success)';
        }
    }

    generateBtn.addEventListener('click', function() {
        const password = generatePassword();
        passwordOutput.value = password;
        updateStrengthMeter();
        passwordOutput.classList.add('highlight');
        setTimeout(() => passwordOutput.classList.remove('highlight'), 300);
    });

    copyBtn.addEventListener('click', function() {
        if (!passwordOutput.value) return;
        navigator.clipboard.writeText(passwordOutput.value).then(function() {
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        });
    });

    generateBtn.click();
});

// ===== Password Manager =====
const saveForm = document.getElementById('save-form');
const siteInput = document.getElementById('site');
const usernameInput = document.getElementById('username');
const savedPasswordInput = document.getElementById('saved-password');
const passwordList = document.getElementById('password-list');

function loadPasswords() {
    passwordList.innerHTML = '';
    const passwords = JSON.parse(localStorage.getItem('passwords')) || [];
    passwords.forEach((entry, index) => {
        const item = document.createElement('div');
        item.classList.add('password-item');
        item.innerHTML = `
                <div>
                    <strong>${entry.site}</strong> (${entry.username})  
                    <span class="hidden-password">********</span>
                </div>
                <div class="actions">
                    <button class="btn btn-secondary btn-sm show-btn">Show</button>
                    <button class="btn btn-danger btn-sm delete-btn">Delete</button>
                </div>
            `;

        // Show/hide password
        item.querySelector('.show-btn').addEventListener('click', () => {
            const passField = item.querySelector('.hidden-password');
            if (passField.textContent === '********') {
                passField.textContent = entry.password;
            } else {
                passField.textContent = '********';
            }
        });

        // Delete password
        item.querySelector('.delete-btn').addEventListener('click', () => {
            passwords.splice(index, 1);
            localStorage.setItem('passwords', JSON.stringify(passwords));
            loadPasswords();
        });

        passwordList.appendChild(item);
    });
}

saveForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const site = siteInput.value.trim();
    const username = usernameInput.value.trim();
    const password = savedPasswordInput.value.trim();

    if (site && username && password) {
        const passwords = JSON.parse(localStorage.getItem('passwords')) || [];
        passwords.push({ site, username, password });
        localStorage.setItem('passwords', JSON.stringify(passwords));
        saveForm.reset();
        loadPasswords();
    }
});

loadPasswords();
