// app/js/script.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, signInAnonymously, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// **IMPORTANTE: Se está utilizando la configuración de Firebase hardcodeada que proporcionaste.**
// En un entorno de Canvas, se recomienda usar la variable global __firebase_config
// para que la configuración sea inyectada automáticamente y sea más flexible.
// Si el error "auth/invalid-api-key" persiste, verifica que esta API Key sea correcta
// en la configuración de tu proyecto de Firebase.
const firebaseConfig = {
    apiKey: "AIzaSyCxJOpBEXZUo7WrAqDTrlJV_2kJBsL8Ym0",
    authDomain: "labflow-manager.firebaseapp.com",
    projectId: "labflow-manager",
    storageBucket: "labflow-manager.firebasestorage.app",
    messagingSenderId: "742212306654",
    appId: "1:742212306654:web:a53bf890fc63cd5d05e44f",
    measurementId: "G-YVZDBCJR3B"
};

// La variable initialAuthToken sigue siendo útil para la persistencia de sesión en Canvas.
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase app and services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM element references
const pageContainer = document.getElementById('page-container');
const logoutButton = document.getElementById('logout-button');
const notificationDiv = document.getElementById('app-notification');
const userInfoBox = document.getElementById('user-info-box');
const userNameDisplay = document.getElementById('user-name-display');
const userRoleDisplay = document.getElementById('user-role-display');

/**
 * Displays a notification in the UI.
 * @param {string} message - The message to display.
 * @param {string} type - The type of notification ('info', 'success', 'error').
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
        console.warn("Notification div not found. Ensure an element with id='app-notification' exists.");
    }
}

/**
 * Fetches user data from Firestore and updates the UI.
 * @param {string} uid - The Firebase User ID.
 */
async function fetchAndDisplayUserData(uid) {
    try {
        // IMPORTANT: Adjust this Firestore path according to your actual data structure.
        // This example assumes user profiles are stored under /artifacts/{appId}/users/{userId}/profile/userProfile
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/users/${uid}/profile`, 'userProfile');

        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            userNameDisplay.textContent = userData.name || userData.username || 'Usuario';
            userRoleDisplay.textContent = userData.role || 'Rol no definido';
            console.log('User data loaded from Firestore:', userData);
        } else {
            console.log("No user profile found in Firestore for UID:", uid);
            userNameDisplay.textContent = 'Usuario Desconocido';
            userRoleDisplay.textContent = 'Sin rol';
        }
    } catch (error) {
        console.error("Error fetching user data from Firestore:", error);
        userNameDisplay.textContent = 'Error al cargar';
        userRoleDisplay.textContent = 'Error';
    }
}

// Listen for Firebase authentication state changes
onAuthStateChanged(auth, async (user) => {
    console.log('onAuthStateChanged (script.js): User state changed. Current user:', user ? user.uid : 'null');
    const currentPath = window.location.pathname;
    console.log('onAuthStateChanged (script.js): Current URL path:', currentPath);

    if (user) {
        // User is signed in.
        console.log('onAuthStateChanged (script.js): User is logged in. UID:', user.uid);
        fetchAndDisplayUserData(user.uid);

        // Make page elements visible after user data is loaded (if they were hidden by default)
        if (pageContainer) pageContainer.classList.add('visible');
        if (userInfoBox) userInfoBox.classList.add('visible');

        // Optional: Get custom claims for roles (requires server-side setup to set claims)
        // try {
        //     const idTokenResult = await user.getIdTokenResult();
        //     if (idTokenResult.claims.role) {
        //         userRoleDisplay.textContent = idTokenResult.claims.role;
        //     }
        // } catch (error) {
        //     console.warn("Could not get user role from custom claims:", error);
        // }

    } else {
        // No user is signed in. Redirect to the login page.
        console.log('onAuthStateChanged (script.js): No user logged in. Redirecting to login page.');
        // La ruta desde 'app/html/' (donde home.html está) a 'index.html' (en la raíz) es '../../index.html'
        // Asegúrate de que esta redirección solo ocurra si no estás ya en la página de login para evitar bucles.
        if (!currentPath.includes('/index.html') && !currentPath.endsWith('/')) {
             window.location.href = '../../index.html';
        }
    }
});

// Handle logout button click
async function handleLogout() {
    if (logoutButton) {
        logoutButton.disabled = true; // Disable button during logout process
    }
    showNotification('Cerrando sesión...', 'info');
    try {
        await signOut(auth);
        console.log('User signed out successfully.');
        // Redirection to index.html is handled by the onAuthStateChanged listener
    } catch (error) {
        console.error('Error signing out:', error);
        showNotification(`Error al cerrar sesión: ${error.message}`, 'error');
        if (logoutButton) {
            logoutButton.disabled = false; // Re-enable button if logout fails
        }
    }
}

// Assign click event listener to the logout button
if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
} else {
    console.warn("Logout button not found. Ensure an element with id='logout-button' exists in home.html.");
}

// Initial authentication check on page load (useful for direct access to home.html)
// This will trigger the onAuthStateChanged listener.
// If initialAuthToken is present, attempt to sign in with it for persistence.
if (initialAuthToken) {
    console.log('Attempting to sign in with initialAuthToken in script.js...');
    signInWithCustomToken(auth, initialAuthToken)
        .then(() => console.log('Signed in with custom token successfully in script.js.'))
        .catch((error) => {
            console.error("Error signing in with custom token in script.js:", error);
            // If custom token fails, try anonymous sign-in (or force login)
            signInAnonymously(auth)
                .then(() => console.log('Signed in anonymously in script.js after custom token failure.'))
                .catch(anonError => console.error("Error al iniciar sesión anónimamente:", anonError));
        });
} else {
    console.log('No initialAuthToken provided in script.js. Attempting anonymous sign-in.');
    signInAnonymously(auth)
        .then(() => console.log('Signed in anonymously.'))
        .catch(anonError => console.error("Error al iniciar sesión anónimamente:", anonError));
}
