// app/js/login-script.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// --- CAMBIO CLAVE AQUÍ ---
// Intenta usar la variable global __firebase_config proporcionada por el entorno (ej. Canvas).
// Si no está definida (por ejemplo, durante desarrollo local fuera de Canvas),
// entonces puedes proporcionar una configuración fallback si lo necesitas para pruebas.
// Para producción en Canvas, __firebase_config debería estar siempre disponible.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : {
    // Si necesitas un fallback para desarrollo local, pon tus credenciales aquí.
    // De lo contrario, puedes dejarlo vacío o con un mensaje de error si no se encuentra __firebase_config.
    // Ejemplo (QUITAR ESTO EN PRODUCCIÓN si solo usas __firebase_config):
    // apiKey: "TU_API_KEY_DEV",
    // authDomain: "TU_AUTH_DOMAIN_DEV",
    // projectId: "TU_PROJECT_ID_DEV",
    // storageBucket: "TU_STORAGE_BUCKET_DEV",
    // messagingSenderId: "TU_MESSAGING_SENDER_ID_DEV",
    // appId: "TU_APP_ID_DEV",
    // measurementId: "TU_MEASUREMENT_ID_DEV"
};
// --- FIN DEL CAMBIO CLAVE ---


const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Antes de inicializar Firebase, podemos verificar si firebaseConfig está vacío
if (Object.keys(firebaseConfig).length === 0) {
    console.error("ADVERTENCIA: firebaseConfig está vacío. Asegúrate de que __firebase_config esté disponible o proporciona una configuración fallback para desarrollo.");
    // Podrías incluso deshabilitar el botón de login aquí o mostrar un mensaje al usuario
    if (loginBtn) {
        loginBtn.disabled = true;
        setErrorMessage("Error de configuración de la aplicación. Contacta al soporte.");
    }
    // No intentes inicializar Firebase si la configuración no está disponible
    // return; // Podrías salir aquí si es un error crítico para tu app.
}


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginForm = document.getElementById('loginForm');
const emailOrUsernameField = document.getElementById('email-username-field');
const passwordField = document.getElementById('password-field');
const loginBtn = document.getElementById('login-btn');
const errorMessageDiv = document.getElementById('error-message');
const notificationDiv = document.getElementById('app-notification');

const body = document.body; // Asegúrate de que esta línea esté presente

// ... (el resto de tu código JS permanece igual) ...
