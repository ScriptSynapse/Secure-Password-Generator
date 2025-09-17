# VaultX🔐 — Secure Password Manager

VaultX is a browser-based password manager and generator. It helps you securely create, store, and manage strong passwords with an easy-to-use interface.

## 🚀 Features

* **Master Password Lock**: Protects access with a customizable master password.
* **Password Generator**: Generate strong, random passwords with customizable length and character sets.
* **Vault Management**: Save site/app credentials with usernames, passwords, and notes.
* **Search & Filter**: Quickly search for saved credentials.
* **Import & Export**: Backup or restore vault data in JSON, Excel, or CSV format.
* **Auto Logout**: Session automatically expires after inactivity for extra security.
* **Password Strength Meter**: Real-time strength calculation with visual indicators.
* **Responsive UI**: Works across desktops and mobile devices.

## 📂 Project Structure

```
.
├── index.html      # Main HTML file
├── style.css       # Stylesheet for UI
├── config.js       # Configuration (master password, settings, constants)
├── main.js         # Application logic
```

## 🛠️ Installation & Usage

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/vaultx.git
   cd vaultx
   ```

2. **Open the app**
   Simply open `index.html` in your browser.
   No server setup is required since it’s a front-end only project.

3. **Login / Setup**

    * Default master password: `VaultX123` (set in `config.js`).
    * You can change it after logging in.

## ⚙️ Configuration

You can adjust settings in **`config.js`**:

* `MASTER_PASSWORD` → default master password
* `AUTO_LOGOUT_TIME` → session timeout (in milliseconds)
* `STORAGE_KEY` → key for session storage
* `DEFAULT_SETTINGS` → password generator defaults

## 📸 Screenshots



## 🔒 Security Notice

* VaultX stores data in **session storage** (browser memory). Data is lost after closing the browser.
* For real-world use, additional backend encryption and storage would be required.

## 🤝 Contributing

Pull requests are welcome! For major changes, open an issue first to discuss what you’d like to improve.

## 📄 License

This project is licensed under the MIT License.
