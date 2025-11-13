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
  Timestamp
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

let myName = null;

// restore saved name from localStorage so account persists across reloads
try{
  const savedName = localStorage.getItem('chatName');
  if (savedName){
    myName = savedName;
    nameInput.value = myName;
    joinSection.classList.add('hidden');
    chatSection.classList.remove('hidden');
    msgInput.focus();
    console.log('Restored chat name from localStorage:', myName);
  }
}catch(e){
  console.warn('localStorage unavailable:', e);
}

function addMessageElement(msg){
  const li = document.createElement('li');
  const meta = document.createElement('div');
  meta.className = 'meta';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'name';
  nameSpan.textContent = msg.name || 'Аноним';
  let ts = '';
  if (msg.ts) {
    // Firestore Timestamp has toMillis(); serverTimestamp may arrive as a Timestamp
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

  if(msg.name === myName) li.classList.add('you');
  li.append(meta, text);
  messagesList.appendChild(li);
  messagesList.scrollTop = messagesList.scrollHeight;
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
  msgInput.focus();
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
