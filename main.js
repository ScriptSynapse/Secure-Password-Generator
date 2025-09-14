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

        if (entropy < 40) return { label: "Baby Password 🍼", percentage: 20, class: "weak" };
        if (entropy < 60) return { label: "Needs Training 🏋️", percentage: 40, class: "weak" };
        if (entropy < 80) return { label: "Getting Stronger ⚡", percentage: 60, class: "medium" };
        if (entropy < 100) return { label: "Iron Wall 🛡️", percentage: 80, class: "strong" };
        return { label: "Hacker-Resistant 🔥", percentage: 100, class: "strong" };
    }

    function updateStrengthMeter() {
        const strength = calculateStrength();
        strengthText.textContent = strength.label;
        strengthText.className = `strength-value ${strength.class}`;
        strengthFill.style.width = `${strength.percentage}%`;

        if (strength.class === 'weak') {
            strengthFill.style.backgroundColor = 'var(--danger)';
        } else if (strength.class === 'medium') {
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
