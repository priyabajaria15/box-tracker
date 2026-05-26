# 📦 BoxTracker — Moving Helper App

Track which items are in which moving box.
Supports typed input AND free browser voice commands.
Data is saved to a real file on your computer (data.json).
No Gemini/OpenAI/paid API key is required.

---

## 📁 Folder Structure

```
box-tracker/
│
├── index.html   ← The webpage
├── style.css    ← All the design/colours
├── app.js       ← Frontend logic (talks to Python server)
├── server.py    ← Python backend (saves data to file)
├── data.json    ← Created automatically when you first run
└── README.md    ← This file
```

---

## 🚀 How to Run (step by step)

### Step 1 — Put all files in one folder
Create a folder called `box-tracker` and put these files inside:
- index.html
- style.css
- app.js
- server.py

### Step 2 — Open Terminal / Command Prompt
- **Mac**: Press Cmd+Space, type "Terminal", press Enter
- **Windows**: Press Win+R, type "cmd", press Enter

### Step 3 — Go into your folder
```bash
cd path/to/box-tracker

# Example on Mac:
cd ~/Downloads/box-tracker

# Example on Windows:
cd C:\Users\YourName\Downloads\box-tracker
```

### Step 4 — Start the server
```bash
python3 server.py
```
You should see:
```
📦 BoxTracker server starting...
   Open this in Chrome: http://localhost:8080
   Data is saved to: /path/to/box-tracker/data.json
```

### Step 5 — Open in Chrome
Go to: **http://localhost:8080**

> ⚠️ Must use Chrome for voice to work.
> Keep the terminal open while using the app.
> Press Ctrl+C in terminal to stop the server.

---

## 💾 Where is data saved?

All data is saved in **data.json** in the same folder.
It looks like this:

```json
{
  "boxes": [
    {
      "name": "Kitchen Stuff",
      "color": "#c05c2e",
      "items": ["scissors", "knife", "ladle"]
    },
    {
      "name": "Bedroom",
      "color": "#2d6a4f",
      "items": ["remote", "lamp", "charger"]
    }
  ]
}
```

- Data is permanent — survives browser clear, restarts, etc.
- Back it up by just copying data.json somewhere safe.

---

## 🎙️ Voice Commands (Chrome only)

| Say this                          | What happens                         |
|-----------------------------------|--------------------------------------|
| "Create box 1"                  | Creates a box named Box 1            |
| "New box Bathroom"                | Creates a box named Bathroom         |
| "Add scissors to Box 1"           | Adds scissors to Box 1               |
| "Add tape and glue to Box 1"      | Adds multiple items to Box 1         |
| "Where is scissors"               | Finds which box has scissors         |
| "What box has remote"             | Finds which box has the remote       |
| "Find charger"                    | Searches for charger                 |

---

## 🌐 Access from phone (same WiFi)

1. Find your laptop's IP address:
   - Mac: System Preferences → Network → your IP (e.g. 192.168.1.5)
   - Windows: Run `ipconfig` in cmd, look for IPv4 Address

2. On your phone's Chrome, go to: `http://192.168.1.5:8080`
   (replace with your actual IP)

> Voice may not work on phone — but searching and adding items manually will work fine.

---

## ❓ Troubleshooting

**"python3: command not found"**
→ Try `python server.py` instead (without the 3)

**App shows blank / can't connect**
→ Make sure terminal is still open and server is running
→ Make sure you're on http://localhost:8080 not file://

**Voice button does nothing**
→ Must use Google Chrome
→ Click "Allow" when Chrome asks for microphone permission
