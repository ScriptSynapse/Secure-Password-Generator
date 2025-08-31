# 🔑 Secure Password Generator

A simple, modern web app to generate strong and secure passwords.
It uses the browser’s built-in `crypto.getRandomValues` for randomness and provides real-time strength feedback.

## 🚀 Features

* Adjustable password length (4–64 characters)
* Toggle options for:

  * Uppercase letters (A–Z)
  * Lowercase letters (a–z)
  * Numbers (0–9)
  * Symbols (!@#\$%^&\*)
* Copy to clipboard with one click
* Password strength meter (weak, medium, strong)
* Responsive design with a clean dark UI

## 🖥️ Demo

Open the `index.html` file in your browser to use the generator.
No server or dependencies required.

## 📂 Project Structure

```
.
├── index.html   # Main file (HTML, CSS, JS all included)
```

## ⚙️ How It Works

* Uses **vanilla JavaScript** with `crypto.getRandomValues` to generate random characters.
* Password strength is calculated based on entropy (length × character set size).
* Passwords are displayed in a styled textarea with copy-to-clipboard support.

## 🛡️ Security Notes

* Passwords are generated **client-side** only.
* No data is sent to any server.
* Uses the Web Crypto API for cryptographically secure randomness.


## 📜 License

This project is open source. Feel free to modify and use it.

