'use client';

import { useEffect, useRef, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

const COLORS = [
  '#c05c2e',
  '#2d6a4f',
  '#1d4e89',
  '#6b3fa0',
  '#c0862e',
  '#c02e5c',
  '#2e7da8'
];

function getFirebaseConfig() {
  return process.env.NEXT_PUBLIC_FIREBASE_CONFIG ? JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG) : {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  }
}

function initFirebase() {
  const firebaseConfig = getFirebaseConfig();

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error('Missing Firebase setup. Check your .env.local file.');
  }

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);

  return doc(db, 'boxTracker', 'mainData');
}

function normalizeSpeech(text) {
  const numberWords = {
    zero: '0',
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
    eleven: '11',
    twelve: '12',
    thirteen: '13',
    fourteen: '14',
    fifteen: '15',
    sixteen: '16',
    seventeen: '17',
    eighteen: '18',
    nineteen: '19',
    twenty: '20'
  };

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(word => numberWords[word] || word)
    .join(' ')
    .trim();
}

function cleanItemText(text) {
  return text
    .replace(/\b(the|a|an|my)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanBoxText(text) {
  return text
    .replace(/\b(the|my)\b/g, ' ')
    .replace(/\bbox\s+number\b/g, 'box')
    .replace(/\bbox\s+no\b/g, 'box')
    .replace(/\bnumber\b/g, '')
    .replace(/\bno\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitItems(text) {
  return text
    .replace(/\s+and\s+/g, ',')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
}

function formatBoxName(rawName) {
  const name = rawName.trim();

  if (/^\d+$/.test(name)) {
    return 'Box ' + name;
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

  return '';
}

function normalizeBoxName(text) {
  return text
    .toLowerCase()
    .replace(/\bbox\s+number\s+/g, 'box ')
    .replace(/\bbox\s+no\s+/g, 'box ')
    .replace(/\bnumber\s+/g, '')
    .replace(/\bno\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function findBoxIndex(boxes, query) {
  const q = normalizeBoxName(query);

  let idx = boxes.findIndex(box => normalizeBoxName(box.name) === q);

  if (idx !== -1) return idx;

  idx = boxes.findIndex(box => {
    const name = normalizeBoxName(box.name);
    return name.includes(q) || q.includes(name);
  });

  if (idx !== -1) return idx;

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

export default function Home() {
  const [boxes, setBoxes] = useState([]);
  const [deletedItems, setDeletedItems] = useState([]);
  const [boxName, setBoxName] = useState('');
  const [boxColor, setBoxColor] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [notFoundQuery, setNotFoundQuery] = useState('');
  const [highlightedBoxes, setHighlightedBoxes] = useState([]);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef(null);
  const dataDocRef = useRef(null);
  const boxesRef = useRef([]);
  const deletedItemsRef = useRef([]);
  const colorIndexRef = useRef(0);

  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  useEffect(() => {
    deletedItemsRef.current = deletedItems;
  }, [deletedItems]);

  useEffect(() => {
    async function loadData() {
      try {
        dataDocRef.current = initFirebase();
        const snap = await getDoc(dataDocRef.current);

        if (snap.exists()) {
          const data = snap.data();
          const loadedBoxes = Array.isArray(data.boxes) ? data.boxes : [];
          const loadedDeletedItems = Array.isArray(data.deletedItems) ? data.deletedItems : [];

          setBoxes(loadedBoxes);
          setDeletedItems(loadedDeletedItems);
          colorIndexRef.current = loadedBoxes.length;
        } else {
          await saveData([], []);
        }
      } catch (error) {
        console.error('Could not load data from Firebase:', error);
        alert('Could not load data from Firebase. Check your Firebase setup.');
        setBoxes([]);
        setDeletedItems([]);
      }
    }

    loadData();
    setupVoice();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(error => {
          console.log('Service worker registration failed:', error);
        });
      });
    }
  }, []);

  async function saveData(nextBoxes = boxesRef.current, nextDeletedItems = deletedItemsRef.current) {
    try {
      if (!dataDocRef.current) return;

      await setDoc(dataDocRef.current, {
        boxes: nextBoxes,
        deletedItems: nextDeletedItems,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Could not save data to Firebase:', error);
      alert('Could not save data to Firebase. Check your internet, Firebase config, and Firestore rules.');
    }
  }

  function addBox(customName) {
    const name = (customName ?? boxName).trim();

    if (!name) return;

    const typedColor = boxColor.trim();
    const color = typedColor || COLORS[colorIndexRef.current % COLORS.length];
    colorIndexRef.current += 1;

    const nextBoxes = [...boxesRef.current, { name, color, items: [] }];
    setBoxes(nextBoxes);
    boxesRef.current = nextBoxes;
    saveData(nextBoxes, deletedItemsRef.current);

    setBoxName('');
    setBoxColor('');
  }

  function deleteBox(bi) {
    const currentBoxes = boxesRef.current;
    if (!currentBoxes[bi]) return;

    if (!confirm('Delete "' + currentBoxes[bi].name + '" and all its items?')) return;

    const boxBeingDeleted = currentBoxes[bi];
    const deletedFromBox = boxBeingDeleted.items.map(item => ({
      item: item,
      boxName: boxBeingDeleted.name,
      deletedAt: new Date().toISOString(),
      deleteType: 'box_deleted'
    }));

    const nextDeletedItems = [...deletedItemsRef.current, ...deletedFromBox];
    const nextBoxes = currentBoxes.filter((_, index) => index !== bi);

    setDeletedItems(nextDeletedItems);
    setBoxes(nextBoxes);
    deletedItemsRef.current = nextDeletedItems;
    boxesRef.current = nextBoxes;
    saveData(nextBoxes, nextDeletedItems);
  }

  function addItemToBox(bi, value) {
    const currentBoxes = boxesRef.current;
    if (!currentBoxes[bi]) return;

    const item = value.trim().toLowerCase();
    if (!item) return;

    if (currentBoxes[bi].items.includes(item)) {
      alert('Item already in this box');
      return;
    }

    const nextBoxes = currentBoxes.map((box, index) => {
      if (index !== bi) return box;
      return { ...box, items: [...box.items, item] };
    });

    setBoxes(nextBoxes);
    boxesRef.current = nextBoxes;
    saveData(nextBoxes, deletedItemsRef.current);
  }

  function removeItem(bi, ii) {
    const currentBoxes = boxesRef.current;
    if (!currentBoxes[bi] || !currentBoxes[bi].items[ii]) return;

    const deletedItem = {
      item: currentBoxes[bi].items[ii],
      boxName: currentBoxes[bi].name,
      deletedAt: new Date().toISOString(),
      deleteType: 'item_deleted'
    };

    const nextDeletedItems = [...deletedItemsRef.current, deletedItem];
    const nextBoxes = currentBoxes.map((box, boxIndex) => {
      if (boxIndex !== bi) return box;
      return { ...box, items: box.items.filter((_, itemIndex) => itemIndex !== ii) };
    });

    setDeletedItems(nextDeletedItems);
    setBoxes(nextBoxes);
    deletedItemsRef.current = nextDeletedItems;
    boxesRef.current = nextBoxes;
    saveData(nextBoxes, nextDeletedItems);
  }

  function searchItem(customQuery) {
    const query = (customQuery ?? searchInput).trim().toLowerCase();
    setHighlightedBoxes([]);
    setSearchResults([]);
    setNotFoundQuery('');

    if (!query) return;

    const found = [];

    boxesRef.current.forEach((box, bi) => {
      box.items.forEach(item => {
        if (item.toLowerCase().includes(query)) {
          found.push({ boxIndex: bi, boxName: box.name, item });
        }
      });
    });

    if (found.length === 0) {
      setNotFoundQuery(query);
    } else {
      setSearchResults(found);
      setHighlightedBoxes(found.map(f => f.boxIndex));

      setTimeout(() => {
        const card = document.getElementById('box-' + found[0].boxIndex);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
    }
  }

  function setupVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus('Voice not supported here. Try Chrome. Typed search still works.');
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('Speak now...');
      setVoiceTranscript('');
    };

    recognition.onresult = event => {
      let transcript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setVoiceTranscript('"' + transcript + '"');

      if (event.results[event.results.length - 1].isFinal) {
        processVoiceCommand(transcript.trim().toLowerCase());
      }
    };

    recognition.onerror = event => {
      setVoiceStatus('Voice error: ' + event.error);
      stopListening();
    };

    recognition.onend = () => stopListening();
    recognitionRef.current = recognition;
  }

  function stopListening() {
    setIsListening(false);
  }

  function toggleVoice() {
    if (!recognitionRef.current) setupVoice();
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  }

  function processVoiceCommand(cmd) {
    const command = normalizeSpeech(cmd);

    setVoiceStatus('Heard: ' + command);

    const createMatch = command.match(/^(create|new|make|add)\s+(a\s+)?(new\s+)?box\s+(.+)$/i);

    if (createMatch) {
      let rawName = createMatch[4].trim();

      rawName = rawName
        .replace(/^number\s+/, '')
        .replace(/^no\s+/, '')
        .trim();

      const name = formatBoxName(rawName);
      addBox(name);
      setVoiceStatus('✓ Created box "' + name + '"');
      return;
    }

    const addMatch = command.match(/^(add|put|place)\s+(.+?)\s+(to|in|into)\s+(.+)$/i);

    if (addMatch) {
      const itemsText = cleanItemText(addMatch[2]);
      const boxText = cleanBoxText(addMatch[4]);
      const bi = findBoxIndex(boxesRef.current, boxText);

      if (bi === -1) {
        setVoiceStatus('I couldn\'t find "' + boxText + '". Try saying: create box ' + boxText);
        return;
      }

      const items = splitItems(itemsText);

      if (items.length === 0) {
        setVoiceStatus('I heard the box, but not the item name.');
        return;
      }

      const added = [];
      let nextBoxes = boxesRef.current;

      for (const item of items) {
        if (!nextBoxes[bi].items.includes(item)) {
          nextBoxes = nextBoxes.map((box, index) => {
            if (index !== bi) return box;
            return { ...box, items: [...box.items, item] };
          });
          added.push(item);
        }
      }

      setBoxes(nextBoxes);
      boxesRef.current = nextBoxes;
      saveData(nextBoxes, deletedItemsRef.current);

      if (added.length > 0) {
        setVoiceStatus('✓ Added ' + added.join(', ') + ' to "' + nextBoxes[bi].name + '"');
      } else {
        setVoiceStatus('Those items may already be in that box.');
      }

      return;
    }

    const searchQuery = extractSearchQuery(command);

    if (searchQuery) {
      setSearchInput(searchQuery);
      searchItem(searchQuery);
      setVoiceStatus('Searching for "' + searchQuery + '"...');
      return;
    }

    setVoiceStatus('Try: create box 1, add scissors to box 1, or find scissors.');
  }

  const totalItems = boxes.reduce((sum, box) => sum + box.items.length, 0);

  return (
    <>
      <header>
        <div className="logo">
          <span className="logo-icon">📦</span>
          <div>
            <h1>BoxTracker</h1>
            <p>Know exactly where everything is</p>
          </div>
        </div>
        <div className="stats">
          <div className="stat"><span id="total-boxes">{boxes.length}</span><label>Boxes</label></div>
          <div className="stat"><span id="total-items">{totalItems}</span><label>Items</label></div>
        </div>
      </header>

      <main>
        <aside className="sidebar">
          <div className="card search-card">
            <h2>Find an item</h2>
            <div className="input-row">
              <input
                type="text"
                id="search-input"
                placeholder="e.g. scissors, remote..."
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') searchItem();
                }}
              />
              <button onClick={() => searchItem()} className="btn-primary">Search</button>
            </div>
            <div id="search-result">
              {notFoundQuery && (
                <div className="not-found">No item matching "<strong>{notFoundQuery}</strong>" found.</div>
              )}
              {searchResults.length > 0 && (
                <div className="found">
                  {searchResults.map((result, index) => (
                    <div key={index}>
                      <strong>{result.item}</strong> → <em>{result.boxName}</em>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Add a new box</h2>
            <input
              type="text"
              id="box-name-input"
              placeholder="Box name, e.g. Kitchen Stuff"
              value={boxName}
              onChange={event => setBoxName(event.target.value)}
            />
            <input
              type="text"
              id="box-color-input"
              placeholder="Color label, e.g. red or #c05c2e (optional)"
              value={boxColor}
              onChange={event => setBoxColor(event.target.value)}
            />
            <button onClick={() => addBox()} className="btn-primary full-width">+ Add Box</button>
          </div>

          <div className="card voice-card">
            <h2>Voice input</h2>
            <p className="muted">Say: <em>"Create box 1"</em>, <em>"Add scissors to Box 1"</em>, or <em>"Find scissors"</em></p>
            <button
              id="voice-btn"
              onClick={toggleVoice}
              className={isListening ? 'btn-voice listening' : 'btn-voice'}
              disabled={!voiceSupported}
            >
              {isListening ? '🎤 Listening...' : <><span className="mic-icon">🎤</span> Tap to Speak</>}
            </button>
            <div id="voice-status" className="voice-status">{voiceStatus}</div>
            <div id="voice-transcript" className="voice-transcript">{voiceTranscript}</div>
          </div>
        </aside>

        <section className="boxes-section">
          <div id="boxes-grid" className="boxes-grid">
            {boxes.length === 0 && (
              <div className="empty-state" id="empty-state">
                <span>📦</span>
                <p>No boxes yet. Add your first box!</p>
              </div>
            )}

            {boxes.map((box, bi) => (
              <BoxCard
                key={bi}
                box={box}
                bi={bi}
                highlighted={highlightedBoxes.includes(bi)}
                onDeleteBox={deleteBox}
                onAddItem={addItemToBox}
                onRemoveItem={removeItem}
              />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function BoxCard({ box, bi, highlighted, onDeleteBox, onAddItem, onRemoveItem }) {
  const [itemInput, setItemInput] = useState('');

  return (
    <div className={highlighted ? 'box-card highlight' : 'box-card'} id={'box-' + bi}>
      <div className="box-header">
        <div className="box-header-left">
          <div className="box-color-dot" style={{ background: box.color || COLORS[0] }}></div>
          <span className="box-name">{box.name}</span>
        </div>
        <span className="box-count">{box.items.length + ' item' + (box.items.length !== 1 ? 's' : '')}</span>
        <button className="btn-delete-box" title="Delete box" onClick={() => onDeleteBox(bi)}>✕</button>
      </div>

      <div className="box-items">
        {box.items.length === 0 && <span className="no-items">No items yet</span>}
        {box.items.map((item, ii) => (
          <span className="item-tag" key={item + ii}>
            {item}
            <button title="Remove item" onClick={() => onRemoveItem(bi, ii)}>×</button>
          </span>
        ))}
      </div>

      <div className="box-add-row">
        <input
          type="text"
          placeholder="Add item..."
          value={itemInput}
          onChange={event => setItemInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              onAddItem(bi, itemInput);
              setItemInput('');
            }
          }}
        />
        <button
          onClick={() => {
            onAddItem(bi, itemInput);
            setItemInput('');
          }}
        >+ Add</button>
      </div>
    </div>
  );
}
