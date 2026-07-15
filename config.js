// VaultX Configuration
// Note: nothing sensitive belongs in this file. There is no default/hardcoded
// master password — the vault owner creates one on first use (see main.js).
const CONFIG = Object.freeze({
    STORAGE_KEY: 'vaultx_vault',        // sessionStorage key for the encrypted vault blob
    AUTH_KEY: 'vaultx_auth',            // sessionStorage key for the salt/iteration metadata
    AUTO_LOGOUT_TIME: 5 * 60 * 1000,    // auto-lock after 5 minutes of inactivity (ms)
    PBKDF2_ITERATIONS: 250000,          // key-derivation cost factor (OWASP-recommended range)
    VERSION: '2.0.0'
});

const CHARSETS = Object.freeze({
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
});