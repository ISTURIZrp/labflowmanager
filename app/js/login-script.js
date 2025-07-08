// app/js/login-script.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Use the global variables provided by the Canvas environment
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
const notificationDiv = document.getElementById('app-notification'); // Asegúrate de que este div exista en tu HTML

/**
 * Displays an error message in the designated div below the form.
 * @param {string} message - The error message to display.
 */
function setErrorMessage(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block'; // Ensure the error message is visible
    console.error('Error message displayed below form:', message);
}

/**
 * Displays a temporary notification at the top of the screen.
 * @param {string} message - The message to display.
 * @param {string} type - The type of notification ('success', 'error', 'info').
 */
function showNotification(message, type = 'info') {
    if (notificationDiv) {
        notificationDiv.textContent = message;
        // Basic styling for the notification
        notificationDiv.style.padding = '10px 20px';
        notificationDiv.style.borderRadius = '8px';
        notificationDiv.style.position = 'fixed';
        notificationDiv.style.top = '20px';
        notificationDiv.style.left = '50%';
        notificationDiv.style.transform = 'translateX(-50%)';
        notificationDiv.style.zIndex = '1000';
        notificationDiv.style.textAlign = 'center';
        notificationDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        notificationDiv.style.fontWeight = 'bold';
        notificationDiv.style.opacity = '0'; // Start hidden for fade-in
        notificationDiv.style.transition = 'opacity 0.3s ease-in-out';

        if (type === 'success') {
            notificationDiv.style.backgroundColor = '#d4edda'; // Light green
            notificationDiv.style.color = '#155724'; // Dark green text
        } else if (type === 'error') {
            notificationDiv.style.backgroundColor = '#f8d7da'; // Light red
            notificationDiv.style.color = '#721c24'; // Dark red text
        } else { // info or default
            notificationDiv.style.backgroundColor = '#e2e3e5'; // Light grey
            notificationDiv.style.color = '#383d41'; // Dark grey text
        }

        notificationDiv.style.display = 'block'; // Make it visible
        setTimeout(() => {
            notificationDiv.style.opacity = '1'; // Fade in
        }, 10); // Small delay to allow display:block to apply

        console.log('Temporary notification displayed:', message, type);

        setTimeout(() => {
            notificationDiv.style.opacity = '0'; // Fade out
            setTimeout(() => {
                notificationDiv.style.display = 'none'; // Hide after fade out
                notificationDiv.textContent = ''; // Clear text
                console.log('Temporary notification hidden.');
            }, 300); // Wait for fade out transition
        }, 3000); // Notification visible for 3 seconds
    } else {
        console.warn("Notification div not found. Ensure an element with id='app-notification' exists in index.html.");
    }
}


// RUTA: Debe ser relativa desde index.html hasta home.html
const HOME_PAGE = 'app/pages/home.html'; 

// Listener para el estado de autenticación de Firebase.
// Este es el mecanismo principal para la redirección después del inicio/cierre de sesión.
onAuthStateChanged(auth, (user) => {
    console.log('onAuthStateChanged (login-script.js): User state changed. Current user:', user ? user.uid : 'null');
    const currentPath = window.location.pathname;
    console.log('onAuthStateChanged (login-script.js): Current URL path:', currentPath);

    if (user) {
        // Usuario ha iniciado sesión.
        console.log('onAuthStateChanged (login-script.js): User is logged in. UID:', user.uid);
        // Comprueba si la ruta actual ya incluye la ruta completa a home.html
        // Esto evita redirecciones innecesarias si el usuario ya está en la página de inicio.
        if (!currentPath.includes('/app/pages/home.html')) {
            console.log('onAuthStateChanged (login-script.js): Not on home page. Redirecting to:', HOME_PAGE);
            window.location.href = HOME_PAGE;
        } else {
            console.log('onAuthStateChanged (login-script.js): Already on home page, no redirection needed.');
        }
    } else {
        // No hay usuario logueado.
        console.log('onAuthStateChanged (login-script.js): User is logged out.');
        // Si el usuario cierra sesión desde una página dentro de 'app/pages/', redirígelo a index.html
        if (currentPath.includes('/app/pages/')) {
            console.log('onAuthStateChanged (login-script.js): User logged out from an app page. Redirecting to index.html');
            // La ruta desde app/pages/ a index.html es ../../index.html
            window.location.href = '../../index.html'; 
        } else {
            console.log('onAuthStateChanged (login-script.js): User logged out from index.html or another non-app page. No redirection needed.');
        }
    }
});

// Manejador del evento submit del formulario de login.
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Previene el envío por defecto del formulario
    console.log('Login form submitted.');

    loginBtn.disabled = true; // Deshabilita el botón mientras se procesa la solicitud
    setErrorMessage(''); // Limpia cualquier mensaje de error previo del div
    errorMessageDiv.style.display = 'none'; // Oculta el div de error inicialmente

    let inputIdentifier = emailOrUsernameField.value.trim();
    const password = passwordField.value;
    let emailToSignIn = '';

    // Valida que ambos campos no estén vacíos
    if (!inputIdentifier || !password) {
        const msg = 'Ambos campos son obligatorios.';
        setErrorMessage(msg); // Muestra el error debajo del formulario
        showNotification(msg, 'error'); // Muestra una notificación temporal
        loginBtn.disabled = false;
        console.log('Login failed: Missing username/email or password.');
        return;
    }

    // Determina si el input es un email o un nombre de usuario
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputIdentifier)) {
        // Es un email
        emailToSignIn = inputIdentifier;
        console.log('Login attempt with email:', emailToSignIn);
    } else {
        // Es un nombre de usuario, busca el email asociado en Firestore
        console.log('Login attempt with username:', inputIdentifier);
        try {
            console.log('Querying Firestore for username:', inputIdentifier);
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', inputIdentifier));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Si se encuentra un usuario con ese nombre de usuario, obtener su email
                emailToSignIn = querySnapshot.docs[0].data().email;
                console.log('Found user by username. Email:', emailToSignIn);
            } else {
                // Si no se encuentra el nombre de usuario, muestra error
                const msg = 'Usuario o contraseña incorrectos.';
                setErrorMessage(msg);
                showNotification(msg, 'error');
                loginBtn.disabled = false;
                console.log('Login failed: Username not found in Firestore.');
                return;
            }
        } catch (error) {
            // Manejo de errores en la consulta a Firestore
            console.error("Error al buscar usuario por nombre en Firestore:", error);
            const msg = 'Error del servidor. Intenta de nuevo.';
            setErrorMessage(msg);
            showNotification(msg, 'error');
            loginBtn.disabled = false;
            return;
        }
    }

    // Intenta iniciar sesión con el email y la contraseña
    try {
        console.log('Attempting Firebase signInWithEmailAndPassword for:', emailToSignIn);
        await signInWithEmailAndPassword(auth, emailToSignIn, password);
        showNotification('Inicio de sesión exitoso. Redirigiendo...', 'success'); // Notificación de éxito
        console.log('signInWithEmailAndPassword successful. onAuthStateChanged listener will now handle redirection.');
        // La redirección a HOME_PAGE se maneja automáticamente por el onAuthStateChanged
    } catch (error) {
        // Manejo de errores de autenticación de Firebase
        console.error("Firebase Authentication Error:", error.code, error.message);
        let errorMessage = 'Usuario o contraseña incorrectos.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = 'Usuario o contraseña incorrectos.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'El formato del email es inválido.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Demasiados intentos fallidos. Intenta más tarde.';
        }
        setErrorMessage(errorMessage); // Muestra el error debajo del formulario
        showNotification(errorMessage, 'error'); // Muestra una notificación temporal
        console.log('Login failed with Firebase error code:', error.code);
    } finally {
        loginBtn.disabled = false; // Vuelve a habilitar el botón al finalizar
        console.log('Login process finished. Button re-enabled.');
    }
});

// Si se proporciona un token de autenticación inicial (desde el entorno Canvas),
// intenta iniciar sesión con él. Esto es útil para la persistencia de la sesión
// en el entorno de desarrollo.
if (initialAuthToken) {
    console.log('Attempting to sign in with initialAuthToken...');
    signInWithCustomToken(auth, initialAuthToken)
        .then(() => console.log('Signed in with custom token successfully.'))
        .catch((error) => {
            console.error("Error al iniciar sesión con token personalizado:", error);
            // If custom token fails, try anonymous sign-in (or force login)
            signInAnonymously(auth)
                .then(() => console.log('Signed in anonymously after custom token failure.'))
                .catch(anonError => console.error("Error al iniciar sesión anónimamente:", anonError));
        });
} else {
    console.log('No initialAuthToken provided. Attempting anonymous sign-in.');
    signInAnonymously(auth)
        .then(() => console.log('Signed in anonymously.'))
        .catch(anonError => console.error("Error al iniciar sesión anónimamente:", anonError));
}
