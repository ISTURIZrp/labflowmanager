import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
// Si necesitas Firestore o cualquier otro servicio en tus páginas de la app, impórtalos aquí también

const firebaseConfig = {
    apiKey: "AIzaSyCxJOpBEXZUo7WrAqDTrlJV_2kJBsL8Ym0",
    authDomain: "labflow-manager.firebaseapp.com",
    projectId: "labflow-manager",
    storageBucket: "labflow-manager.appspot.com",
    messagingSenderId: "742212306654",
    appId: "1:742212306654:web:a53bf890fc63cd5d05e44f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Referencias a elementos del DOM
const pageContainer = document.getElementById('page-container');
const logoutButton = document.getElementById('logout-button');
const notificationDiv = document.getElementById('app-notification');
const userInfoBox = document.getElementById('user-info-box');
const userNameDisplay = document.getElementById('user-name-display');
const userRoleDisplay = document.getElementById('user-role-display');

/**
 * Muestra una notificación en la interfaz de usuario.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - El tipo de notificación ('info', 'success', 'error').
 */
function showNotification(message, type = 'info') {
    notificationDiv.textContent = message;
    notificationDiv.className = 'show ' + type;
    // La notificación desaparecerá después de 3 segundos
    setTimeout(() => { notificationDiv.className = ''; }, 3000);
}

// Escucha los cambios en el estado de autenticación de Firebase
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Usuario ha iniciado sesión
        const displayName = user.displayName || user.email; // Muestra el nombre o el email
        let displayRole = 'Usuario'; // Rol por defecto

        // Opcional: Si necesitas el rol real (Custom Claims), puedes obtenerlo así:
        // Ten en cuenta que los Custom Claims solo se actualizan cuando el token
        // del usuario se refresca, lo que puede no ser inmediato.
        try {
            const idTokenResult = await user.getIdTokenResult();
            if (idTokenResult.claims.role) {
                displayRole = idTokenResult.claims.role;
            }
        } catch (error) {
            console.warn("No se pudo obtener el rol del usuario de los claims:", error);
        }
        
        userNameDisplay.textContent = displayName;
        userRoleDisplay.textContent = displayRole;

        // Hace visibles los elementos de la página después de cargar la info del usuario
        pageContainer.classList.add('visible');
        userInfoBox.classList.add('visible');

    } else {
        // No hay usuario logueado, redirige a la página de inicio de sesión
        // Desde 'app/pages/home.html', necesitamos subir dos niveles para llegar a 'index.html'
        window.location.href = '../../index.html'; 
    }
});

// Manejador del botón de cerrar sesión
async function handleLogout() {
    if (logoutButton) { // Asegurarse de que el botón existe antes de deshabilitarlo
        logoutButton.disabled = true;
    }
    showNotification('Cerrando sesión...', 'info');
    try {
        await signOut(auth);
        // onAuthStateChanged se encargará de la redirección a index.html
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showNotification(`Error: ${error.message}`, 'error');
        if (logoutButton) {
            logoutButton.disabled = false; // Habilitar el botón si hay un error
        }
    }
}

// Asigna el evento click al botón de cerrar sesión
if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
}

// --- Aquí puedes añadir más lógica específica de la aplicación que sea común a varias páginas ---
// Por ejemplo, funciones para manipular el DOM, interactuar con otros módulos de Firebase, etc.