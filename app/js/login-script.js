// app/js/login-script.js

// --- Importaciones de Firebase SDK ---
// NOTA IMPORTANTE: La versión 10.12.2 podría no ser la más reciente o estar desactualizada en el CDN.
// Para encontrar la versión más reciente y estable, visita: https://www.gstatic.com/firebasejs/
// y busca los directorios de versión. ¡Asegúrate de que todas las URLs de importación usen la misma versión!
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// --- Configuración de Firebase ---
// Usamos la variable global proporcionada por el entorno (__firebase_config).
// Si estás en desarrollo local y necesitas un fallback, puedes definir tu firebaseConfig aquí,
// pero recuerda eliminarlo antes de desplegar a producción donde __firebase_config debería existir.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Inicializa Firebase
let app;
let auth;
let db;

try {
    if (Object.keys(firebaseConfig).length === 0) {
        console.warn("ADVERTENCIA: firebaseConfig está vacío. Asegúrate de que __firebase_config esté disponible en tu entorno.");
        // Ejemplo de configuración local (descomentar solo para pruebas locales):
        /*
        app = initializeApp({
            apiKey: "TU_API_KEY",
            authDomain: "TU_AUTH_DOMAIN",
            projectId: "TU_PROJECT_ID",
            storageBucket: "TU_STORAGE_BUCKET",
            messagingSenderId: "TU_MESSAGING_SENDER_ID",
            appId: "TU_APP_ID"
        });
        */
    } else {
        app = initializeApp(firebaseConfig);
    }
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase inicializado con éxito.");
} catch (error) {
    console.error("Error crítico al inicializar Firebase:", error);
    // Deshabilita el botón de login si Firebase no se puede inicializar.
    document.addEventListener('DOMContentLoaded', () => {
        const loginBtn = document.getElementById('login-btn');
        const errorMessageDiv = document.getElementById('error-message');
        if (loginBtn) loginBtn.disabled = true;
        if (errorMessageDiv) {
            errorMessageDiv.textContent = 'Error: No se pudo conectar con el servidor de autenticación.';
            errorMessageDiv.style.display = 'block';
        }
    });
}

// --- Referencias a elementos del DOM ---
const loginForm = document.getElementById('loginForm');
const emailOrUsernameField = document.getElementById('email-username-field');
const passwordField = document.getElementById('password-field');
const loginBtn = document.getElementById('login-btn');
const errorMessageDiv = document.getElementById('error-message');
const notificationDiv = document.getElementById('app-notification');
const body = document.body; // Referencia al body para manejar la clase 'loading'

// --- Rutas de Redirección ---
const HOME_PAGE = 'app/html/home.html'; // Ruta relativa a home.html desde index.html
const LOGIN_PAGE_RELATIVE_PATH = '../../index.html'; // Ruta relativa a index.html desde una página dentro de app/html/

// --- Funciones de Utilidad ---

/**
 * Muestra un mensaje de error en el div designado debajo del formulario de login.
 * @param {string} message - El mensaje de error a mostrar.
 */
function setErrorMessage(message) {
    if (errorMessageDiv) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
        console.error('Mensaje de error del formulario:', message);
    } else {
        console.warn("Elemento 'error-message' no encontrado.");
    }
}

/**
 * Muestra una notificación temporal en la pantalla.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - El tipo de notificación ('success', 'error', 'info').
 */
function showNotification(message, type = 'info') {
    if (notificationDiv) {
        // Limpia clases y texto previos
        notificationDiv.className = '';
        notificationDiv.textContent = message;
        // Añade la clase de tipo
        notificationDiv.classList.add(type);

        // Añade la clase 'show' para activar la transición CSS
        requestAnimationFrame(() => {
            notificationDiv.classList.add('show');
        });

        console.log(`Notificación (${type}): ${message}`);

        // Oculta la notificación después de un tiempo
        setTimeout(() => {
            notificationDiv.classList.remove('show');
            // Espera a que termine la transición de salida antes de limpiar el contenido
            setTimeout(() => {
                notificationDiv.textContent = '';
                notificationDiv.className = ''; // Limpia todas las clases
            }, 500); // Coincide con la duración de la transición en CSS
        }, 3000); // Visible por 3 segundos
    } else {
        console.warn("Elemento 'app-notification' no encontrado. La notificación no se mostrará.");
    }
}

// --- Manejo del Estado de Autenticación de Firebase (onAuthStateChanged) ---
// Este listener se dispara cada vez que el estado de autenticación del usuario cambia.
if (auth) { // Solo si Firebase Auth fue inicializado
    onAuthStateChanged(auth, (user) => {
        console.log('onAuthStateChanged: Estado de usuario cambiado. Usuario:', user ? user.uid : 'null');
        const currentPath = window.location.pathname;

        // Si el body aún tiene la clase 'loading', la removemos y añadimos 'loaded' para mostrar el contenido
        if (body.classList.contains('loading')) {
            body.classList.remove('loading');
            body.classList.add('loaded');
            console.log("Clase 'loading' removida del body, 'loaded' añadida.");
        }

        if (user) {
            // Usuario ha iniciado sesión.
            console.log('Usuario logueado. UID:', user.uid);
            // Si NO estamos ya en la página de inicio, redirigir.
            if (!currentPath.includes(HOME_PAGE.split('/html/')[1])) { // Compara solo el nombre del archivo
                console.log('No en la página de inicio. Redirigiendo a:', HOME_PAGE);
                window.location.href = HOME_PAGE;
            } else {
                console.log('Ya en la página de inicio, no se necesita redirección.');
            }
        } else {
            // No hay usuario logueado.
            console.log('Usuario no logueado.');
            // Si estamos en una página de la aplicación (no index.html) y el usuario no está logueado, redirigir a index.html.
            // Aseguramos que la URL actual NO sea ya la página de login (para evitar bucles de redirección)
            if (currentPath.includes('/app/html/') && !currentPath.includes('index.html')) {
                console.log('Usuario cerró sesión desde una página de la app. Redirigiendo a index.html.');
                window.location.href = LOGIN_PAGE_RELATIVE_PATH;
            } else {
                console.log('Usuario no logueado en la página de login o página no de app. No se necesita redirección.');
            }
        }
    });

    // Intento de login con token inicial o anónimamente para Canvas
    if (initialAuthToken) {
        console.log('Intentando iniciar sesión con initialAuthToken...');
        signInWithCustomToken(auth, initialAuthToken)
            .then(() => console.log('Iniciado sesión con token personalizado exitosamente.'))
            .catch((error) => {
                console.error("Error al iniciar sesión con token personalizado:", error);
                // Si el token personalizado falla, intenta iniciar sesión anónimamente
                signInAnonymously(auth)
                    .then(() => console.log('Iniciado sesión anónimamente después del fallo del token personalizado.'))
                    .catch(anonError => console.error("Error al iniciar sesión anónimamente:", anonError));
            });
    } else {
        console.log('No se proporcionó initialAuthToken. Intentando iniciar sesión anónimamente.');
        signInAnonymously(auth)
            .then(() => console.log('Iniciado sesión anónimamente.'))
            .catch(anonError => console.error("Error al iniciar sesión anónimamente:", anonError));
    }

} else {
    console.error("Firebase Auth no está inicializado. No se podrán gestionar los estados de autenticación.");
}


// --- Manejador del Evento Submit del Formulario de Login ---
if (loginForm) { // Asegurarse de que el formulario exista antes de añadir el listener
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene el envío por defecto del formulario
        console.log('Evento submit del formulario de login detectado.');

        // Validar que todos los elementos DOM necesarios existan
        if (!loginBtn || !emailOrUsernameField || !passwordField || !errorMessageDiv || !auth || !db) {
            console.error("Faltan elementos DOM o Firebase no inicializado. No se puede procesar el login.");
            showNotification("Error interno: Elementos de la app no encontrados.", "error");
            return;
        }

        loginBtn.disabled = true; // Deshabilita el botón para evitar envíos múltiples
        setErrorMessage(''); // Limpia cualquier mensaje de error anterior
        errorMessageDiv.style.display = 'none'; // Oculta el div de error

        let inputIdentifier = emailOrUsernameField.value.trim();
        const password = passwordField.value;
        let emailToSignIn = '';

        // Validar que ambos campos no estén vacíos
        if (!inputIdentifier || !password) {
            const msg = 'El correo electrónico/usuario y la contraseña son obligatorios.';
            setErrorMessage(msg);
            showNotification(msg, 'error');
            loginBtn.disabled = false;
            console.log('Fallo de login: Campos vacíos.');
            return;
        }

        // Determinar si el input es un email o un nombre de usuario
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputIdentifier);

        if (isEmail) {
            emailToSignIn = inputIdentifier;
            console.log('Identificador reconocido como email:', emailToSignIn);
        } else {
            // Es un nombre de usuario, buscar el email asociado en Firestore
            console.log('Identificador reconocido como nombre de usuario. Buscando email en Firestore para:', inputIdentifier);
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('username', '==', inputIdentifier));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    emailToSignIn = querySnapshot.docs[0].data().email;
                    console.log('Usuario encontrado en Firestore. Email asociado:', emailToSignIn);
                } else {
                    const msg = 'Usuario o contraseña incorrectos.';
                    setErrorMessage(msg);
                    showNotification(msg, 'error');
                    loginBtn.disabled = false;
                    console.log('Fallo de login: Nombre de usuario no encontrado en Firestore.');
                    return;
                }
            } catch (error) {
                console.error("Error al buscar usuario por nombre de usuario en Firestore:", error);
                const msg = 'Error de conexión. Intenta de nuevo.';
                setErrorMessage(msg);
                showNotification(msg, 'error');
                loginBtn.disabled = false;
                return;
            }
        }

        // Intentar iniciar sesión con el email y la contraseña obtenidos
        try {
            console.log('Intentando signInWithEmailAndPassword para:', emailToSignIn);
            await signInWithEmailAndPassword(auth, emailToSignIn, password);
            showNotification('Inicio de sesión exitoso. Redirigiendo...', 'success');
            // La redirección será manejada por el listener onAuthStateChanged
        } catch (error) {
            console.error("Firebase Authentication Error:", error.code, error.message);
            let userFriendlyMessage = 'Usuario o contraseña incorrectos.';

            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    userFriendlyMessage = 'Usuario o contraseña incorrectos.';
                    break;
                case 'auth/invalid-email':
                    userFriendlyMessage = 'El formato del correo electrónico es inválido.';
                    break;
                case 'auth/too-many-requests':
                    userFriendlyMessage = 'Demasiados intentos fallidos. Por favor, intenta de nuevo más tarde.';
                    break;
                default:
                    userFriendlyMessage = 'Ocurrió un error inesperado al iniciar sesión. Intenta de nuevo.';
                    break;
            }
            setErrorMessage(userFriendlyMessage);
            showNotification(userFriendlyMessage, 'error');
        } finally {
            loginBtn.disabled = false; // Re-habilita el botón
            console.log('Proceso de login finalizado.');
        }
    });
} else {
    console.warn("Formulario de login con ID 'loginForm' no encontrado. El listener de submit no se adjuntará.");
}
