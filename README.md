# VaultX🔐 — Secure Password Manager

VaultX is a browser-based password generator and vault. It helps you create strong passwords and store site credentials locally, encrypted with a master password you choose.


## 🚀 Features

* **Master Password Lock**: You create your own master password on first use — there is no default or hardcoded password.
* **Real Encryption**: The vault is encrypted with AES-256-GCM using a key derived from your master password via PBKDF2 (250,000 iterations). Nothing that could reconstruct the key is ever written to storage.
* **Password Generator**: Cryptographically random passwords (`crypto.getRandomValues` with rejection sampling to avoid modulo bias) with customizable length and character sets.
* **Vault Management**: Save site/app credentials with usernames, passwords, and notes.
* **Search & Filter**: Quickly search saved credentials.
* **Import & Export**: Backup or restore vault data in JSON, Excel, or CSV format.
* **Auto-Lock**: The vault locks itself after 5 minutes of inactivity, and the master password derives a fresh key from scratch on every unlock — nothing is cached.
* **Password Strength Meter**: Real-time entropy-based strength indicator.
* **Responsive UI**: Works across desktop and mobile.

## 📂 Project Structure

```
.
├── index.html      # Main HTML file
├── style.css       # Stylesheet for UI
├── config.js       # Non-sensitive constants (storage keys, timeouts, charsets)
├── main.js         # Application logic, including the crypto layer
```

## 🛠️ Installation & Usage

1. **Clone the repository**

   ```bash
   git clone https://github.com/ScriptSynapse/Secure-Password-Generator.git
   cd Secure-Password-Generator
   ```

2. **Serve the app**
   The Web Crypto API (used for encryption) requires a secure context. Opening `index.html` directly (`file://`) works in most modern browsers, but if you run into issues, serve it locally instead:

   ```bash
   python3 -m http.server 8000
   # then open http://localhost:8000
   ```

   Or just visit the hosted version: <https://scriptsynapse.github.io/Secure-Password-Generator/>

3. **First-time setup**
   * Click **Set Master** and choose a password (8+ characters). This creates your encrypted vault on this device.
   * Coming back later — even after closing the browser or restarting your computer? Enter that password and click **Unlock**.
   * There's no password recovery by design — if you forget it, the vault can't be decrypted. Export a backup regularly if that matters to you.

## ⚙️ Configuration

Non-sensitive settings live in **`config.js`**:

* `AUTO_LOGOUT_TIME` → inactivity timeout before auto-lock (ms)
* `PBKDF2_ITERATIONS` → key-derivation cost factor
* `STORAGE_KEY` / `AUTH_KEY` → localStorage keys used internally
* Character sets used by the password generator

There is intentionally no password stored in this file.

## 🔒 Security Model

* Vault data lives in `localStorage`, encrypted with AES-256-GCM, and persists across browser restarts and device reboots. The decryption key is derived in memory each time you unlock and is never itself written to storage — closing the tab, locking via inactivity, or clicking **Lock** all discard it, and you'll need your master password again to get back in.
* This is a local, single-device tool with no sync and no server component — your vault won't follow you to another browser or computer. Use **Export** (JSON/Excel/CSV) if you want a portable backup, and note that exported files are **unencrypted plain text**, so store them somewhere safe and delete them when you're done.
* There is no password recovery. Forgetting your master password means the vault can't be decrypted — by you or anyone else. Clicking "Set Master" again when a vault already exists will erase it (with a confirmation first), since there's no way to re-encrypt existing data without the old password.
* This is a client-side demo/personal tool, not an audited security product. For anything beyond casual personal use, use an established, audited password manager.

## 🤝 Contributing

Pull requests are welcome! For major changes, open an issue first to discuss what you'd like to improve.

## 📄 License

This project is licensed under the MIT License.
