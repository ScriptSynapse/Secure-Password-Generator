// VaultX Password Manager - Main Application
class VaultXApp {
    constructor() {
        this.currentEntries = [];
        this.editingIndex = -1;
        this.inactivityTimer = null;
        this.elements = {};

        this.init();
    }

    // Initialize the application
    init() {
        this.cacheElements();

        // Check if already unlocked
        if (sessionStorage.getItem('unlocked') === 'true') {
            this.showMainApp();
            this.loadFromStorage();
            this.resetInactivityTimer();

            // Setup event listeners after showing main app
            this.setupEventListeners();
            this.setupImportExport();
            this.makeGlobalMethods();
        } else {
            // Setup basic event listeners for login
            this.setupAuthEventListeners();
        }

        // Initialize UI
        this.updateStrengthMeter();
        setTimeout(() => this.elements.masterInput?.focus(), 100);
    }

    // Setup authentication event listeners (available before login)
    setupAuthEventListeners() {
        // Authentication events
        this.elements.unlockBtn?.addEventListener('click', () => this.handleUnlock());
        this.elements.setMasterBtn?.addEventListener('click', () => this.handleSetMaster());
        this.elements.masterInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUnlock();
        });
    }

    // Cache DOM elements
    cacheElements() {
        this.elements = {
            // Lock screen elements
            lockScreen: document.getElementById('lock-screen'),
            mainContainer: document.getElementById('main-container'),
            masterInput: document.getElementById('master-input'),
            unlockBtn: document.getElementById('unlock-btn'),
            setMasterBtn: document.getElementById('set-master-btn'),
            errorMsg: document.getElementById('error-msg'),
            logoutBtn: document.getElementById('logout-btn'),

            // Password generator elements
            lengthSlider: document.getElementById('length-slider'),
            lengthInput: document.getElementById('length-input'),
            lengthValue: document.getElementById('length-value'),
            uppercase: document.getElementById('uppercase'),
            lowercase: document.getElementById('lowercase'),
            numbers: document.getElementById('numbers'),
            symbols: document.getElementById('symbols'),

            // Password output elements
            passwordOutput: document.getElementById('password-output'),
            generateBtn: document.getElementById('generate-btn'),
            copyBtn: document.getElementById('copy-btn'),
            strengthText: document.getElementById('strength-text'),
            strengthFill: document.getElementById('strength-fill'),

            // Vault entry elements
            siteInput: document.getElementById('site-input'),
            usernameInput: document.getElementById('username-input'),
            passwordInput: document.getElementById('password-input'),
            notesInput: document.getElementById('notes-input'),
            useGeneratedBtn: document.getElementById('use-generated-btn'),
            saveEntryBtn: document.getElementById('save-entry-btn'),
            clearFormBtn: document.getElementById('clear-form-btn'),

            // Vault management elements
            searchInput: document.getElementById('search-input'),
            vaultList: document.getElementById('vault-list'),
            clearVaultBtn: document.getElementById('clear-vault-btn'),

            // Export/Import elements
            exportBtn: document.getElementById('export-btn'),
            exportDropdown: document.getElementById('export-dropdown'),
            exportJsonBtn: document.getElementById('export-json-btn'),
            exportExcelBtn: document.getElementById('export-excel-btn'),
            exportCsvBtn: document.getElementById('export-csv-btn'),
            importBtn: document.getElementById('import-btn'),
            importFile: document.getElementById('import-file'),
            changeMasterBtn: document.getElementById('change-master-btn'),

            // UI elements
            toast: document.getElementById('toast'),
            toastText: document.getElementById('toast-text')
        };
    }

    // Setup all event listeners (called after login)
    setupEventListeners() {
        // Authentication events (logout)
        this.elements.logoutBtn?.addEventListener('click', () => this.logout());

        // Password generation events
        this.elements.lengthSlider?.addEventListener('input', () => this.handleLengthChange());
        this.elements.lengthInput?.addEventListener('input', () => this.handleLengthInputChange());

        [this.elements.uppercase, this.elements.lowercase, this.elements.numbers, this.elements.symbols]
            .forEach(checkbox => checkbox?.addEventListener('change', () => this.updateStrengthMeter()));

        this.elements.generateBtn?.addEventListener('click', () => this.handleGenerate());
        this.elements.copyBtn?.addEventListener('click', () => this.handleCopyPassword());

        // Vault management events
        this.elements.useGeneratedBtn?.addEventListener('click', () => this.handleUseGenerated());
        this.elements.saveEntryBtn?.addEventListener('click', () => this.addOrUpdateEntry());
        this.elements.clearFormBtn?.addEventListener('click', () => this.clearForm());
        this.elements.searchInput?.addEventListener('input', () => this.renderVault());
        this.elements.clearVaultBtn?.addEventListener('click', () => this.handleClearVault());

        // Form submission with Enter key
        [this.elements.siteInput, this.elements.usernameInput, this.elements.passwordInput]
            .forEach(input => input?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addOrUpdateEntry();
            }));

        // Inactivity tracking
        ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
            document.addEventListener(event, () => this.resetInactivityTimer());
        });
    }

    // Setup import/export functionality (called after login)
    setupImportExport() {
        console.log('Setting up import/export...'); // Debug log

        // Wait a bit to ensure DOM is ready
        setTimeout(() => {
            // Re-cache export elements to make sure they exist
            this.elements.exportBtn = document.getElementById('export-btn');
            this.elements.exportDropdown = document.getElementById('export-dropdown');
            this.elements.exportJsonBtn = document.getElementById('export-json-btn');
            this.elements.exportExcelBtn = document.getElementById('export-excel-btn');
            this.elements.exportCsvBtn = document.getElementById('export-csv-btn');

            // Check if elements exist
            if (!this.elements.exportBtn) {
                console.error('Export button not found!');
                return;
            }

            if (!this.elements.exportDropdown) {
                console.error('Export dropdown not found!');
                return;
            }

            console.log('Export elements found, setting up listeners...');

            // Dropdown toggle
            this.elements.exportBtn.addEventListener('click', (e) => {
                console.log('Export button clicked'); // Debug log
                e.preventDefault();
                e.stopPropagation();

                const dropdown = this.elements.exportDropdown;
                const isHidden = dropdown.classList.contains('hidden');
                console.log('Dropdown is hidden:', isHidden); // Debug log

                if (isHidden) {
                    dropdown.classList.remove('hidden');
                    console.log('Showing dropdown');
                } else {
                    dropdown.classList.add('hidden');
                    console.log('Hiding dropdown');
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.elements.exportBtn.contains(e.target) &&
                    !this.elements.exportDropdown.contains(e.target)) {
                    this.elements.exportDropdown.classList.add('hidden');
                }
            });

            // Export options
            if (this.elements.exportJsonBtn) {
                this.elements.exportJsonBtn.addEventListener('click', (e) => {
                    console.log('JSON export clicked'); // Debug log
                    e.preventDefault();
                    e.stopPropagation();
                    this.elements.exportDropdown.classList.add('hidden');
                    this.handleExport('json');
                });
            }

            if (this.elements.exportExcelBtn) {
                this.elements.exportExcelBtn.addEventListener('click', (e) => {
                    console.log('Excel export clicked'); // Debug log
                    e.preventDefault();
                    e.stopPropagation();
                    this.elements.exportDropdown.classList.add('hidden');
                    this.handleExport('excel');
                });
            }

            if (this.elements.exportCsvBtn) {
                this.elements.exportCsvBtn.addEventListener('click', (e) => {
                    console.log('CSV export clicked'); // Debug log
                    e.preventDefault();
                    e.stopPropagation();
                    this.elements.exportDropdown.classList.add('hidden');
                    this.handleExport('csv');
                });
            }

            // Import functionality
            if (this.elements.importBtn) {
                this.elements.importBtn.addEventListener('click', () => {
                    console.log('Import button clicked'); // Debug log
                    this.elements.importFile?.click();
                });
            }

            if (this.elements.importFile) {
                this.elements.importFile.addEventListener('change', (e) => {
                    console.log('Import file selected'); // Debug log
                    this.handleImport(e);
                });
            }

            if (this.elements.changeMasterBtn) {
                this.elements.changeMasterBtn.addEventListener('click', () => this.handleChangeMaster());
            }

            console.log('Import/export setup complete'); // Debug log
        }, 100);
    }

    // Make methods available globally for onclick handlers
    makeGlobalMethods() {
        window.vaultApp = {
            editEntry: (index) => this.editEntry(index),
            deleteEntry: (index) => this.deleteEntry(index),
            copyToClipboard: (text, message) => this.copyToClipboard(text, message)
        };
    }

    // Authentication methods
    handleUnlock() {
        const inputPassword = this.elements.masterInput?.value;
        if (inputPassword === this.getMasterPassword()) {
            sessionStorage.setItem('unlocked', 'true');
            this.showMainApp();
            this.elements.errorMsg.textContent = '';
            this.loadFromStorage();
            this.resetInactivityTimer();

            // Setup all event listeners after successful login
            this.setupEventListeners();
            this.setupImportExport();
            this.makeGlobalMethods();

            this.handleGenerate(); // Generate initial password
        } else {
            this.elements.errorMsg.textContent = 'Incorrect master password!';
            this.elements.masterInput.value = '';
            this.elements.masterInput?.focus();
        }
    }

    handleSetMaster() {
        const newPassword = prompt('Enter new master password (minimum 8 characters):');
        if (newPassword && newPassword.length >= 8) {
            this.setMasterPassword(newPassword);
            this.showToast('Master password updated');
            this.elements.errorMsg.textContent = '';
        } else if (newPassword !== null) {
            alert('Password must be at least 8 characters long');
        }
    }

    handleChangeMaster() {
        const currentPassword = prompt('Enter current master password:');
        if (currentPassword !== this.getMasterPassword()) {
            this.showToast('Incorrect current password', 'error');
            return;
        }

        const newPassword = prompt('Enter new master password (minimum 8 characters):');
        if (newPassword && newPassword.length >= 8) {
            this.setMasterPassword(newPassword);
            this.showToast('Master password changed successfully');
        } else if (newPassword !== null) {
            this.showToast('Password must be at least 8 characters long', 'error');
        }
    }

    getMasterPassword() {
        return sessionStorage.getItem('masterPassword') || CONFIG.MASTER_PASSWORD;
    }

    setMasterPassword(password) {
        sessionStorage.setItem('masterPassword', password);
    }

    showMainApp() {
        this.elements.lockScreen?.classList.add('hidden');
        this.elements.mainContainer?.classList.remove('hidden');
    }

    logout() {
        sessionStorage.clear();
        this.elements.lockScreen?.classList.remove('hidden');
        this.elements.mainContainer?.classList.add('hidden');
        this.elements.masterInput.value = '';
        this.elements.errorMsg.textContent = '';
        clearTimeout(this.inactivityTimer);
    }

    resetInactivityTimer() {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(() => {
            this.logout();
            this.showToast('Session expired due to inactivity', 'warning');
        }, CONFIG.AUTO_LOGOUT_TIME);
    }

    // Password generation methods
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

        let password = '';
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            password += chars.charAt(array[i] % chars.length);
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

        const entropy = Math.log2(complexity) * length;

        if (entropy < 40) return { label: "Very Weak 🔴", percentage: 20, class: "strength-weak" };
        if (entropy < 60) return { label: "Weak 🟠", percentage: 40, class: "strength-weak" };
        if (entropy < 80) return { label: "Medium 🟡", percentage: 60, class: "strength-medium" };
        if (entropy < 100) return { label: "Strong 🟢", percentage: 80, class: "strength-strong" };
        return { label: "Very Strong 🔥", percentage: 100, class: "strength-strong" };
    }

    updateStrengthMeter() {
        const strength = this.calculateStrength();
        this.elements.strengthText.textContent = strength.label;
        this.elements.strengthText.className = `strength-value ${strength.class}`;
        this.elements.strengthFill.style.width = `${strength.percentage}%`;

        let color = strength.class === 'strength-weak' ? 'var(--danger)' :
            strength.class === 'strength-medium' ? 'var(--warning)' : 'var(--success)';
        this.elements.strengthFill.style.backgroundColor = color;
    }

    // Vault management methods
    handleUseGenerated() {
        if (this.elements.passwordOutput?.value) {
            this.elements.passwordInput.value = this.elements.passwordOutput.value;
            this.showToast('Generated password filled');
        } else {
            this.showToast('Generate a password first', 'warning');
        }
    }

    addOrUpdateEntry() {
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

        this.saveToStorage();
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

        // Scroll to form
        this.elements.siteInput?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.elements.siteInput?.focus();
    }

    deleteEntry(index) {
        if (confirm('Are you sure you want to delete this entry?')) {
            this.currentEntries.splice(index, 1);
            this.saveToStorage();
            this.renderVault();
            this.showToast('Entry deleted');
        }
    }

    handleClearVault() {
        if (this.currentEntries.length > 0 &&
            confirm('Are you sure you want to clear all vault entries? This cannot be undone.')) {
            this.currentEntries = [];
            this.saveToStorage();
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

    // Storage methods
    saveToStorage() {
        try {
            const encrypted = btoa(JSON.stringify(this.currentEntries));
            sessionStorage.setItem(CONFIG.STORAGE_KEY, encrypted);
        } catch (error) {
            this.showToast('Failed to save vault data', 'error');
        }
    }

    loadFromStorage() {
        try {
            const encrypted = sessionStorage.getItem(CONFIG.STORAGE_KEY);
            if (encrypted) {
                this.currentEntries = JSON.parse(atob(encrypted));
            } else {
                this.currentEntries = [];
            }
            this.renderVault();
        } catch (error) {
            this.currentEntries = [];
            this.showToast('Failed to load vault data', 'error');
        }
    }

    // Vault rendering
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

        this.elements.vaultList.innerHTML = filteredEntries.map((entry, index) => {
            const originalIndex = this.currentEntries.indexOf(entry);
            return `
                <div class="vault-item">
                    <div class="vault-site">${this.escapeHtml(entry.site)}</div>
                    <div class="vault-username">${this.escapeHtml(entry.username)}</div>
                    ${entry.notes ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">${this.escapeHtml(entry.notes)}</div>` : ''}
                    <div class="vault-actions">
                        <button class="btn btn-secondary btn-small" onclick="vaultApp.copyToClipboard('${this.escapeHtml(entry.username)}', 'Username copied')">
                            <i class="fas fa-user"></i> Copy User
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="vaultApp.copyToClipboard('${this.escapeHtml(entry.password)}', 'Password copied')">
                            <i class="fas fa-key"></i> Copy Pass
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="vaultApp.editEntry(${originalIndex})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="vaultApp.deleteEntry(${originalIndex})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Import/Export methods
    handleExport(format = 'json') {
        console.log('HandleExport called with format:', format); // Debug log

        if (this.currentEntries.length === 0) {
            this.showToast('No entries to export', 'warning');
            return;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `vaultx-backup-${timestamp}`;

        try {
            switch (format) {
                case 'json':
                    console.log('Exporting as JSON'); // Debug log
                    this.exportAsJson(filename);
                    break;
                case 'excel':
                    console.log('Exporting as Excel'); // Debug log
                    this.exportAsExcel(filename);
                    break;
                case 'csv':
                    console.log('Exporting as CSV'); // Debug log
                    this.exportAsCsv(filename);
                    break;
                default:
                    console.log('Default export as JSON'); // Debug log
                    this.exportAsJson(filename);
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Export failed: ' + error.message, 'error');
        }
    }

    exportAsJson(filename) {
        console.log('Exporting JSON with filename:', filename); // Debug log

        const exportData = {
            version: CONFIG.VERSION,
            exported: new Date().toISOString(),
            entries: this.currentEntries
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `${filename}.json`);
        this.showToast('JSON export completed successfully');
    }

    exportAsExcel(filename) {
        console.log('Exporting Excel with filename:', filename); // Debug log

        try {
            // Check if XLSX is available
            if (typeof XLSX === 'undefined') {
                console.error('XLSX library not loaded');
                this.showToast('Excel export unavailable - XLSX library not loaded', 'error');
                return;
            }

            // Prepare data for Excel
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

            // Create workbook and worksheet
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

            // Set column widths
            worksheet['!cols'] = [
                { wch: 20 }, // Site/App
                { wch: 25 }, // Username/Email
                { wch: 20 }, // Password
                { wch: 30 }, // Notes
                { wch: 12 }, // Created
                { wch: 12 }  // Updated
            ];

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, "VaultX Passwords");

            // Add metadata sheet
            const metaData = [
                ['VaultX Password Export'],
                [''],
                ['Export Date:', new Date().toLocaleString()],
                ['Total Entries:', this.currentEntries.length],
                ['Version:', CONFIG.VERSION],
                [''],
                ['Security Notice:'],
                ['This file contains sensitive password information.'],
                ['Please store it in a secure location and delete when no longer needed.']
            ];

            const metaWorksheet = XLSX.utils.aoa_to_sheet(metaData);
            metaWorksheet['!cols'] = [{ wch: 25 }, { wch: 30 }];

            XLSX.utils.book_append_sheet(workbook, metaWorksheet, "Export Info");

            // Generate and download Excel file
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            this.downloadFile(blob, `${filename}.xlsx`);
            this.showToast('Excel export completed successfully');

        } catch (error) {
            console.error('Excel export error:', error);
            this.showToast('Failed to export Excel file: ' + error.message, 'error');
        }
    }

    exportAsCsv(filename) {
        console.log('Exporting CSV with filename:', filename); // Debug log

        try {
            // Prepare CSV data
            const csvData = [];

            // Add header row
            csvData.push([
                'Site/App',
                'Username/Email',
                'Password',
                'Notes',
                'Created Date',
                'Last Updated'
            ]);

            // Add data rows
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

            // Convert to CSV string
            const csvString = csvData.map(row => row.join(',')).join('\n');

            // Add BOM for proper UTF-8 encoding in Excel
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });

            this.downloadFile(blob, `${filename}.csv`);
            this.showToast('CSV export completed successfully');

        } catch (error) {
            console.error('CSV export error:', error);
            this.showToast('Failed to export CSV file: ' + error.message, 'error');
        }
    }

    escapeCsvField(field) {
        // Escape CSV fields that contain commas, quotes, or newlines
        if (typeof field !== 'string') field = String(field);

        if (field.includes('"') || field.includes(',') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }

    downloadFile(blob, filename) {
        console.log('Downloading file:', filename); // Debug log

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
            console.log('Download initiated successfully'); // Debug log
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Download failed: ' + error.message, 'error');
        }
    }

    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const fileExtension = file.name.split('.').pop().toLowerCase();

        switch (fileExtension) {
            case 'json':
                this.importFromJson(file);
                break;
            case 'xlsx':
            case 'xls':
                this.importFromExcel(file);
                break;
            case 'csv':
                this.importFromCsv(file);
                break;
            default:
                this.showToast('Unsupported file format. Please use JSON, Excel, or CSV files.', 'error');
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

                // Try to find the passwords sheet
                let sheetName = 'VaultX Passwords';
                if (!workbook.Sheets[sheetName]) {
                    // Fallback to first sheet
                    sheetName = workbook.SheetNames[0];
                }

                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) {
                    this.showToast('Excel file appears to be empty', 'error');
                    return;
                }

                // Parse the Excel data
                const entries = [];
                const headers = jsonData[0];

                // Find column indices
                const siteIndex = this.findColumnIndex(headers, ['site', 'app', 'website', 'url']);
                const usernameIndex = this.findColumnIndex(headers, ['username', 'email', 'user', 'login']);
                const passwordIndex = this.findColumnIndex(headers, ['password', 'pass', 'pwd']);
                const notesIndex = this.findColumnIndex(headers, ['notes', 'note', 'comments', 'description']);

                if (siteIndex === -1 || usernameIndex === -1 || passwordIndex === -1) {
                    this.showToast('Excel file must contain Site, Username, and Password columns', 'error');
                    return;
                }

                // Process data rows
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
                console.error('Excel import error:', error);
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

                // Parse CSV headers
                const headers = this.parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());

                // Find column indices
                const siteIndex = this.findColumnIndex(headers, ['site', 'app', 'website', 'url']);
                const usernameIndex = this.findColumnIndex(headers, ['username', 'email', 'user', 'login']);
                const passwordIndex = this.findColumnIndex(headers, ['password', 'pass', 'pwd']);
                const notesIndex = this.findColumnIndex(headers, ['notes', 'note', 'comments', 'description']);

                if (siteIndex === -1 || usernameIndex === -1 || passwordIndex === -1) {
                    this.showToast('CSV file must contain Site, Username, and Password columns', 'error');
                    return;
                }

                // Process data rows
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
                console.error('CSV import error:', error);
                this.showToast('Failed to parse CSV file', 'error');
            }
        };
        reader.readAsText(file);
    }

    findColumnIndex(headers, possibleNames) {
        for (let name of possibleNames) {
            const index = headers.findIndex(header =>
                header.toLowerCase().includes(name.toLowerCase())
            );
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
                    i++; // Skip next quote
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

    mergeImportedEntries(importedEntries, format) {
        if (!Array.isArray(importedEntries) || importedEntries.length === 0) {
            this.showToast(`No valid entries found in ${format} file`, 'error');
            return;
        }

        if (this.currentEntries.length > 0) {
            if (!confirm(`This will merge ${importedEntries.length} entries with your existing ${this.currentEntries.length} entries. Continue?`)) {
                return;
            }
        }

        // Merge entries, avoiding duplicates
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

        this.saveToStorage();
        this.renderVault();

        const skippedCount = importedEntries.length - importedCount;
        let message = `Successfully imported ${importedCount} entries from ${format}`;
        if (skippedCount > 0) {
            message += ` (${skippedCount} duplicates skipped)`;
        }

        this.showToast(message);
    }

    // Utility methods
    copyToClipboard(text, message = 'Copied to clipboard') {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast(message);
        }).catch(() => {
            // Fallback for older browsers
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VaultXApp();
});