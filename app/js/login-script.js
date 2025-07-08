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
    console.error('Error message displayed:', message);
}

/**
 * Displays a success notification.
 * @param {string} message - The success message to display.
 */
function showNotification(message, type = 'success') {
    if (notificationDiv) {
        notificationDiv.textContent = message;
        notificationDiv.className = 'show ' + type; // Apply CSS classes for styling
        notificationDiv.style.display = 'block'; // Ensure it's visible

        // Set background and text color based on type
        if (type === 'success') {
            notificationDiv.style.backgroundColor = '#d4edda';
            notificationDiv.style.color = '#155724';
        } else if (type === 'error') {
            notificationDiv.style.backgroundColor = '#f8d7da';
            notificationDiv.style.color = '#721c24';
        } else { // info or default
            notificationDiv.style.backgroundColor = '#e2e3e5';
            notificationDiv.style.color = '#383d41';
        }

        console.log('Notification displayed:', message, type);

        setTimeout(() => {
            notificationDiv.className = ''; // Remove classes
            notificationDiv.style.display = 'none'; // Hide element
            notificationDiv.textContent = ''; // Clear text
            console.log('Notification hidden.');
        }, 3000);
    } else {
        console.warn("Notification div not found. Ensure an element with id='app-notification' exists.");
    }
}


// RUTA CORREGIDA: Debe ser relativa desde index.html hasta home.html
const HOME_PAGE = 'app/pages/home.html'; 

// Listener for Firebase authentication state.
// This is the primary mechanism for redirection after login/logout.
onAuthStateChanged(auth, (user) => {
    console.log('onAuthStateChanged (login-script.js): User state changed. Current user:', user ? user.uid : 'null');
    const currentPath = window.location.pathname;
    console.log('onAuthStateChanged (login-script.js): Current URL path:', currentPath);

    if (user) {
        // User is signed in.
        console.log('onAuthStateChanged (login-script.js): User is logged in. UID:', user.uid);
        // Check if the current path already includes the full path to home.html
        // This prevents unnecessary redirects if the user is already on the home page.
        if (!currentPath.includes('/app/pages/home.html')) {
            console.log('onAuthStateChanged (login-script.js): Not on home page. Redirecting to:', HOME_PAGE);
            window.location.href = HOME_PAGE;
        } else {
            console.log('onAuthStateChanged (login-script.js): Already on home page, no redirection needed.');
        }
    } else {
        // User is signed out.
        console.log('onAuthStateChanged (login-script.js): User is logged out.');
        // If the user logs out from a page within 'app/pages/', redirect them back to index.html
        if (currentPath.includes('/app/pages/')) {
            console.log('onAuthStateChanged (login-script.js): User logged out from an app page. Redirecting to index.html');
            // The path from app/pages/ to index.html is ../../index.html
            window.location.href = '../../index.html'; 
        } else {
            console.log('onAuthStateChanged (login-script.js): User logged out from index.html or another non-app page. No redirection needed.');
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
            console.log('Querying Firestore for username:', inputIdentifier);
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
            console.error("Error al buscar usuario por nombre en Firestore:", error);
            setErrorMessage('Error del servidor. Intenta de nuevo.');
            loginBtn.disabled = false;
            return;
        }
    }

    // Attempt to sign in with email and password
    try {
        console.log('Attempting Firebase signInWithEmailAndPassword for:', emailToSignIn);
        await signInWithEmailAndPassword(auth, emailToSignIn, password);
        showNotification('Inicio de sesión exitoso. Redirigiendo...', 'success');
        console.log('signInWithEmailAndPassword successful. onAuthStateChanged listener will now handle redirection.');
        // Redirection to HOME_PAGE is handled automatically by onAuthStateChanged
    } catch (error) {
        // Handle Firebase authentication errors
        console.error("Firebase Authentication Error:", error.code, error.message);
        let errorMessage = 'Usuario o contraseña incorrectos.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = 'Usuario o contraseña incorrectos.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'El formato del email es inválido.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Demasiados intentos fallidos. Intenta más tarde.';
        }
        setErrorMessage(errorMessage);
        console.log('Login failed with Firebase error code:', error.code);
    } finally {
        loginBtn.disabled = false; // Re-enable the button when finished
        console.log('Login process finished. Button re-enabled.');
    }
});

// If an initial authentication token is provided (from the Canvas environment),
// try to sign in with it. This is useful for session persistence in the
// development environment.
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
