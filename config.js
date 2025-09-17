// VaultX Configuration
const CONFIG = {
    MASTER_PASSWORD: "VaultX123",
    AUTO_LOGOUT_TIME: 10 * 60 * 1000, // 10 minutes in milliseconds
    STORAGE_KEY: "vaultx_entries",
    VERSION: "2.0.0"
};

// Character sets for password generation
const CHARSETS = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// Default password generation settings
const DEFAULT_SETTINGS = {
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
};