// app/js/script.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// **IMPORTANTE: Configuración de Firebase.**
// Asegúrate de que esta configuración coincida con la de tu proyecto de Firebase.
const firebaseConfig = {
    apiKey: "AIzaSyCxJOpBEXZUo7WrAqDTrlJV_2kJBsL8Ym0", // ¡Actualiza esto con tu propia clave API!
    authDomain: "labflow-manager.firebaseapp.com",
    projectId: "labflow-manager",
    storageBucket: "labflow-manager.firebasestorage.app",
    messagingSenderId: "742212306654",
    appId: "1:742212306654:web:a53bf890fc63cd5d05e44f",
    measurementId: "G-YVZDBCJR3B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Referencias a elementos del DOM
const sidebar = document.getElementById('sidebar');
const menuToggleButton = document.getElementById('menu-toggle-btn');
const logoutButtonSidebar = document.getElementById('logout-button-sidebar');
const notificationDiv = document.getElementById('app-notification');
const userNameDisplay = document.getElementById('user-name-display');
const userRoleDisplay = document.getElementById('user-role-display');
const pageContainer = document.getElementById('content'); // 'content' es el ID de tu main ahora

/**
 * Muestra una notificación en la interfaz de usuario.
 * Utiliza las clases CSS definidas en styles.css.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - El tipo de notificación ('info', 'success', 'error').
 * @param {number} duration - Duración en milisegundos que la notificación estará visible.
 */
function showNotification(message, type = 'info', duration = 3000) {
    if (!notificationDiv) {
        console.error('Elemento #app-notification no encontrado en script.js.');
        return;
    }

    notificationDiv.textContent = message;
    notificationDiv.className = ''; // Limpiar clases existentes
    notificationDiv.classList.add(type);
    notificationDiv.classList.add('show');

    console.log('Notificación mostrada:', message, type);

    setTimeout(() => {
        notificationDiv.classList.remove('show');
        setTimeout(() => {
            notificationDiv.textContent = '';
            notificationDiv.className = '';
        }, 500); // Esperar que la transición CSS de opacidad termine
    }, duration);
}

/**
 * Obtiene los datos del usuario de Firestore y actualiza la interfaz de usuario.
 * @param {string} uid - El ID de usuario de Firebase.
 */
async function fetchAndDisplayUserData(uid) {
    try {
        // IMPORTANTE: Ajusta esta ruta de Firestore según la estructura real de tus datos.
        // Este ejemplo asume que los perfiles de usuario están bajo /users/{userId} o similar.
        const userDocRef = doc(db, `users`, uid); // Ruta común si los perfiles están directamente en la colección 'users'
        // Si tu estructura es la de Canvas: const userDocRef = doc(db, `artifacts/default-app-id/users/${uid}/profile`, 'userProfile');

        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            userNameDisplay.textContent = userData.name || userData.username || 'Usuario';
            userRoleDisplay.textContent = userData.role || 'Rol no definido';
            console.log('Datos de usuario cargados desde Firestore:', userData);
        } else {
            console.log("No se encontró perfil de usuario en Firestore para UID:", uid);
            userNameDisplay.textContent = 'Usuario Desconocido';
            userRoleDisplay.textContent = 'Sin rol';
            showNotification('Advertencia: Perfil de usuario no encontrado.', 'info', 3000);
        }
    } catch (error) {
        console.error("Error al obtener datos de usuario de Firestore:", error);
        userNameDisplay.textContent = 'Error al cargar';
        userRoleDisplay.textContent = 'Error';
        showNotification('Error al cargar datos del usuario.', 'error', 3000);
    }
}

// Escucha cambios en el estado de autenticación de Firebase
onAuthStateChanged(auth, async (user) => {
    console.log('onAuthStateChanged (script.js): Estado de usuario cambiado. Usuario actual:', user ? user.uid : 'null');
    const currentPath = window.location.pathname;
    console.log('onAuthStateChanged (script.js): Ruta URL actual:', currentPath);

    if (user) {
        // El usuario ha iniciado sesión.
        console.log('onAuthStateChanged (script.js): Usuario logueado. UID:', user.uid);
        await fetchAndDisplayUserData(user.uid); // Espera a que los datos se carguen

        // Remover clase 'loading' y añadir 'loaded' al body para mostrar el contenido
        document.body.classList.remove('loading');
        document.body.classList.add('loaded');

        // Marcar el enlace activo en el sidebar (para home.html y otras páginas)
        // La URL completa ahora es '/app/pages/home.html', etc.
        const currentFileName = currentPath.substring(currentPath.lastIndexOf('/') + 1);
        const sidebarLinks = document.querySelectorAll('#sidebar ul li a');
        sidebarLinks.forEach(link => {
            // Compara solo el nombre del archivo (ej. 'home.html' con 'home.html')
            if (link.getAttribute('href') === currentFileName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

    } else {
        // Ningún usuario ha iniciado sesión. Redirigir a la página de login.
        console.log('onAuthStateChanged (script.js): Ningún usuario ha iniciado sesión. Redirigiendo a la página de login.');
        // Asegúrate de que esta redirección solo ocurra si no estás ya en la página de login para evitar bucles.
        // La ruta de 'app/pages/' a 'index.html' en la raíz es '../../index.html'
        if (!currentPath.includes('/index.html') && !currentPath.endsWith('/')) {
            window.location.href = '../../index.html';
        }
        // Asegura que el body esté en estado de carga si no hay usuario (o muestra el login)
        document.body.classList.remove('loaded');
        document.body.classList.add('loading');
    }
});

// Manejar clic en el botón de cerrar sesión del sidebar
if (logoutButtonSidebar) {
    logoutButtonSidebar.addEventListener('click', async () => {
        logoutButtonSidebar.disabled = true; // Deshabilita el botón durante el proceso
        showNotification('Cerrando sesión...', 'info');
        try {
            await signOut(auth);
            console.log('Usuario cerró sesión exitosamente.');
            // La redirección a index.html es manejada por el listener onAuthStateChanged
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            showNotification(`Error al cerrar sesión: ${error.message}`, 'error');
            logoutButtonSidebar.disabled = false; // Vuelve a habilitar el botón si falla
        }
    });
} else {
    console.warn("Botón de cerrar sesión del sidebar no encontrado.");
}

// Manejar el botón de alternar menú (solo visible en móvil)
if (menuToggleButton) {
    menuToggleButton.addEventListener('click', () => {
        sidebar.classList.toggle('expanded');
        // Cuando el sidebar se expande, también podríamos querer desplazar el contenido principal,
        // pero con el CSS actual, el sidebar se superpone.
        // Si prefieres que el contenido se mueva, necesitarías ajustar el CSS del #content
        // cuando #sidebar tiene la clase .expanded en @media (max-width: 992px).
    });
}
