// ── API helpers ──
const API = "http://localhost:8080/api";

async function api(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  return res.json();
}

// ── State (loaded from server) ──
let boxes = [];

async function loadData() {
  const data = await api("GET", "/data");
  boxes = data.boxes || [];
  render();
}

// ── Colour palette ──
const COLORS = ["#c05c2e","#2d6a4f","#1d4e89","#6b3fa0","#c0862e","#c02e5c","#2e7da8"];
let colorIndex = 0;

// ── Render ──
function render() {
  const grid = document.getElementById("boxes-grid");
  grid.innerHTML = "";

  if (boxes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<span>📦</span><p>No boxes yet. Add your first box!</p>";
    grid.appendChild(empty);
    document.getElementById("total-boxes").textContent = 0;
    document.getElementById("total-items").textContent = 0;
    return;
  }

  let totalItems = 0;
  boxes.forEach((box, bi) => {
    totalItems += box.items.length;
    grid.appendChild(buildBoxCard(box, bi));
  });

  document.getElementById("total-boxes").textContent = boxes.length;
  document.getElementById("total-items").textContent = totalItems;
}

function buildBoxCard(box, bi) {
  const card = document.createElement("div");
  card.className = "box-card";
  card.id = "box-" + bi;

  const header = document.createElement("div");
  header.className = "box-header";

  const dot = document.createElement("div");
  dot.className = "box-color-dot";
  dot.style.background = box.color || COLORS[0];

  const nameEl = document.createElement("span");
  nameEl.className = "box-name";
  nameEl.textContent = box.name;

  const left = document.createElement("div");
  left.className = "box-header-left";
  left.append(dot, nameEl);

  const count = document.createElement("span");
  count.className = "box-count";
  count.textContent = box.items.length + " item" + (box.items.length !== 1 ? "s" : "");

  const delBtn = document.createElement("button");
  delBtn.className = "btn-delete-box";
  delBtn.title = "Delete box";
  delBtn.textContent = "✕";
  delBtn.onclick = () => deleteBox(bi);

  header.append(left, count, delBtn);

  const itemsDiv = document.createElement("div");
  itemsDiv.className = "box-items";

  if (box.items.length === 0) {
    const none = document.createElement("span");
    none.className = "no-items";
    none.textContent = "No items yet";
    itemsDiv.appendChild(none);
  } else {
    box.items.forEach((item, ii) => {
      const tag = document.createElement("span");
      tag.className = "item-tag";
      tag.textContent = item;
      const rm = document.createElement("button");
      rm.textContent = "×";
      rm.title = "Remove item";
      rm.onclick = () => removeItem(bi, ii);
      tag.appendChild(rm);
      itemsDiv.appendChild(tag);
    });
  }

  const addRow = document.createElement("div");
  addRow.className = "box-add-row";

  const inp = document.createElement("input");
  inp.type = "text";
  inp.placeholder = "Add item...";
  inp.addEventListener("keydown", e => { if (e.key === "Enter") addItemToBox(bi, inp.value, inp); });

  const addBtn = document.createElement("button");
  addBtn.textContent = "+ Add";
  addBtn.onclick = () => addItemToBox(bi, inp.value, inp);

  addRow.append(inp, addBtn);
  card.append(header, itemsDiv, addRow);
  return card;
}

// ── Box CRUD ──
async function addBox() {
  const nameInp = document.getElementById("box-name-input");
  const name = nameInp.value.trim();
  if (!name) { nameInp.focus(); return; }

  const color = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  const res = await api("POST", "/boxes", { name, color });
  boxes = res.boxes;
  nameInp.value = "";
  document.getElementById("box-color-input").value = "";
  render();
}

async function deleteBox(bi) {
  if (!confirm("Delete \"" + boxes[bi].name + "\" and all its items?")) return;
  const res = await api("DELETE", "/boxes/" + bi);
  boxes = res.boxes;
  render();
}

async function addItemToBox(bi, value, input) {
  const item = value.trim();
  if (!item) return;
  const res = await api("POST", "/items", { boxIndex: bi, item });
  if (res.error) { alert(res.error); return; }
  boxes = res.boxes;
  if (input) input.value = "";
  render();
}

async function removeItem(bi, ii) {
  const res = await api("DELETE", "/boxes/" + bi + "/items/" + ii);
  boxes = res.boxes;
  render();
}

// ── Search ──
async function searchItem() {
  const query = document.getElementById("search-input").value.trim();
  const result = document.getElementById("search-result");
  document.querySelectorAll(".box-card.highlight").forEach(el => el.classList.remove("highlight"));

  if (!query) { result.innerHTML = ""; return; }

  const data = await api("GET", "/search?q=" + encodeURIComponent(query));
  const found = data.results || [];

  if (found.length === 0) {
    result.innerHTML = "<div class=\"not-found\">No item matching \"<strong>" + query + "</strong>\" found.</div>";
  } else {
    const list = found.map(f => "<strong>" + f.item + "</strong> → <em>" + f.boxName + "</em>").join("<br>");
    result.innerHTML = "<div class=\"found\">" + list + "</div>";
    found.forEach(f => {
      const card = document.getElementById("box-" + f.boxIndex);
      if (card) {
        card.classList.add("highlight");
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }
}

document.getElementById("search-input").addEventListener("keydown", e => {
  if (e.key === "Enter") searchItem();
});

// ── Voice Input ──
let recognition = null;
let isListening = false;

function setupVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    document.getElementById("voice-status").textContent = "Voice not supported. Use Chrome.";
    document.getElementById("voice-btn").disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening = true;
    document.getElementById("voice-btn").classList.add("listening");
    document.getElementById("voice-btn").textContent = "🎤 Listening...";
    document.getElementById("voice-status").textContent = "Speak now...";
    document.getElementById("voice-transcript").textContent = "";
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    document.getElementById("voice-transcript").textContent = '"' + transcript + '"';
    if (event.results[event.results.length - 1].isFinal) {
      processVoiceCommand(transcript.trim().toLowerCase());
    }
  };

  recognition.onerror = (e) => {
    document.getElementById("voice-status").textContent = "Error: " + e.error;
    stopListening();
  };

  recognition.onend = () => stopListening();
}

function stopListening() {
  isListening = false;
  const btn = document.getElementById("voice-btn");
  btn.classList.remove("listening");
  btn.innerHTML = '<span class="mic-icon">🎤</span> Hold to Speak';
}

function toggleVoice() {
  if (!recognition) setupVoice();
  if (!recognition) return;
  isListening ? recognition.stop() : recognition.start();
}

// ── Free voice command processor (no paid AI/API needed) ──
async function processVoiceCommand(cmd) {
  const status = document.getElementById("voice-status");
  const command = normalizeSpeech(cmd);
  status.textContent = "Heard: " + command;

  // 1) Create box commands:
  // "create box 1", "create a new box kitchen", "new box bathroom", "make box books"
  const createMatch = command.match(/^(create|new|make|add)\s+(a\s+)?(new\s+)?box\s+(.+)$/i);
  if (createMatch) {
    const rawName = createMatch[4].trim();
    const boxName = formatBoxName(rawName);
    document.getElementById("box-name-input").value = boxName;
    await addBox();
    status.textContent = "✓ Created box \"" + boxName + "\"";
    return;
  }

  // 2) Add item commands:
  // "add scissors to box 1", "put tape and glue in kitchen", "place remote into bedroom"
  const addMatch = command.match(/^(add|put|place)\s+(.+?)\s+(to|in|into)\s+(.+)$/i);
  if (addMatch) {
    const itemsText = cleanItemText(addMatch[2]);
    const boxText = cleanBoxText(addMatch[4]);
    const bi = findBoxIndex(boxText);

    if (bi === -1) {
      status.textContent = "I couldn't find \"" + boxText + "\". Try saying: create box " + boxText;
      return;
    }

    const items = splitItems(itemsText);
    if (items.length === 0) {
      status.textContent = "I heard the box, but not the item name.";
      return;
    }

    const added = [];
    const skipped = [];
    for (const item of items) {
      const res = await api("POST", "/items", { boxIndex: bi, item });
      if (!res.error) {
        boxes = res.boxes;
        added.push(item);
      } else {
        skipped.push(item);
      }
    }

    render();
    status.textContent = added.length
      ? "✓ Added " + added.join(", ") + " to \"" + boxes[bi].name + "\""
      : "Those items may already be in that box.";
    return;
  }

  // 3) Search commands:
  // "find scissors", "where is scissors", "what box has remote", "which box has charger"
  const searchQuery = extractSearchQuery(command);
  if (searchQuery) {
    document.getElementById("search-input").value = searchQuery;
    await searchItem();
    status.textContent = "Searching for \"" + searchQuery + "\"...";
    return;
  }

  status.textContent = "Try: create box 1, add scissors to box 1, or find scissors.";
}

function normalizeSpeech(text) {
  const numberWords = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "ten": "10", "eleven": "11", "twelve": "12", "thirteen": "13", "fourteen": "14",
    "fifteen": "15", "sixteen": "16", "seventeen": "17", "eighteen": "18", "nineteen": "19", "twenty": "20"
  };

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(word => numberWords[word] || word)
    .join(" ")
    .trim();
}

function cleanItemText(text) {
  return text
    .replace(/\b(the|a|an|my)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanBoxText(text) {
  return text
    .replace(/\b(the|my)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitItems(text) {
  return text
    .replace(/\s+and\s+/g, ",")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function formatBoxName(rawName) {
  const name = rawName.trim();
  if (/^\d+$/.test(name)) return "Box " + name;
  return name.replace(/\b\w/g, c => c.toUpperCase());
}

function extractSearchQuery(command) {
  let q = command;
  const patterns = [
    /^find\s+(.+)$/,
    /^search\s+(.+)$/,
    /^search\s+for\s+(.+)$/,
    /^where\s+is\s+(.+)$/,
    /^where\s+are\s+(.+)$/,
    /^what\s+box\s+has\s+(.+)$/,
    /^which\s+box\s+has\s+(.+)$/,
    /^in\s+which\s+box\s+is\s+(.+)$/,
    /^in\s+which\s+box\s+are\s+(.+)$/
  ];

  for (const pattern of patterns) {
    const match = q.match(pattern);
    if (match) return cleanItemText(match[1]);
  }
  return "";
}

function findBoxIndex(query) {
  const q = normalizeBoxName(query);

  // First: match by real box name, e.g. "box 1" matches "Box 1"
  let idx = boxes.findIndex(b => normalizeBoxName(b.name) === q);
  if (idx !== -1) return idx;

  // Second: fuzzy name match, e.g. "kitchen" matches "Kitchen Stuff"
  idx = boxes.findIndex(b => {
    const name = normalizeBoxName(b.name);
    return name.includes(q) || q.includes(name);
  });
  if (idx !== -1) return idx;

  // Third: if user says "box 1" and no box is literally named Box 1,
  // treat it as the first displayed box.
  const numberMatch = q.match(/^box(\d+)$/);
  if (numberMatch) {
    const displayNumber = parseInt(numberMatch[1], 10);
    const possibleIndex = displayNumber - 1;
    if (possibleIndex >= 0 && possibleIndex < boxes.length) return possibleIndex;
  }

  return -1;
}

function normalizeBoxName(text) {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}
// ── Init ──
loadData();
setupVoice();