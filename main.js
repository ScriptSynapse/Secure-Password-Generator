// VaultX Password Manager - Main Application

// ---------------------------------------------------------------------------
// Crypto helpers: derive an AES-256-GCM key from the master password with
// PBKDF2, then use it to encrypt/decrypt the vault. The derived key is kept
// only in memory for the life of the tab; nothing that could reconstruct it
// (the raw key or the plaintext password) is ever written to storage.
// ---------------------------------------------------------------------------
const CryptoUtil = {
    randomBytes(length) {
        return crypto.getRandomValues(new Uint8Array(length));
    },

    bufToB64(buf) {
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
    },

    b64ToBuf(b64) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    },

    async deriveKey(password, saltBytes, iterations) {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    async encrypt(key, dataObj) {
        const iv = this.randomBytes(12);
        const plaintext = new TextEncoder().encode(JSON.stringify(dataObj));
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
        return { iv: this.bufToB64(iv), data: this.bufToB64(ciphertext) };
    },

    async decrypt(key, ivB64, dataB64) {
        const iv = this.b64ToBuf(ivB64);
        const ciphertext = this.b64ToBuf(dataB64);
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        return JSON.parse(new TextDecoder().decode(plaintext));
    }
};

class VaultXApp {
    constructor() {
        this.currentEntries = [];
        this.editingIndex = -1;
        this.inactivityTimer = null;
        this.vaultKey = null; // in-memory only, never persisted
        this.elements = {};

        this.init();
    }

    init() {
        this.cacheElements();
        this.setupAuthEventListeners();
        this.updateStrengthMeter();
        setTimeout(() => this.elements.masterInput?.focus(), 100);
    }

    setupAuthEventListeners() {
        this.elements.unlockBtn?.addEventListener('click', () => this.handleUnlock());
        this.elements.setMasterBtn?.addEventListener('click', () => this.handleSetMaster());
        this.elements.masterInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUnlock();
        });
        this.setupPasswordToggle(this.elements.masterInput, this.elements.toggleMasterVisibility);
    }

    cacheElements() {
        this.elements = {
            lockScreen: document.getElementById('lock-screen'),
            mainContainer: document.getElementById('main-container'),
            masterInput: document.getElementById('master-input'),
            toggleMasterVisibility: document.getElementById('toggle-master-visibility'),
            unlockBtn: document.getElementById('unlock-btn'),
            setMasterBtn: document.getElementById('set-master-btn'),
            errorMsg: document.getElementById('error-msg'),
            logoutBtn: document.getElementById('logout-btn'),

            lengthSlider: document.getElementById('length-slider'),
            lengthInput: document.getElementById('length-input'),
            lengthValue: document.getElementById('length-value'),
            uppercase: document.getElementById('uppercase'),
            lowercase: document.getElementById('lowercase'),
            numbers: document.getElementById('numbers'),
            symbols: document.getElementById('symbols'),

            passwordOutput: document.getElementById('password-output'),
            generateBtn: document.getElementById('generate-btn'),
            copyBtn: document.getElementById('copy-btn'),
            strengthText: document.getElementById('strength-text'),
            strengthFill: document.getElementById('strength-fill'),

            siteInput: document.getElementById('site-input'),
            usernameInput: document.getElementById('username-input'),
            passwordInput: document.getElementById('password-input'),
            togglePasswordVisibility: document.getElementById('toggle-password-visibility'),
            notesInput: document.getElementById('notes-input'),
            useGeneratedBtn: document.getElementById('use-generated-btn'),
            saveEntryBtn: document.getElementById('save-entry-btn'),
            clearFormBtn: document.getElementById('clear-form-btn'),

            searchInput: document.getElementById('search-input'),
            vaultList: document.getElementById('vault-list'),
            clearVaultBtn: document.getElementById('clear-vault-btn'),

            exportBtn: document.getElementById('export-btn'),
            exportDropdown: document.getElementById('export-dropdown'),
            exportJsonBtn: document.getElementById('export-json-btn'),
            exportExcelBtn: document.getElementById('export-excel-btn'),
            exportCsvBtn: document.getElementById('export-csv-btn'),
            importBtn: document.getElementById('import-btn'),
            importFile: document.getElementById('import-file'),
            changeMasterBtn: document.getElementById('change-master-btn'),

            toast: document.getElementById('toast'),
            toastText: document.getElementById('toast-text')
        };
    }

    setupEventListeners() {
        this.elements.logoutBtn?.addEventListener('click', () => this.logout());

        this.elements.lengthSlider?.addEventListener('input', () => this.handleLengthChange());
        this.elements.lengthInput?.addEventListener('input', () => this.handleLengthInputChange());

        [this.elements.uppercase, this.elements.lowercase, this.elements.numbers, this.elements.symbols]
            .forEach(checkbox => checkbox?.addEventListener('change', () => this.updateStrengthMeter()));

        this.elements.generateBtn?.addEventListener('click', () => this.handleGenerate());
        this.elements.copyBtn?.addEventListener('click', () => this.handleCopyPassword());

        this.elements.useGeneratedBtn?.addEventListener('click', () => this.handleUseGenerated());
        this.elements.saveEntryBtn?.addEventListener('click', () => this.addOrUpdateEntry());
        this.elements.clearFormBtn?.addEventListener('click', () => this.clearForm());
        this.elements.searchInput?.addEventListener('input', () => this.renderVault());
        this.elements.clearVaultBtn?.addEventListener('click', () => this.handleClearVault());
        this.setupPasswordToggle(this.elements.passwordInput, this.elements.togglePasswordVisibility);

        [this.elements.siteInput, this.elements.usernameInput, this.elements.passwordInput]
            .forEach(input => input?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addOrUpdateEntry();
            }));

        // Event delegation for vault item actions (copy/edit/delete). Using
        // data-index instead of building onclick="...(${value})" strings
        // avoids ever injecting entry data into inline JS/HTML attributes.
        this.elements.vaultList?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const index = parseInt(btn.dataset.index, 10);
            const entry = this.currentEntries[index];
            if (!entry) return;

            switch (btn.dataset.action) {
                case 'copy-user': this.copyToClipboard(entry.username, 'Username copied'); break;
                case 'copy-pass': this.copyToClipboard(entry.password, 'Password copied'); break;
                case 'edit': this.editEntry(index); break;
                case 'delete': this.deleteEntry(index); break;
            }
        });

        ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
            document.addEventListener(event, () => this.resetInactivityTimer());
        });
    }

    setupPasswordToggle(inputEl, btnEl) {
        if (!inputEl || !btnEl) return;
        btnEl.addEventListener('click', () => {
            const showing = inputEl.type === 'text';
            inputEl.type = showing ? 'password' : 'text';
            btnEl.innerHTML = showing ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            btnEl.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
        });
    }

    setupImportExport() {
        this.elements.exportBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.exportDropdown?.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (this.elements.exportBtn && this.elements.exportDropdown &&
                !this.elements.exportBtn.contains(e.target) &&
                !this.elements.exportDropdown.contains(e.target)) {
                this.elements.exportDropdown.classList.add('hidden');
            }
        });

        this.elements.exportJsonBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.elements.exportDropdown?.classList.add('hidden');
            this.handleExport('json');
        });
        this.elements.exportExcelBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.elements.exportDropdown?.classList.add('hidden');
            this.handleExport('excel');
        });
        this.elements.exportCsvBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.elements.exportDropdown?.classList.add('hidden');
            this.handleExport('csv');
        });

        this.elements.importBtn?.addEventListener('click', () => this.elements.importFile?.click());
        this.elements.importFile?.addEventListener('change', (e) => this.handleImport(e));
        this.elements.changeMasterBtn?.addEventListener('click', () => this.handleChangeMaster());
    }

    // -------------------------------------------------------------------
    // Authentication / encryption
    // -------------------------------------------------------------------
    async handleUnlock() {
        const password = this.elements.masterInput?.value || '';
        const authRaw = sessionStorage.getItem(CONFIG.AUTH_KEY);
        const vaultRaw = sessionStorage.getItem(CONFIG.STORAGE_KEY);

        if (!authRaw || !vaultRaw) {
            this.elements.errorMsg.textContent = 'No master password has been set yet. Click "Set Master" to create one.';
            return;
        }
        if (!password) {
            this.elements.errorMsg.textContent = 'Please enter your master password.';
            return;
        }

        try {
            const auth = JSON.parse(authRaw);
            const vaultBlob = JSON.parse(vaultRaw);
            const salt = CryptoUtil.b64ToBuf(auth.salt);
            const key = await CryptoUtil.deriveKey(password, salt, auth.iterations);
            const entries = await CryptoUtil.decrypt(key, vaultBlob.iv, vaultBlob.data);

            this.vaultKey = key;
            this.currentEntries = Array.isArray(entries) ? entries : [];
            this.elements.errorMsg.textContent = '';
            this.elements.masterInput.value = '';

            this.showMainApp();
            this.renderVault();
            this.resetInactivityTimer();
            this.setupEventListeners();
            this.setupImportExport();
            this.handleGenerate();
        } catch (err) {
            // AES-GCM authentication fails if the wrong key was derived,
            // i.e. the wrong password was entered.
            this.elements.errorMsg.textContent = 'Incorrect master password!';
            this.elements.masterInput.value = '';
            this.elements.masterInput?.focus();
        }
    }

    async handleSetMaster() {
        const alreadySetUp = !!sessionStorage.getItem(CONFIG.AUTH_KEY);
        if (alreadySetUp) {
            const proceed = confirm(
                'A vault already exists for this session. Creating a new master password ' +
                'will permanently erase it, since it cannot be re-encrypted without the old ' +
                'password. If you just want to change your password, unlock first and use ' +
                '"Change Master" instead.\n\nErase and start a new vault?'
            );
            if (!proceed) return;
        }

        const newPassword = prompt('Create a master password (minimum 8 characters):');
        if (newPassword === null) return;
        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters long.');
            return;
        }

        const salt = CryptoUtil.randomBytes(16);
        const key = await CryptoUtil.deriveKey(newPassword, salt, CONFIG.PBKDF2_ITERATIONS);
        const encryptedEmpty = await CryptoUtil.encrypt(key, []);

        sessionStorage.setItem(CONFIG.AUTH_KEY, JSON.stringify({
            salt: CryptoUtil.bufToB64(salt),
            iterations: CONFIG.PBKDF2_ITERATIONS
        }));
        sessionStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(encryptedEmpty));

        this.vaultKey = key;
        this.currentEntries = [];
        this.elements.errorMsg.textContent = '';
        this.elements.masterInput.value = '';

        this.showMainApp();
        this.renderVault();
        this.resetInactivityTimer();
        this.setupEventListeners();
        this.setupImportExport();
        this.handleGenerate();
        this.showToast('Master password created — vault unlocked');
    }

    async handleChangeMaster() {
        const currentPassword = prompt('Enter your current master password:');
        if (currentPassword === null) return;

        try {
            const auth = JSON.parse(sessionStorage.getItem(CONFIG.AUTH_KEY));
            const vaultBlob = JSON.parse(sessionStorage.getItem(CONFIG.STORAGE_KEY));
            const salt = CryptoUtil.b64ToBuf(auth.salt);
            const verifyKey = await CryptoUtil.deriveKey(currentPassword, salt, auth.iterations);
            await CryptoUtil.decrypt(verifyKey, vaultBlob.iv, vaultBlob.data); // throws if wrong password
        } catch (err) {
            this.showToast('Incorrect current password', 'error');
            return;
        }

        const newPassword = prompt('Enter new master password (minimum 8 characters):');
        if (newPassword === null) return;
        if (newPassword.length < 8) {
            this.showToast('Password must be at least 8 characters long', 'error');
            return;
        }

        const newSalt = CryptoUtil.randomBytes(16);
        const newKey = await CryptoUtil.deriveKey(newPassword, newSalt, CONFIG.PBKDF2_ITERATIONS);
        const encrypted = await CryptoUtil.encrypt(newKey, this.currentEntries);

        sessionStorage.setItem(CONFIG.AUTH_KEY, JSON.stringify({
            salt: CryptoUtil.bufToB64(newSalt),
            iterations: CONFIG.PBKDF2_ITERATIONS
        }));
        sessionStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(encrypted));

        this.vaultKey = newKey;
        this.showToast('Master password changed successfully');
    }

    showMainApp() {
        this.elements.lockScreen?.classList.add('hidden');
        this.elements.mainContainer?.classList.remove('hidden');
    }

    logout() {
        // Locks the screen and drops the in-memory key. The encrypted vault
        // stays in sessionStorage so the same master password unlocks it
        // again later in this tab — only the browser session boundary
        // (tab/browser close) wipes the data itself.
        this.vaultKey = null;
        this.currentEntries = [];
        this.elements.lockScreen?.classList.remove('hidden');
        this.elements.mainContainer?.classList.add('hidden');
        this.elements.masterInput.value = '';
        this.elements.errorMsg.textContent = '';
        clearTimeout(this.inactivityTimer);
    }

    resetInactivityTimer() {
        if (!this.vaultKey) return;
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(() => {
            this.logout();
            this.showToast('Session locked due to inactivity', 'warning');
        }, CONFIG.AUTO_LOGOUT_TIME);
    }

    // -------------------------------------------------------------------
    // Password generation
    // -------------------------------------------------------------------
    handleLengthChange() {
        const value = this.elements.lengthSlider?.value;
        this.elements.lengthValue.textContent = value;
        this.elements.lengthInput.value = value;
        this.updateStrengthMeter();
    }

    handleLengthInputChange() {
        let value = parseInt(this.elements.lengthInput?.value) || 4;
        value = Math.max(4, Math.min(64, value));
        this.elements.lengthSlider.value = value;
        this.elements.lengthValue.textContent = value;
        this.elements.lengthInput.value = value;
        this.updateStrengthMeter();
    }

    handleGenerate() {
        const password = this.generatePassword();
        this.elements.passwordOutput.value = password;
        this.updateStrengthMeter();
        this.elements.passwordOutput?.classList.add('highlight');
        setTimeout(() => this.elements.passwordOutput?.classList.remove('highlight'), 500);
    }

    handleCopyPassword() {
        if (this.elements.passwordOutput?.value) {
            this.copyToClipboard(this.elements.passwordOutput.value, 'Password copied');
        }
    }

    generatePassword() {
        const length = parseInt(this.elements.lengthSlider?.value || 16);
        let chars = '';

        if (this.elements.uppercase?.checked) chars += CHARSETS.uppercase;
        if (this.elements.lowercase?.checked) chars += CHARSETS.lowercase;
        if (this.elements.numbers?.checked) chars += CHARSETS.numbers;
        if (this.elements.symbols?.checked) chars += CHARSETS.symbols;

        if (!chars) {
            this.elements.lowercase.checked = true;
            chars = CHARSETS.lowercase;
        }

        // Rejection sampling avoids modulo bias from crypto.getRandomValues.
        const maxValid = Math.floor(256 / chars.length) * chars.length;
        const bytes = new Uint8Array(1);
        let password = '';
        while (password.length < length) {
            crypto.getRandomValues(bytes);
            if (bytes[0] < maxValid) {
                password += chars.charAt(bytes[0] % chars.length);
            }
        }

        return password;
    }

    calculateStrength() {
        const length = parseInt(this.elements.lengthSlider?.value || 16);
        let complexity = 0;

        if (this.elements.uppercase?.checked) complexity += 26;
        if (this.elements.lowercase?.checked) complexity += 26;
        if (this.elements.numbers?.checked) complexity += 10;
        if (this.elements.symbols?.checked) complexity += 32;

        const entropy = complexity > 0 ? Math.log2(complexity) * length : 0;

        if (entropy < 28) return { label: 'Very Weak', percentage: 15, class: 'strength-baby' };
        if (entropy < 40) return { label: 'Weak', percentage: 30, class: 'strength-weak' };
        if (entropy < 60) return { label: 'Fair', percentage: 50, class: 'strength-medium' };
        if (entropy < 80) return { label: 'Strong', percentage: 70, class: 'strength-strong' };
        if (entropy < 100) return { label: 'Very Strong', percentage: 85, class: 'strength-fortress' };
        return { label: 'Excellent', percentage: 100, class: 'strength-elite' };
    }

    updateStrengthMeter() {
        const strength = this.calculateStrength();
        const colors = {
            'strength-baby': '#ef4444',
            'strength-weak': '#f97316',
            'strength-medium': '#eab308',
            'strength-strong': '#22c55e',
            'strength-fortress': '#10b981',
            'strength-elite': '#06b6d4'
        };

        this.elements.strengthText.textContent = strength.label;
        this.elements.strengthText.className = `strength-value ${strength.class}`;
        this.elements.strengthFill.style.width = `${strength.percentage}%`;
        this.elements.strengthFill.style.backgroundColor = colors[strength.class];
    }

    // -------------------------------------------------------------------
    // Vault management
    // -------------------------------------------------------------------
    handleUseGenerated() {
        if (this.elements.passwordOutput?.value) {
            this.elements.passwordInput.value = this.elements.passwordOutput.value;
            this.showToast('Generated password filled');
        } else {
            this.showToast('Generate a password first', 'warning');
        }
    }

    async addOrUpdateEntry() {
        const site = this.elements.siteInput?.value.trim();
        const username = this.elements.usernameInput?.value.trim();
        const password = this.elements.passwordInput?.value.trim();
        const notes = this.elements.notesInput?.value.trim();

        if (!site || !username || !password) {
            this.showToast('Please fill in site, username, and password', 'error');
            return;
        }

        const entry = {
            id: this.editingIndex >= 0 ? this.currentEntries[this.editingIndex].id : Date.now(),
            site,
            username,
            password,
            notes,
            createdAt: this.editingIndex >= 0 ? this.currentEntries[this.editingIndex].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.editingIndex >= 0) {
            this.currentEntries[this.editingIndex] = entry;
            this.editingIndex = -1;
            this.elements.saveEntryBtn.innerHTML = '<i class="fas fa-save"></i> Save Entry';
            this.showToast('Entry updated successfully');
        } else {
            this.currentEntries.unshift(entry);
            this.showToast('Entry added successfully');
        }

        await this.saveToStorage();
        this.renderVault();
        this.clearForm();
    }

    editEntry(index) {
        const entry = this.currentEntries[index];
        this.elements.siteInput.value = entry.site;
        this.elements.usernameInput.value = entry.username;
        this.elements.passwordInput.value = entry.password;
        this.elements.notesInput.value = entry.notes || '';

        this.editingIndex = index;
        this.elements.saveEntryBtn.innerHTML = '<i class="fas fa-save"></i> Update Entry';

        this.elements.siteInput?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.elements.siteInput?.focus();
    }

    async deleteEntry(index) {
        if (confirm('Are you sure you want to delete this entry?')) {
            this.currentEntries.splice(index, 1);
            await this.saveToStorage();
            this.renderVault();
            this.showToast('Entry deleted');
        }
    }

    async handleClearVault() {
        if (this.currentEntries.length > 0 &&
            confirm('Are you sure you want to clear all vault entries? This cannot be undone.')) {
            this.currentEntries = [];
            await this.saveToStorage();
            this.renderVault();
            this.showToast('Vault cleared');
        }
    }

    clearForm() {
        this.elements.siteInput.value = '';
        this.elements.usernameInput.value = '';
        this.elements.passwordInput.value = '';
        this.elements.notesInput.value = '';
        this.editingIndex = -1;
        this.elements.saveEntryBtn.innerHTML = '<i class="fas fa-save"></i> Save Entry';
    }

    // -------------------------------------------------------------------
    // Storage (AES-256-GCM encrypted at rest, session-scoped)
    // -------------------------------------------------------------------
    async saveToStorage() {
        if (!this.vaultKey) return;
        try {
            const encrypted = await CryptoUtil.encrypt(this.vaultKey, this.currentEntries);
            sessionStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(encrypted));
        } catch (error) {
            this.showToast('Failed to save vault data', 'error');
        }
    }

    // -------------------------------------------------------------------
    // Vault rendering
    // -------------------------------------------------------------------
    renderVault() {
        const searchTerm = this.elements.searchInput?.value.toLowerCase() || '';
        const filteredEntries = this.currentEntries.filter(entry =>
            entry.site.toLowerCase().includes(searchTerm) ||
            entry.username.toLowerCase().includes(searchTerm)
        );

        if (filteredEntries.length === 0) {
            this.elements.vaultList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; color: var(--text-secondary);"></i>
                    <p>${searchTerm ? 'No matching entries found' : 'Your vault is empty'}</p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">
                        ${searchTerm ? 'Try a different search term' : 'Add your first password entry above'}
                    </p>
                </div>
            `;
            return;
        }

        // Entry values are only ever placed as escaped text content or as
        // numeric data-index attributes — never interpolated into inline
        // JS handlers — so a site/username/note containing quotes or angle
        // brackets can't break out of the markup.
        this.elements.vaultList.innerHTML = filteredEntries.map((entry) => {
            const originalIndex = this.currentEntries.indexOf(entry);
            return `
                <div class="vault-item">
                    <div class="vault-site">${this.escapeHtml(entry.site)}</div>
                    <div class="vault-username">${this.escapeHtml(entry.username)}</div>
                    ${entry.notes ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">${this.escapeHtml(entry.notes)}</div>` : ''}
                    <div class="vault-actions">
                        <button class="btn btn-secondary btn-small" data-action="copy-user" data-index="${originalIndex}">
                            <i class="fas fa-user"></i> Copy User
                        </button>
                        <button class="btn btn-secondary btn-small" data-action="copy-pass" data-index="${originalIndex}">
                            <i class="fas fa-key"></i> Copy Pass
                        </button>
                        <button class="btn btn-secondary btn-small" data-action="edit" data-index="${originalIndex}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-secondary btn-small" data-action="delete" data-index="${originalIndex}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // -------------------------------------------------------------------
    // Import / Export
    // -------------------------------------------------------------------
    handleExport(format = 'json') {
        if (this.currentEntries.length === 0) {
            this.showToast('No entries to export', 'warning');
            return;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `vaultx-backup-${timestamp}`;

        try {
            switch (format) {
                case 'excel': this.exportAsExcel(filename); break;
                case 'csv': this.exportAsCsv(filename); break;
                default: this.exportAsJson(filename);
            }
        } catch (error) {
            this.showToast('Export failed: ' + error.message, 'error');
        }
    }

    exportAsJson(filename) {
        const exportData = {
            version: CONFIG.VERSION,
            exported: new Date().toISOString(),
            entries: this.currentEntries
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `${filename}.json`);
        this.showToast('JSON export completed — this file is unencrypted, store it somewhere safe');
    }

    exportAsExcel(filename) {
        try {
            if (typeof XLSX === 'undefined') {
                this.showToast('Excel export unavailable - XLSX library not loaded', 'error');
                return;
            }

            const worksheetData = [
                ['Site/App', 'Username/Email', 'Password', 'Notes', 'Created', 'Last Updated']
            ];

            this.currentEntries.forEach(entry => {
                worksheetData.push([
                    entry.site || '',
                    entry.username || '',
                    entry.password || '',
                    entry.notes || '',
                    entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '',
                    entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : ''
                ]);
            });

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            worksheet['!cols'] = [
                { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 12 }
            ];
            XLSX.utils.book_append_sheet(workbook, worksheet, 'VaultX Passwords');

            const metaData = [
                ['VaultX Password Export'],
                [''],
                ['Export Date:', new Date().toLocaleString()],
                ['Total Entries:', this.currentEntries.length],
                ['Version:', CONFIG.VERSION],
                [''],
                ['Security Notice:'],
                ['This file contains sensitive password information in plain text.'],
                ['Please store it in a secure location and delete it when no longer needed.']
            ];
            const metaWorksheet = XLSX.utils.aoa_to_sheet(metaData);
            metaWorksheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(workbook, metaWorksheet, 'Export Info');

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            this.downloadFile(blob, `${filename}.xlsx`);
            this.showToast('Excel export completed — this file is unencrypted, store it somewhere safe');
        } catch (error) {
            this.showToast('Failed to export Excel file: ' + error.message, 'error');
        }
    }

    exportAsCsv(filename) {
        try {
            const csvData = [
                ['Site/App', 'Username/Email', 'Password', 'Notes', 'Created Date', 'Last Updated']
            ];

            this.currentEntries.forEach(entry => {
                csvData.push([
                    this.escapeCsvField(entry.site || ''),
                    this.escapeCsvField(entry.username || ''),
                    this.escapeCsvField(entry.password || ''),
                    this.escapeCsvField(entry.notes || ''),
                    entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '',
                    entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : ''
                ]);
            });

            const csvString = csvData.map(row => row.join(',')).join('\n');
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });

            this.downloadFile(blob, `${filename}.csv`);
            this.showToast('CSV export completed — this file is unencrypted, store it somewhere safe');
        } catch (error) {
            this.showToast('Failed to export CSV file: ' + error.message, 'error');
        }
    }

    escapeCsvField(field) {
        if (typeof field !== 'string') field = String(field);
        if (field.includes('"') || field.includes(',') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }

    downloadFile(blob, filename) {
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            this.showToast('Download failed: ' + error.message, 'error');
        }
    }

    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const fileExtension = file.name.split('.').pop().toLowerCase();
        switch (fileExtension) {
            case 'json': this.importFromJson(file); break;
            case 'xlsx':
            case 'xls': this.importFromExcel(file); break;
            case 'csv': this.importFromCsv(file); break;
            default: this.showToast('Unsupported file format. Please use JSON, Excel, or CSV files.', 'error');
        }
        event.target.value = '';
    }

    importFromJson(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.entries && Array.isArray(data.entries)) {
                    this.mergeImportedEntries(data.entries, 'JSON');
                } else {
                    this.showToast('Invalid JSON backup file format', 'error');
                }
            } catch (error) {
                this.showToast('Failed to parse JSON file', 'error');
            }
        };
        reader.readAsText(file);
    }

    importFromExcel(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                let sheetName = 'VaultX Passwords';
                if (!workbook.Sheets[sheetName]) sheetName = workbook.SheetNames[0];

                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) {
                    this.showToast('Excel file appears to be empty', 'error');
                    return;
                }

                const headers = jsonData[0];
                const siteIndex = this.findColumnIndex(headers, ['site', 'app', 'website', 'url']);
                const usernameIndex = this.findColumnIndex(headers, ['username', 'email', 'user', 'login']);
                const passwordIndex = this.findColumnIndex(headers, ['password', 'pass', 'pwd']);
                const notesIndex = this.findColumnIndex(headers, ['notes', 'note', 'comments', 'description']);

                if (siteIndex === -1 || usernameIndex === -1 || passwordIndex === -1) {
                    this.showToast('Excel file must contain Site, Username, and Password columns', 'error');
                    return;
                }

                const entries = [];
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (row[siteIndex] && row[usernameIndex] && row[passwordIndex]) {
                        entries.push({
                            site: String(row[siteIndex] || '').trim(),
                            username: String(row[usernameIndex] || '').trim(),
                            password: String(row[passwordIndex] || '').trim(),
                            notes: notesIndex !== -1 ? String(row[notesIndex] || '').trim() : '',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        });
                    }
                }

                this.mergeImportedEntries(entries, 'Excel');
            } catch (error) {
                this.showToast('Failed to parse Excel file', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    importFromCsv(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                const lines = csvText.split('\n').filter(line => line.trim());

                if (lines.length < 2) {
                    this.showToast('CSV file appears to be empty', 'error');
                    return;
                }

                const headers = this.parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
                const siteIndex = this.findColumnIndex(headers, ['site', 'app', 'website', 'url']);
                const usernameIndex = this.findColumnIndex(headers, ['username', 'email', 'user', 'login']);
                const passwordIndex = this.findColumnIndex(headers, ['password', 'pass', 'pwd']);
                const notesIndex = this.findColumnIndex(headers, ['notes', 'note', 'comments', 'description']);

                if (siteIndex === -1 || usernameIndex === -1 || passwordIndex === -1) {
                    this.showToast('CSV file must contain Site, Username, and Password columns', 'error');
                    return;
                }

                const entries = [];
                for (let i = 1; i < lines.length; i++) {
                    const row = this.parseCsvLine(lines[i]);
                    if (row[siteIndex] && row[usernameIndex] && row[passwordIndex]) {
                        entries.push({
                            site: String(row[siteIndex] || '').trim(),
                            username: String(row[usernameIndex] || '').trim(),
                            password: String(row[passwordIndex] || '').trim(),
                            notes: notesIndex !== -1 ? String(row[notesIndex] || '').trim() : '',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        });
                    }
                }

                this.mergeImportedEntries(entries, 'CSV');
            } catch (error) {
                this.showToast('Failed to parse CSV file', 'error');
            }
        };
        reader.readAsText(file);
    }

    findColumnIndex(headers, possibleNames) {
        for (let name of possibleNames) {
            const index = headers.findIndex(header => header.toLowerCase().includes(name.toLowerCase()));
            if (index !== -1) return index;
        }
        return -1;
    }

    parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    async mergeImportedEntries(importedEntries, format) {
        if (!Array.isArray(importedEntries) || importedEntries.length === 0) {
            this.showToast(`No valid entries found in ${format} file`, 'error');
            return;
        }

        if (this.currentEntries.length > 0) {
            if (!confirm(`This will merge ${importedEntries.length} entries with your existing ${this.currentEntries.length} entries. Continue?`)) {
                return;
            }
        }

        let importedCount = 0;
        importedEntries.forEach(entry => {
            const exists = this.currentEntries.some(existing =>
                existing.site.toLowerCase() === entry.site.toLowerCase() &&
                existing.username.toLowerCase() === entry.username.toLowerCase()
            );
            if (!exists) {
                entry.id = Date.now() + importedCount;
                this.currentEntries.unshift(entry);
                importedCount++;
            }
        });

        await this.saveToStorage();
        this.renderVault();

        const skippedCount = importedEntries.length - importedCount;
        let message = `Successfully imported ${importedCount} entries from ${format}`;
        if (skippedCount > 0) message += ` (${skippedCount} duplicates skipped)`;
        this.showToast(message);
    }

    // -------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------
    copyToClipboard(text, message = 'Copied to clipboard') {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast(message);
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast(message);
        });
    }

    showToast(message, type = 'success') {
        this.elements.toastText.textContent = message;
        this.elements.toast.className = `toast show ${type}`;
        setTimeout(() => {
            this.elements.toast?.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VaultXApp();
});
