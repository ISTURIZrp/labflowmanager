// app/js/login-script.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// **IMPORTANTE**: Para que la aplicación funcione en el entorno de Canvas,
// debes usar las variables globales __firebase_config y __initial_auth_token
// proporcionadas por el entorno, en lugar de definir firebaseConfig directamente.
// Esto asegura que tu aplicación se conecte correctamente a Firebase.

// const firebaseConfig = {
//   apiKey: "AIzaSyCxJOpBEXZUo7WrAqDTrlJV_2kJBsL8Ym0",
//   authDomain: "labflow-manager.firebaseapp.com",
//   projectId: "labflow-manager",
//   storageBucket: "labflow-manager.firebasestorage.app",
//   messagingSenderId: "742212306654",
//   appId: "1:742212306654:web:a53bf890fc63cd5d05e44f",
//   measurementId: "G-YVZDBCJR3B"
// };

// Usa las variables globales proporcionadas por el entorno de Canvas
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginForm = document.getElementById('loginForm');
const emailOrUsernameField = document.getElementById('email-username-field');
const passwordField = document.getElementById('password-field');
const loginBtn = document.getElementById('login-btn');
const errorMessageDiv = document.getElementById('error-message');
const notificationDiv = document.getElementById('app-notification'); // Asegúrate de que este div exista en tu HTML si lo vas a usar

/**
 * Muestra un mensaje de error en el div designado.
 * @param {string} message - El mensaje de error a mostrar.
 */
function setErrorMessage(message) {
    errorMessageDiv.textContent = message;
}

const HOME_PAGE = 'home.html'; // Define la página a la que redirigir tras el login

// Listener para el estado de autenticación de Firebase.
// Si el usuario ya está logueado, redirige a la página de inicio.
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Redirige solo si no estamos ya en la página de inicio para evitar bucles.
        if (!window.location.href.includes(HOME_PAGE)) {
            window.location.href = HOME_PAGE;
        }
    }
});

// Manejador del evento submit del formulario de login.
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Previene el envío por defecto del formulario

    loginBtn.disabled = true; // Deshabilita el botón mientras se procesa la solicitud
    setErrorMessage(''); // Limpia cualquier mensaje de error previo

    let inputIdentifier = emailOrUsernameField.value.trim();
    const password = passwordField.value;
    let emailToSignIn = '';

    // Validar que ambos campos no estén vacíos
    if (!inputIdentifier || !password) {
        setErrorMessage('Ambos campos son obligatorios.');
        loginBtn.disabled = false;
        return;
    }

    // Determinar si el input es un email o un nombre de usuario
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputIdentifier)) {
        // Es un email
        emailToSignIn = inputIdentifier;
    } else {
        // Es un nombre de usuario, buscar el email asociado en Firestore
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', inputIdentifier));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Si se encuentra un usuario con ese nombre de usuario, obtener su email
                emailToSignIn = querySnapshot.docs[0].data().email;
            } else {
                // Si no se encuentra el nombre de usuario, mostrar error
                setErrorMessage('Usuario o contraseña incorrectos.');
                loginBtn.disabled = false;
                return;
            }
        } catch (error) {
            // Manejo de errores en la consulta a Firestore
            console.error("Error al buscar usuario por nombre:", error);
            setErrorMessage('Error del servidor. Intenta de nuevo.');
            loginBtn.disabled = false;
            return;
        }
    }

    // Intentar iniciar sesión con el email y la contraseña
    try {
        await signInWithEmailAndPassword(auth, emailToSignIn, password);
        // La redirección a HOME_PAGE se maneja automáticamente por el onAuthStateChanged
    } catch (error) {
        // Manejo de errores de autenticación de Firebase
        console.error("Error de autenticación:", error.code, error.message);
        let errorMessage = 'Usuario o contraseña incorrectos.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Usuario o contraseña incorrectos.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'El formato del email es inválido.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Demasiados intentos fallidos. Intenta más tarde.';
        }
        setErrorMessage(errorMessage);
    } finally {
        loginBtn.disabled = false; // Vuelve a habilitar el botón al finalizar
    }
});

// Si se proporciona un token de autenticación inicial (desde el entorno Canvas),
// intenta iniciar sesión con él. Esto es útil para la persistencia de la sesión
// en el entorno de desarrollo.
if (initialAuthToken) {
    signInWithCustomToken(auth, initialAuthToken).catch((error) => {
        console.error("Error al iniciar sesión con token personalizado:", error);
        // Si hay un error con el token, se puede intentar iniciar sesión anónimamente
        // o simplemente dejar que el usuario se loguee manualmente.
        // signInAnonymously(auth).catch(anonError => console.error("Error al iniciar sesión anónimamente:", anonError));
    });
} else {
    // Si no hay token inicial, se puede optar por iniciar sesión anónimamente
    // o simplemente esperar a que el usuario se loguee.
    // signInAnonymously(auth).catch(anonError => console.error("Error al iniciar sesión anónimamente:", anonError));
}

// Nota: La función showMessage del script anterior fue reemplazada por setErrorMessage
// y el div 'messageBox' fue reemplazado por 'error-message' para alinearse con tu código.
// Si necesitas notificaciones de éxito o de otro tipo, puedes expandir la función setErrorMessage
// o crear una nueva función para manejar 'app-notification'.
