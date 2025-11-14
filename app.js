// client-side chat using Firebase Realtime Database (modular SDK)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  where,
  updateDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// --- PUT YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {

  apiKey: "AIzaSyDzWxcAWu6ScuyS1BCauWDSy3ZoBHuBDu4",

  authDomain: "brawlchatt.firebaseapp.com",

  projectId: "brawlchatt",

  storageBucket: "brawlchatt.firebasestorage.app",

  messagingSenderId: "38882622640",

  appId: "1:38882622640:web:59099d03ddc733f3450f75",

  measurementId: "G-XV8X9NNFWN"

};


initializeApp(firebaseConfig);
console.log('Firebase config:', firebaseConfig);
const db = getFirestore();
const messagesCol = collection(db, 'messages');

// DOM
const joinSection = document.getElementById('joinSection');
const chatSection = document.getElementById('chatSection');
const nameInput = document.getElementById('nameInput');
const joinBtn = document.getElementById('joinBtn');
const messagesList = document.getElementById('messages');
const msgForm = document.getElementById('msgForm');
const msgInput = document.getElementById('msgInput');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsNameInput = document.getElementById('settingsNameInput');
const updateNameBtn = document.getElementById('updateNameBtn');
const logoutBtn = document.getElementById('logoutBtn');
const avatarLarge = document.getElementById('avatarLarge');
const profileBtn = document.getElementById('profileBtn');

// Скрыть кнопку профиля изначально
profileBtn.style.display = 'none';

let myName = null;
let myAvatarColor = '#0088cc'; // default color
let myAvatarImage = null; // image data URL

// restore saved name, avatar color, and image from localStorage
try{
  const savedName = localStorage.getItem('chatName');
  const savedColor = localStorage.getItem('chatAvatarColor');
  const savedImage = localStorage.getItem('chatAvatarImage');
  if (savedName){
    myName = savedName;
    myAvatarColor = savedColor || '#0088cc';
    myAvatarImage = savedImage || null;
    nameInput.value = myName;
    joinSection.classList.add('hidden');
    chatSection.classList.remove('hidden');
    profileBtn.style.display = 'inline-block';
    msgInput.focus();
    console.log('Restored chat name from localStorage:', myName);
  }
}catch(e){
  console.warn('localStorage unavailable:', e);
}

function addMessageElement(msg){
  const isOwn = msg.name === myName;
  
  // wrapper row for message + avatar
  const msgRow = document.createElement('div');
  msgRow.className = `msg-row ${isOwn ? 'you' : 'their'}`;
  
  // avatar with first letter initial and color based on author
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  const initial = (msg.name || 'А').charAt(0).toUpperCase();
  avatar.textContent = initial;
  
  // apply image if own and image exists, otherwise use color
  if (isOwn && myAvatarImage) {
    avatar.style.backgroundImage = `url('${myAvatarImage}')`;
    avatar.style.backgroundSize = 'cover';
    avatar.style.backgroundPosition = 'center';
    avatar.textContent = ''; // hide initial
  } else if (isOwn) {
    avatar.style.background = `linear-gradient(135deg,${myAvatarColor},${lightenColor(myAvatarColor)})`;
  } else {
    // generate consistent color for other users based on their name
    const hashColor = generateColorFromName(msg.name || 'Аноним');
    avatar.style.background = `linear-gradient(135deg,${hashColor},${lightenColor(hashColor)})`;
  }
  
  // message bubble
  const bubble = document.createElement('div');
  bubble.className = isOwn ? 'you' : 'their';
  
  const meta = document.createElement('div');
  meta.className = 'meta';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'name';
  nameSpan.textContent = msg.name || 'Аноним';
  
  let ts = '';
  if (msg.ts) {
    if (typeof msg.ts.toMillis === 'function') {
      ts = new Date(msg.ts.toMillis()).toLocaleTimeString();
    } else if (typeof msg.ts === 'number') {
      ts = new Date(msg.ts).toLocaleTimeString();
    } else {
      try { ts = new Date(msg.ts).toLocaleTimeString(); } catch(e){ ts = '' }
    }
  }
  meta.append(nameSpan, ts ? ` · ${ts}` : '');
  
  const text = document.createElement('div');
  text.textContent = msg.text || '';
  
  bubble.append(meta, text);
  msgRow.append(avatar, bubble);
  messagesList.appendChild(msgRow);
  messagesList.scrollTop = messagesList.scrollHeight;
}

// Helper: generate color from name hash
function generateColorFromName(name) {
  const colors = ['#0088cc', '#00cc88', '#cc8800', '#cc0088', '#8800cc', '#00cccc'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return colors[Math.abs(hash) % colors.length];
}

// Helper: lighten color for gradient
function lightenColor(color) {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, (num >> 16) + 80);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + 80);
  const b = Math.min(255, (num & 0x0000FF) + 80);
  return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

// realtime listener (Firestore) — single source of truth, handles initial load and updates
const q = query(messagesCol, orderBy('ts'));
onSnapshot(q, (snapshot) => {
  // clear and re-render to avoid duplicates and keep order
  messagesList.innerHTML = '';
  if (snapshot.empty) {
    console.log('No messages yet');
    return;
  }
  snapshot.docs.forEach(doc => addMessageElement(doc.data()));
}, (err) => {
  console.error('Realtime listener error (Firestore):', err);
  if (err && String(err).toLowerCase().includes('permission')){
    alert('Ошибка доступа к базе: проверьте правила Firestore (permissions).');
  }
});

joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if(!name) return alert('Введите имя');
  myName = name;
  try{ localStorage.setItem('chatName', myName); }catch(e){console.warn('Could not save name to localStorage', e)}
  joinSection.classList.add('hidden');
  chatSection.classList.remove('hidden');
  profileBtn.style.display = 'inline-block';
  msgInput.focus();
});

// Profile button click handler
profileBtn.addEventListener('click', () => {
  console.log('Profile button clicked, myName:', myName);
  
  settingsNameInput.value = myName;
  avatarLarge.textContent = (myName || 'А').charAt(0).toUpperCase();
  avatarLarge.style.background = `linear-gradient(135deg,${myAvatarColor},${lightenColor(myAvatarColor)})`;
  
  // Mark active color button
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.color === myAvatarColor) {
      btn.classList.add('active');
    }
  });
  
  settingsModal.classList.remove('hidden');
  console.log('Settings modal opened');
});

// Color picker handlers
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    myAvatarColor = btn.dataset.color;
    
    // Update active button
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update avatar preview
    avatarLarge.style.background = `linear-gradient(135deg,${myAvatarColor},${lightenColor(myAvatarColor)})`;
    avatarLarge.style.backgroundImage = 'none';
    
    // Save to localStorage
    try { localStorage.setItem('chatAvatarColor', myAvatarColor); } catch(e) {}
  });
});

// Image upload handler
const avatarImageInput = document.getElementById('avatarImageInput');
const clearImageBtn = document.getElementById('clearImageBtn');

if (avatarImageInput) {
  avatarImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      myAvatarImage = event.target.result;
      try { localStorage.setItem('chatAvatarImage', myAvatarImage); } catch(e) {
        console.warn('Could not save image to localStorage (might be too large)');
      }
      
      // Update preview
      avatarLarge.style.backgroundImage = `url('${myAvatarImage}')`;
      avatarLarge.style.backgroundSize = 'cover';
      avatarLarge.style.backgroundPosition = 'center';
      avatarLarge.textContent = '';
    };
    reader.readAsDataURL(file);
  });
}

if (clearImageBtn) {
  clearImageBtn.addEventListener('click', () => {
    myAvatarImage = null;
    avatarImageInput.value = '';
    try { localStorage.removeItem('chatAvatarImage'); } catch(e) {}
    
    // Reset to color
    avatarLarge.style.backgroundImage = 'none';
    avatarLarge.textContent = (myName || 'А').charAt(0).toUpperCase();
    avatarLarge.style.background = `linear-gradient(135deg,${myAvatarColor},${lightenColor(myAvatarColor)})`;
  });
}

// Close settings modal
closeSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

updateNameBtn.addEventListener('click', async () => {
  const newName = settingsNameInput.value.trim();
  if(!newName) return alert('Введите имя');
  
  const oldName = myName;
  
  // Update all messages with old name to new name in Firestore
  if (oldName !== newName) {
    try {
      const q = query(messagesCol, where('name', '==', oldName));
      const snapshot = await getDocs(q);
      
      // Update each message
      snapshot.forEach(async (docSnap) => {
        const docRef = doc(messagesCol, docSnap.id);
        await updateDoc(docRef, { name: newName });
      });
      
      console.log(`Updated ${snapshot.size} messages from "${oldName}" to "${newName}"`);
    } catch (err) {
      console.error('Error updating messages:', err);
      alert('Ошибка при обновлении сообщений');
      return;
    }
  }
  
  myName = newName;
  try{ localStorage.setItem('chatName', myName); }catch(e){console.warn('Could not save name', e)}
  settingsModal.classList.add('hidden');
  location.reload();
});

logoutBtn.addEventListener('click', () => {
  if(!confirm('Вы уверены? Это вас выведет из аккаунта.')) return;
  try{ localStorage.removeItem('chatName'); }catch(e){}
  location.reload();
});

settingsModal.addEventListener('click', (e) => {
  if(e.target === settingsModal) closeSettings();
});

msgForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if(!myName) return alert('Сначала введите имя');
  const text = msgInput.value.trim();
  if(!text) return;
  try{
    const docRef = await addDoc(messagesCol, {
      name: myName,
      text,
      ts: serverTimestamp()
    });
    console.log('Message sent, doc id:', docRef.id);
    msgInput.value = '';
  }catch(err){
    console.error('Ошибка записи в Firestore:', err);
    alert('Ошибка отправки сообщения');
  }
});
