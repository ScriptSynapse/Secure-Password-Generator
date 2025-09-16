# VaultX 🔐

A modern, secure, and easy-to-use password generator and manager with a master password lock screen.

## 🚀 Features

* **Master Password Protection** – Access the app only after entering the correct master key.
* **Auto Logout** – Automatic logout after inactivity (default: 10 minutes).
* **Customizable Passwords** – Choose length (4–64) and character types (uppercase, lowercase, numbers, symbols).
* **Password Strength Meter** – Visual indicator of password strength.
* **Copy to Clipboard** – One-click password copying with a toast notification.
* **Responsive UI** – Works across devices with a clean dark-themed design.

## 🛠️ Tech Stack

* **HTML5** – Structure
* **CSS3** – Styling with modern design & animations
* **JavaScript (Vanilla)** – Functionality & logic
* **Font Awesome** – Icons
* **Google Fonts (Roboto)** – Typography

## 📂 Project Structure

```
├── index.html      # Main app UI
├── style.css       # Styling
├── config.js       # Configuration (Master Password, Auto-logout timer)
├── main.js         # App logic (locked until unlocked)
```

## ⚙️ Configuration

You can update **config.js** to change app settings:

```js
const MASTER_PASSWORD = "VaultX123";   // Change your master password here
const AUTO_LOGOUT_TIME = 10 * 60 * 1000; // Auto logout time in ms (10 min default)
```

## ▶️ Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/vaultx.git
   ```
2. Open `index.html` in your browser.
3. Enter the master password to unlock and start generating passwords.

## 📸 Screenshots

<img width="1211" height="737" alt="image" src="https://github.com/user-attachments/assets/d37a8398-1b7a-401a-b25e-94ce108ed676" />

<img width="1426" height="881" alt="image" src="https://github.com/user-attachments/assets/c8a64a72-b7c3-4334-945c-1efaeb3172b6" />


## 🔒 Disclaimer

This is a **frontend-only demo**. Do not use it as your sole password manager for sensitive data. For real-world use, integrate with secure backend storage and encryption.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to open an issue or submit a pull request.

## 📜 License

This project is licensed under the MIT License.
