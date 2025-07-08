// app/js/users-script.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

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
// --- FIN DE TU CONFIGURACIÓN DE FIREBASE ---

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const API_ENDPOINT = '/.netlify/functions/users'; // URL de tu función de Netlify

const elements = {
    sidebar: document.getElementById('sidebar'),
    menuToggleBtn: document.getElementById('menu-toggle-btn'),
    userEmailDisplaySidebar: document.getElementById('user-email-display-sidebar'),
    userLogoutBtnSidebar: document.getElementById('user-logout-btn-sidebar'),
    usersTableBody: document.getElementById('users-table-body'),
    addUserBtn: document.getElementById('add-user-btn'),
    userModal: document.getElementById('userModal'),
    userModalTitle: document.getElementById('userModalTitle'),
    userForm: document.getElementById('userForm'),
    userIdField: document.getElementById('user-id-field'),
    usernameField: document.getElementById('username-field'),
    emailField: document.getElementById('email-field'),
    passwordField: document.getElementById('password-field'),
    roleField: document.getElementById('role-field'),
    roleFieldGroup: document.querySelector('.role-field-group'), // Para ocultar el campo de rol
    saveUserBtn: document.getElementById('save-user-btn'),
    closeModalBtns: document.querySelectorAll('.close-modal-btn'),
    notificationDiv: document.getElementById('app-notification'),
    adminOnlyElements: document.querySelectorAll('.admin-only'), // Elementos que solo ven los administradores
    
    // Nuevos elementos para el modal de confirmación
    confirmModal: document.getElementById('confirmModal'),
    confirmMessage: document.getElementById('confirm-message'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn')
};

let isAdmin = false; // Estado global para el rol de administrador
let currentUserUid = null; // UID del usuario actualmente logueado
let allUsers = []; // Para almacenar los usuarios y facilitar la edición
let userToDeleteUid = null; // Para almacenar el UID del usuario a eliminar temporalmente

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    elements.notificationDiv.textContent = message;
    elements.notificationDiv.className = `show ${type}`;
    setTimeout(() => { elements.notificationDiv.className = ''; }, 3000);
}

// Función genérica para llamar a tu API de Netlify Functions
async function callApi(method, body) {
    const user = auth.currentUser;
    if (!user) {
        // Si no hay usuario logueado, redirige a la página de inicio de sesión
        // La ruta desde app/html/ a index.html es ../../index.html
        window.location.href = '../../index.html'; 
        return; 
    }
    const token = await user.getIdToken(); // Obtiene el token de autenticación para la API

    const options = {
        method,
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
        },
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(API_ENDPOINT, options);
    const responseData = await response.json(); // Aquí es donde falla si no recibe JSON
    if (!response.ok) {
        // Si la respuesta no es OK, lanza un error con el mensaje de la API
        throw new Error(responseData.message || `Error en la solicitud: ${response.status}`);
    }
    return responseData;
}

// Función para renderizar la tabla de usuarios
async function fetchAndRenderUsers() {
    elements.usersTableBody.innerHTML = `<tr><td colspan="5">Cargando usuarios...</td></tr>`;
    try {
        const users = await callApi('GET');
        allUsers = users; // Guarda la lista de usuarios
        elements.usersTableBody.innerHTML = '';

        if (users.length === 0) {
            elements.usersTableBody.innerHTML = `<tr><td colspan="5">No hay usuarios registrados.</td></tr>`;
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            // `lastSignInTime` es un string, pero a veces viene como número, convertimos a Date si es numérico
            const lastSignIn = user.metadata?.lastSignInTime 
                ? new Date(isNaN(user.metadata.lastSignInTime) ? user.metadata.lastSignInTime : parseInt(user.metadata.lastSignInTime)).toLocaleDateString() 
                : 'Nunca';
            
            // Solo muestra los botones de acción si el usuario actual es administrador
            // O si el usuario está editando su propio perfil (solo botón de editar)
            let actionButtons = '';
            if (isAdmin || user.uid === currentUserUid) {
                actionButtons += `<button class="btn btn-edit" data-uid="${user.uid}">Editar</button>`;
                if (isAdmin && user.uid !== currentUserUid) { // Solo admin puede eliminar a otros
                    actionButtons += `<button class="btn btn-delete" data-uid="${user.uid}" data-email="${user.email}">Eliminar</button>`;
                }
            }

            row.innerHTML = `
                <td data-label="Nombre">${user.displayName || user.full_name || 'N/A'}</td> 
                <td data-label="Email">${user.email}</td>
                <td data-label="Rol">${user.role || 'Usuario'}</td>
                <td data-label="Último Acceso">${lastSignIn}</td>
                <td data-label="Acciones" class="action-buttons">${actionButtons}</td>
            `;
            elements.usersTableBody.appendChild(row);
        });
    } catch (error) {
        showNotification(`Error al cargar usuarios: ${error.message}`, 'error');
        elements.usersTableBody.innerHTML = `<tr><td colspan="5">Error al cargar la lista.</td></tr>`;
        console.error("Error fetching users:", error);
    }
}

// Maneja el envío del formulario de usuario (crear/actualizar)
async function handleFormSubmit(e) {
    e.preventDefault();
    elements.saveUserBtn.disabled = true;

    // Validación básica
    if (!elements.usernameField.value || !elements.emailField.value || (!elements.userIdField.value && !elements.passwordField.value)) {
        showNotification('Por favor, complete todos los campos requeridos.', 'error');
        elements.saveUserBtn.disabled = false;
        return;
    }

    const body = {
        action: elements.userIdField.value ? 'update' : 'create', // Determina si es una actualización o creación
        uid: elements.userIdField.value,
        username: elements.usernameField.value, // Envía 'username'
        email: elements.emailField.value,
        password: elements.passwordField.value,
        role: elements.roleField.value,
    };
    
    try {
        await callApi('POST', body);
        showNotification(`Usuario ${body.action === 'update' ? 'actualizado' : 'creado'} correctamente.`, 'success');
        await fetchAndRenderUsers(); // Vuelve a cargar la tabla
        closeUserModal();
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
        console.error("Error saving user:", error);
    } finally {
        elements.saveUserBtn.disabled = false;
    }
}

// Abre el modal de usuario (para añadir o editar)
function openUserModal(user = null) {
    elements.userForm.reset(); // Limpia el formulario
    elements.passwordField.placeholder = "Dejar vacío para no cambiar";
    elements.passwordField.required = !user; // La contraseña es requerida solo para nuevos usuarios

    // Controla la visibilidad y editabilidad del campo de rol
    if (isAdmin) {
        elements.roleFieldGroup.classList.remove('hidden-for-non-admin');
        elements.roleField.disabled = false;
    } else {
        // Si no es admin, oculta el campo de rol
        elements.roleFieldGroup.classList.add('hidden-for-non-admin');
        elements.roleField.disabled = true; // Deshabilita para asegurar que no se envíe un valor modificado
    }


    if (user) {
        elements.userModalTitle.textContent = 'Editar Usuario';
        elements.userIdField.value = user.uid;
        elements.usernameField.value = user.displayName || user.full_name || ''; // Usa full_name de Firestore si existe
        elements.emailField.value = user.email;
        elements.emailField.disabled = true; // No permitir cambiar el email al editar
        elements.roleField.value = user.role || 'usuario';

        // Si el usuario actual no es admin y está editando su propio perfil, el campo de rol también debe estar deshabilitado.
        // Aunque ya lo ocultamos, esta es una capa extra de seguridad para el input.
        if (!isAdmin) {
            elements.roleField.disabled = true;
        }

    } else {
        elements.userModalTitle.textContent = 'Añadir Nuevo Usuario';
        elements.userIdField.value = '';
        elements.emailField.disabled = false; // Permitir email al añadir
    }
    elements.userModal.classList.add('active'); // Muestra el modal
}

// Cierra el modal de usuario
function closeUserModal() {
    elements.userModal.classList.remove('active');
}

// Abre el modal de confirmación para eliminar
function openConfirmModal(uid, email) {
    userToDeleteUid = uid; // Guarda el UID del usuario a eliminar
    elements.confirmMessage.textContent = `¿Estás seguro de que quieres eliminar al usuario ${email}? Esta acción es irreversible.`;
    elements.confirmModal.classList.add('active');
}

// Cierra el modal de confirmación
function closeConfirmModal() {
    elements.confirmModal.classList.remove('active');
    userToDeleteUid = null; // Limpia el UID almacenado
}

// --- Verificación de autenticación y roles ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid; // Guarda el UID del usuario logueado
        elements.userEmailDisplaySidebar.textContent = user.email;
        try {
            const idTokenResult = await user.getIdTokenResult();
            // Establece la variable global isAdmin
            isAdmin = idTokenResult.claims.role === 'administrador';

            // Oculta/muestra elementos basados en el rol de administrador
            elements.adminOnlyElements.forEach(el => {
                el.style.display = isAdmin ? '' : 'none';
            });
            
            // Carga y renderiza los usuarios después de determinar el rol
            await fetchAndRenderUsers(); 
        } catch (error) {
            showNotification("Error al verificar permisos. Redirigiendo...", 'error');
            console.error("Error al obtener claims de ID:", error);
            await signOut(auth); // Cerrar sesión en caso de error de permisos
        }
    } else {
        // Si no hay usuario logueado, redirige a la página de inicio de sesión
        // La ruta desde app/html/ a index.html es ../../index.html
        window.location.href = '../../index.html';
    }
});

// --- Event Listeners ---
elements.menuToggleBtn.addEventListener('click', () => {
    elements.sidebar.classList.toggle('expanded');
});

elements.userLogoutBtnSidebar.addEventListener('click', async () => {
    await signOut(auth);
});

elements.addUserBtn.addEventListener('click', () => openUserModal());

elements.closeModalBtns.forEach(btn => btn.addEventListener('click', closeUserModal));

elements.userForm.addEventListener('submit', handleFormSubmit);

elements.usersTableBody.addEventListener('click', async (e) => {
    const targetButton = e.target.closest('.btn-edit, .btn-delete');
    // Solo procesa si se hizo clic en un botón de acción
    if (!targetButton) return;

    const uid = targetButton.dataset.uid;

    if (targetButton.classList.contains('btn-edit')) {
        // Solo un admin o el propio usuario pueden editar
        if (!isAdmin && uid !== currentUserUid) {
            showNotification('No tienes permiso para editar este usuario.', 'error');
            return;
        }
        const userToEdit = allUsers.find(u => u.uid === uid);
        if (userToEdit) openUserModal(userToEdit);
    } else if (targetButton.classList.contains('btn-delete')) {
        // Solo un admin puede eliminar a otros usuarios (no a sí mismo)
        if (!isAdmin || uid === currentUserUid) {
            showNotification('No tienes permiso para eliminar este usuario o no puedes eliminar tu propia cuenta.', 'error');
            return;
        }
        // Abre el modal de confirmación en lugar de usar confirm()
        openConfirmModal(uid, targetButton.dataset.email);
    }
});

// Event listeners para el modal de confirmación
elements.cancelDeleteBtn.addEventListener('click', closeConfirmModal);
elements.confirmDeleteBtn.addEventListener('click', async () => {
    if (userToDeleteUid) {
        try {
            await callApi('POST', { action: 'delete', uid: userToDeleteUid });
            showNotification('Usuario eliminado correctamente.', 'success');
            await fetchAndRenderUsers(); // Vuelve a cargar la tabla
            closeConfirmModal();
        } catch (error) {
            showNotification(`Error al eliminar: ${error.message}`, 'error');
            console.error("Error deleting user:", error);
            closeConfirmModal(); // Cierra el modal incluso si hay error
        }
    }
});
