// client-side chat using Firebase Realtime Database (modular SDK)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

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
const db = getDatabase();
const messagesRef = ref(db, 'messages');

// DOM
const joinSection = document.getElementById('joinSection');
const chatSection = document.getElementById('chatSection');
const nameInput = document.getElementById('nameInput');
const joinBtn = document.getElementById('joinBtn');
const messagesList = document.getElementById('messages');
const msgForm = document.getElementById('msgForm');
const msgInput = document.getElementById('msgInput');

let myName = null;

function addMessageElement(msg){
  const li = document.createElement('li');
  const meta = document.createElement('div');
  meta.className = 'meta';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'name';
  nameSpan.textContent = msg.name || 'Аноним';
  const ts = msg.ts ? new Date(msg.ts).toLocaleTimeString() : '';
  meta.append(nameSpan, ts ? ` · ${ts}` : '');

  const text = document.createElement('div');
  text.textContent = msg.text || '';

  if(msg.name === myName) li.classList.add('you');
  li.append(meta, text);
  messagesList.appendChild(li);
  messagesList.scrollTop = messagesList.scrollHeight;
}

// Listen for new messages
onChildAdded(messagesRef, (snap) => {
  const data = snap.val();
  // Firebase serverTimestamp is stored as {'.sv': 'timestamp'} when pushed,
  // but after network roundtrip the DB stores a number. We handle both.
  if (data) addMessageElement(data);
});

joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if(!name) return alert('Введите имя');
  myName = name;
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
    await push(messagesRef, {
      name: myName,
      text,
      ts: Date.now()
    });
    msgInput.value = '';
  }catch(err){
    console.error('Ошибка записи в базу:', err);
    alert('Ошибка отправки сообщения');
  }
});
