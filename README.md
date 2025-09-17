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

<img width="1170" height="751" alt="image" src="https://github.com/user-attachments/assets/e66529f9-7711-435e-849f-33be0cc633c1" />

<img width="976" height="821" alt="image" src="https://github.com/user-attachments/assets/94b6fb97-4255-4b19-bf32-0ab8895048cc" />



## 🔒 Disclaimer

This is a **frontend-only demo**. Do not use it as your sole password manager for sensitive data. For real-world use, integrate with secure backend storage and encryption.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to open an issue or submit a pull request.

## 📜 License

This project is licensed under the MIT License.
