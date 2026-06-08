// BoxTracker Firebase version
// Data is saved online in Firebase Firestore.
// Deleted items are also saved in Firestore under deletedItems.

// ── Firebase setup ──
// Replace this with your own Firebase config from Firebase Console.
const firebaseConfig = {
 apiKey: "AIzaSyD2iUh608ux0IIBTnic9EanY9T35ZKAF4Q",
 authDomain: "box-tracker-fa529.firebaseapp.com",
 projectId: "box-tracker-fa529",
 storageBucket: "box-tracker-fa529.firebasestorage.app",
 messagingSenderId: "401584509548",
 appId: "1:401584509548:web:debb47ebac0d5e3f5f7e49",
 measurementId: "G-D2N0XW132P"
};


firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

// Firestore location:
// Collection: boxTracker
// Document: mainData
const DATA_DOC = db.collection("boxTracker").doc("mainData");

// ── State ──
let boxes = [];
let deletedItems = [];

const COLORS = [
  "#c05c2e",
  "#2d6a4f",
  "#1d4e89",
  "#6b3fa0",
  "#c0862e",
  "#c02e5c",
  "#2e7da8"
];

let colorIndex = 0;

// ── Firebase storage helpers ──
async function loadData() {
  try {
    const doc = await DATA_DOC.get();

    if (doc.exists) {
      const data = doc.data();

      boxes = Array.isArray(data.boxes) ? data.boxes : [];
      deletedItems = Array.isArray(data.deletedItems) ? data.deletedItems : [];
    } else {
      boxes = [];
      deletedItems = [];
      await saveData();
    }
  } catch (error) {
    console.error("Could not load data from Firebase:", error);
    alert("Could not load data from Firebase. Check your Firebase setup.");
    boxes = [];
    deletedItems = [];
  }

  colorIndex = boxes.length;
  render();
}

async function saveData() {
  try {
    await DATA_DOC.set({
      boxes: boxes,
      deletedItems: deletedItems,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Could not save data to Firebase:", error);
    alert("Could not save data to Firebase. Check your internet, Firebase config, and Firestore rules.");
  }
}

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
  inp.addEventListener("keydown", event => {
    if (event.key === "Enter") addItemToBox(bi, inp.value, inp);
  });

  const addBtn = document.createElement("button");
  addBtn.textContent = "+ Add";
  addBtn.onclick = () => addItemToBox(bi, inp.value, inp);

  addRow.append(inp, addBtn);
  card.append(header, itemsDiv, addRow);

  return card;
}

// ── Box and item actions ──
function addBox() {
  const nameInp = document.getElementById("box-name-input");
  const colorInp = document.getElementById("box-color-input");

  const name = nameInp.value.trim();

  if (!name) {
    nameInp.focus();
    return;
  }

  const typedColor = colorInp.value.trim();
  const color = typedColor || COLORS[colorIndex % COLORS.length];
  colorIndex++;

  boxes.push({ name, color, items: [] });

  saveData();
  render();

  nameInp.value = "";
  colorInp.value = "";
}

function deleteBox(bi) {
  if (!boxes[bi]) return;

  if (!confirm("Delete \"" + boxes[bi].name + "\" and all its items?")) return;

  // Save deleted box items into deletedItems before deleting the box
  const boxBeingDeleted = boxes[bi];

  boxBeingDeleted.items.forEach(item => {
    deletedItems.push({
      item: item,
      boxName: boxBeingDeleted.name,
      deletedAt: new Date().toISOString(),
      deleteType: "box_deleted"
    });
  });

  boxes.splice(bi, 1);

  saveData();
  render();
}

function addItemToBox(bi, value, input) {
  if (!boxes[bi]) return;

  const item = value.trim().toLowerCase();
  if (!item) return;

  if (boxes[bi].items.includes(item)) {
    alert("Item already in this box");
    return;
  }

  boxes[bi].items.push(item);

  saveData();
  render();

  if (input) input.value = "";
}

function removeItem(bi, ii) {
  if (!boxes[bi] || !boxes[bi].items[ii]) return;

  const deletedItem = {
    item: boxes[bi].items[ii],
    boxName: boxes[bi].name,
    deletedAt: new Date().toISOString(),
    deleteType: "item_deleted"
  };

  // Keep record of deleted item in Firebase
  deletedItems.push(deletedItem);

  // Remove item from active box
  boxes[bi].items.splice(ii, 1);

  saveData();
  render();
}

// ── Search ──
function searchItem() {
  const query = document.getElementById("search-input").value.trim().toLowerCase();
  const result = document.getElementById("search-result");

  document
    .querySelectorAll(".box-card.highlight")
    .forEach(el => el.classList.remove("highlight"));

  if (!query) {
    result.innerHTML = "";
    return;
  }

  const found = [];

  boxes.forEach((box, bi) => {
    box.items.forEach(item => {
      if (item.toLowerCase().includes(query)) {
        found.push({ boxIndex: bi, boxName: box.name, item });
      }
    });
  });

  if (found.length === 0) {
    result.innerHTML =
      "<div class=\"not-found\">No item matching \"<strong>" +
      escapeHtml(query) +
      "</strong>\" found.</div>";
  } else {
    const list = found
      .map(f => "<strong>" + escapeHtml(f.item) + "</strong> → <em>" + escapeHtml(f.boxName) + "</em>")
      .join("<br>");

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

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

document.getElementById("search-input").addEventListener("keydown", event => {
  if (event.key === "Enter") searchItem();
});

// ── Voice input ──
let recognition = null;
let isListening = false;

function setupVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    document.getElementById("voice-status").textContent =
      "Voice not supported here. Try Chrome. Typed search still works.";
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

  recognition.onresult = event => {
    let transcript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    document.getElementById("voice-transcript").textContent = "\"" + transcript + "\"";

    if (event.results[event.results.length - 1].isFinal) {
      processVoiceCommand(transcript.trim().toLowerCase());
    }
  };

  recognition.onerror = event => {
    document.getElementById("voice-status").textContent = "Voice error: " + event.error;
    stopListening();
  };

  recognition.onend = () => stopListening();
}

function stopListening() {
  isListening = false;

  const btn = document.getElementById("voice-btn");
  btn.classList.remove("listening");
  btn.innerHTML = '<span class="mic-icon">🎤</span> Tap to Speak';
}

function toggleVoice() {
  if (!recognition) setupVoice();
  if (!recognition) return;

  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

// ── Voice command processor ──
function processVoiceCommand(cmd) {
  const status = document.getElementById("voice-status");
  const command = normalizeSpeech(cmd);

  status.textContent = "Heard: " + command;

  // Create box:
  // "create box 1", "create box number two", "new box bathroom"
  const createMatch = command.match(/^(create|new|make|add)\s+(a\s+)?(new\s+)?box\s+(.+)$/i);

  if (createMatch) {
    let rawName = createMatch[4].trim();

    rawName = rawName
      .replace(/^number\s+/, "")
      .replace(/^no\s+/, "")
      .trim();

    const boxName = formatBoxName(rawName);

    document.getElementById("box-name-input").value = boxName;
    addBox();

    status.textContent = "✓ Created box \"" + boxName + "\"";
    return;
  }

  // Add item:
  // "add scissors to box 1", "add bottles to box number two"
  const addMatch = command.match(/^(add|put|place)\s+(.+?)\s+(to|in|into)\s+(.+)$/i);

  if (addMatch) {
    const itemsText = cleanItemText(addMatch[2]);
    const boxText = cleanBoxText(addMatch[4]);
    const bi = findBoxIndex(boxText);

    if (bi === -1) {
      status.textContent =
        "I couldn't find \"" + boxText + "\". Try saying: create box " + boxText;
      return;
    }

    const items = splitItems(itemsText);

    if (items.length === 0) {
      status.textContent = "I heard the box, but not the item name.";
      return;
    }

    const added = [];

    for (const item of items) {
      if (!boxes[bi].items.includes(item)) {
        boxes[bi].items.push(item);
        added.push(item);
      }
    }

    saveData();
    render();

    if (added.length > 0) {
      status.textContent = "✓ Added " + added.join(", ") + " to \"" + boxes[bi].name + "\"";
    } else {
      status.textContent = "Those items may already be in that box.";
    }

    return;
  }

  // Search:
  // "find scissors", "where is scissors", "what box has remote"
  const searchQuery = extractSearchQuery(command);

  if (searchQuery) {
    document.getElementById("search-input").value = searchQuery;
    searchItem();

    status.textContent = "Searching for \"" + searchQuery + "\"...";
    return;
  }

  status.textContent = "Try: create box 1, add scissors to box 1, or find scissors.";
}

// ── Voice helper functions ──
function normalizeSpeech(text) {
  const numberWords = {
    zero: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    eleven: "11",
    twelve: "12",
    thirteen: "13",
    fourteen: "14",
    fifteen: "15",
    sixteen: "16",
    seventeen: "17",
    eighteen: "18",
    nineteen: "19",
    twenty: "20"
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
    .replace(/\bbox\s+number\b/g, "box")
    .replace(/\bbox\s+no\b/g, "box")
    .replace(/\bnumber\b/g, "")
    .replace(/\bno\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitItems(text) {
  return text
    .replace(/\s+and\s+/g, ",")
    .split(",")
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
}

function formatBoxName(rawName) {
  const name = rawName.trim();

  if (/^\d+$/.test(name)) {
    return "Box " + name;
  }

  return name.replace(/\b\w/g, c => c.toUpperCase());
}

function extractSearchQuery(command) {
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
    const match = command.match(pattern);

    if (match) {
      return cleanItemText(match[1]);
    }
  }

  return "";
}

function findBoxIndex(query) {
  const q = normalizeBoxName(query);

  // Exact match: "box 2" matches "Box 2"
  let idx = boxes.findIndex(box => normalizeBoxName(box.name) === q);

  if (idx !== -1) return idx;

  // Fuzzy match: "kitchen" matches "Kitchen Stuff"
  idx = boxes.findIndex(box => {
    const name = normalizeBoxName(box.name);
    return name.includes(q) || q.includes(name);
  });

  if (idx !== -1) return idx;

  // Number fallback: "box 2" means second displayed box
  const numberMatch = q.match(/^(?:box|boxnumber|number)?(\d+)$/);

  if (numberMatch) {
    const displayNumber = parseInt(numberMatch[1], 10);
    const possibleIndex = displayNumber - 1;

    if (possibleIndex >= 0 && possibleIndex < boxes.length) {
      return possibleIndex;
    }
  }

  return -1;
}

function normalizeBoxName(text) {
  return text
    .toLowerCase()
    .replace(/\bbox\s+number\s+/g, "box ")
    .replace(/\bbox\s+no\s+/g, "box ")
    .replace(/\bnumber\s+/g, "")
    .replace(/\bno\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// ── PWA service worker ──
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(error => {
      console.log("Service worker registration failed:", error);
    });
  });
}

// ── Init ──
loadData();
setupVoice();