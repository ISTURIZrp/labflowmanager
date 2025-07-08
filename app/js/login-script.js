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
const notificationDiv = document.getElementById('app-notification'); // Asegúrate de que este div exista en tu HTML si lo vas a usar

/**
 * Displays an error message in the designated div.
 * @param {string} message - The error message to display.
 */
function setErrorMessage(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block'; // Ensure the error message is visible
}

/**
 * Displays a success notification.
 * @param {string} message - The success message to display.
 */
function showNotification(message, type = 'success') {
    if (notificationDiv) {
        notificationDiv.textContent = message;
        notificationDiv.style.display = 'block';
        notificationDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da'; // Green for success, red for error
        notificationDiv.style.color = type === 'success' ? '#155724' : '#721c24';
        notificationDiv.style.padding = '10px';
        notificationDiv.style.borderRadius = '5px';
        notificationDiv.style.marginBottom = '15px'; // Add some margin
        notificationDiv.style.position = 'fixed'; // Position it fixed
        notificationDiv.style.top = '20px';
        notificationDiv.style.left = '50%';
        notificationDiv.style.transform = 'translateX(-50%)';
        notificationDiv.style.zIndex = '1000';

        setTimeout(() => {
            notificationDiv.style.display = 'none';
            notificationDiv.textContent = '';
        }, 3000); // Hide after 3 seconds
    }
}

// RUTA CORREGIDA: Debe ser relativa desde index.html hasta home.html
const HOME_PAGE = 'app/pages/home.html'; 

// Listener for Firebase authentication state.
// If the user is already logged in, redirect to the home page.
onAuthStateChanged(auth, (user) => {
    console.log('onAuthStateChanged: User state changed. User:', user);
    if (user) {
        console.log('onAuthStateChanged: User is logged in. Checking current path for redirection.');
        // Redirect only if not already on the home page to prevent infinite loops.
        const currentPath = window.location.pathname;
        console.log('onAuthStateChanged: Current path:', currentPath);

        // Check if the current path already includes the full path to home.html
        // This makes the check more robust regardless of how the page was accessed.
        if (!currentPath.includes('/app/pages/home.html')) {
            console.log('onAuthStateChanged: Not on home page. Redirecting to:', HOME_PAGE);
            window.location.href = HOME_PAGE;
        } else {
            console.log('onAuthStateChanged: Already on home page, no redirection needed.');
        }
    } else {
        console.log('onAuthStateChanged: User is logged out.');
        // If the user logs out from home.html, they should be redirected back to index.html
        const currentPath = window.location.pathname;
        // Check if currently on a page within app/pages/
        if (currentPath.includes('/app/pages/')) {
            console.log('onAuthStateChanged: User logged out from an app page. Redirecting to index.html');
            // Path from app/pages/ to index.html is ../../index.html
            window.location.href = '../../index.html'; 
        }
    }
});

// Event handler for the login form submission.
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission
    console.log('Login form submitted.');

    loginBtn.disabled = true; // Disable the button while processing the request
    setErrorMessage(''); // Clear any previous error messages
    errorMessageDiv.style.display = 'none'; // Hide error message initially

    let inputIdentifier = emailOrUsernameField.value.trim();
    const password = passwordField.value;
    let emailToSignIn = '';

    // Validate that both fields are not empty
    if (!inputIdentifier || !password) {
        setErrorMessage('Ambos campos son obligatorios.');
        loginBtn.disabled = false;
        console.log('Login failed: Missing username/email or password.');
        return;
    }

    // Determine if the input is an email or a username
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputIdentifier)) {
        // It's an email
        emailToSignIn = inputIdentifier;
        console.log('Login attempt with email:', emailToSignIn);
    } else {
        // It's a username, search for the associated email in Firestore
        console.log('Login attempt with username:', inputIdentifier);
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', inputIdentifier));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // If a user with that username is found, get their email
                emailToSignIn = querySnapshot.docs[0].data().email;
                console.log('Found user by username. Email:', emailToSignIn);
            } else {
                // If the username is not found, show an error
                setErrorMessage('Usuario o contraseña incorrectos.');
                loginBtn.disabled = false;
                console.log('Login failed: Username not found in Firestore.');
                return;
            }
        } catch (error) {
            // Handle errors in the Firestore query
            console.error("Error al buscar usuario por nombre:", error);
            setErrorMessage('Error del servidor. Intenta de nuevo.');
            loginBtn.disabled = false;
            return;
        }
    }

    // Attempt to sign in with email and password
    try {
        await signInWithEmailAndPassword(auth, emailToSignIn, password);
        showNotification('Inicio de sesión exitoso. Redirigiendo...', 'success');
        console.log('signInWithEmailAndPassword successful. onAuthStateChanged will handle redirection.');
        // Redirection to HOME_PAGE is handled automatically by onAuthStateChanged
    } catch (error) {
        // Handle Firebase authentication errors
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
        console.log('Login failed with Firebase error:', error.code);
    } finally {
        loginBtn.disabled = false; // Re-enable the button when finished
    }
});

// If an initial authentication token is provided (from the Canvas environment),
// try to sign in with it. This is useful for session persistence in the
// development environment.
if (initialAuthToken) {
    console.log('Attempting to sign in with initialAuthToken...');
    signInWithCustomToken(auth, initialAuthToken).catch((error) => {
        console.error("Error al iniciar sesión con token personalizado:", error);
        // If there's an error with the token, you can try to sign in anonymously
        // or simply let the user log in manually.
        signInAnonymously(auth).catch(anonError => console.error("Error al iniciar sesión anónimamente:", anonError));
    });
} else {
    console.log('No initialAuthToken provided. Attempting anonymous sign-in.');
    // If no initial token, you can choose to sign in anonymously
    // or simply wait for the user to log in.
    signInAnonymously(auth).catch(anonError => console.error("Error al iniciar sesión anónimamente:", anonError));
}
