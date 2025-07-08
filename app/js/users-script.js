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
// La API_ENDPOINT se mantiene como referencia, pero las llamadas directas a la API han sido eliminadas temporalmente.
const API_ENDPOINT = '/.netlify/functions/users'; 

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
    
    // Elementos para el modal de confirmación
    confirmModal: document.getElementById('confirmModal'),
    confirmMessage: document.getElementById('confirm-message'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn')
};

let isAdmin = false; // Estado global para el rol de administrador (por ahora, se asume false)
let currentUserUid = null; // UID del usuario actualmente logueado
let allUsers = []; // Para almacenar los usuarios y facilitar la edición (ahora con datos de ejemplo)
let userToDeleteUid = null; // Para almacenar el UID del usuario a eliminar temporalmente

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    elements.notificationDiv.textContent = message;
    elements.notificationDiv.className = `show ${type}`;
    setTimeout(() => { elements.notificationDiv.className = ''; }, 3000);
}

// --- Funciones de Modal ---
// Abre el modal de usuario (para añadir o editar)
function openUserModal(user = null) {
    elements.userForm.reset(); // Limpia el formulario
    elements.passwordField.placeholder = "Contraseña (requerida para nuevos usuarios)";
    elements.passwordField.required = !user; // La contraseña es requerida solo para nuevos usuarios

    // Por ahora, el campo de rol siempre es visible y editable para demostración de la UI.
    // La lógica de ocultar/mostrar basada en isAdmin se ha simplificado.
    elements.roleFieldGroup.classList.remove('hidden-for-non-admin');
    elements.roleField.disabled = false;

    if (user) {
        elements.userModalTitle.textContent = 'Editar Usuario';
        elements.userIdField.value = user.uid;
        elements.usernameField.value = user.displayName || '';
        elements.emailField.value = user.email;
        elements.emailField.disabled = true; // No permitir cambiar el email al editar
        elements.roleField.value = user.role || 'usuario';
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

// --- Lógica de Datos (Simplificada con datos de ejemplo) ---
// Función para renderizar la tabla de usuarios con datos de ejemplo
async function fetchAndRenderUsers() {
    elements.usersTableBody.innerHTML = `<tr><td colspan="5">Cargando usuarios de ejemplo...</td></tr>`;

    // Datos de ejemplo para simular la carga de usuarios
    const dummyUsers = [
        { uid: "user123", displayName: "Juan Pérez", email: "juan.perez@example.com", role: "usuario", metadata: { lastSignInTime: Date.now() - 86400000 } },
        { uid: "admin456", displayName: "Admin Principal", email: "admin@example.com", role: "administrador", metadata: { lastSignInTime: Date.now() - 3600000 } },
        { uid: "tech789", displayName: "María Técnica", email: "maria.t@example.com", role: "tecnico", metadata: { lastSignInTime: Date.now() - 7200000 } }
    ];

    // Simula una pequeña demora para la "carga"
    await new Promise(resolve => setTimeout(resolve, 500)); 

    allUsers = dummyUsers; // Almacena los usuarios de ejemplo

    elements.usersTableBody.innerHTML = ''; // Limpia la tabla

    if (allUsers.length === 0) {
        elements.usersTableBody.innerHTML = `<tr><td colspan="5">No hay usuarios de ejemplo registrados.</td></tr>`;
        return;
    }

    allUsers.forEach(user => {
        const row = document.createElement('tr');
        const lastSignIn = user.metadata?.lastSignInTime 
            ? new Date(user.metadata.lastSignInTime).toLocaleDateString() 
            : 'Nunca';
        
        // Los botones de acción se muestran para todos los usuarios de ejemplo.
        // La lógica de permisos real se implementará con tu API de backend.
        let actionButtons = `
            <button class="btn btn-edit" data-uid="${user.uid}">Editar</button>
            <button class="btn btn-delete" data-uid="${user.uid}" data-email="${user.email}">Eliminar</button>
        `;

        row.innerHTML = `
            <td data-label="Nombre">${user.displayName || 'N/A'}</td> 
            <td data-label="Email">${user.email}</td>
            <td data-label="Rol">${user.role || 'Usuario'}</td>
            <td data-label="Último Acceso">${lastSignIn}</td>
            <td data-label="Acciones" class="action-buttons">${actionButtons}</td>
        `;
        elements.usersTableBody.appendChild(row);
    });
    showNotification('Usuarios de ejemplo cargados.', 'info');
}

// Maneja el envío del formulario de usuario (crear/actualizar) - Lógica simplificada
async function handleFormSubmit(e) {
    e.preventDefault();
    elements.saveUserBtn.disabled = true;

    const isUpdate = elements.userIdField.value !== '';
    const actionMessage = isUpdate ? 'actualizado' : 'creado';

    showNotification(`Usuario ${actionMessage} (simulado) correctamente.`, 'success');
    // Aquí es donde en el futuro harías la llamada a tu API de Netlify Functions
    // await callApi('POST', { action: isUpdate ? 'update' : 'create', ...datosDelFormulario });
    
    // Por ahora, solo recargar los datos de ejemplo para simular un cambio
    await fetchAndRenderUsers(); 
    closeUserModal();
    elements.saveUserBtn.disabled = false;
}

// --- Verificación de autenticación y roles (Básica) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid; // Guarda el UID del usuario logueado
        elements.userEmailDisplaySidebar.textContent = user.email;
        
        // Por ahora, no se verifica el rol de administrador dinámicamente desde claims.
        // La variable `isAdmin` se mantiene en `false` por defecto en este script simplificado.
        // Los elementos `.admin-only` en el HTML no se ocultarán/mostrarán automáticamente por JS aquí.
        
        await fetchAndRenderUsers(); // Carga los usuarios de ejemplo
    } else {
        // Si no hay usuario logueado, redirige a la página de inicio de sesión
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
    if (!targetButton) return;

    const uid = targetButton.dataset.uid;
    const email = targetButton.dataset.email;

    if (targetButton.classList.contains('btn-edit')) {
        const userToEdit = allUsers.find(u => u.uid === uid);
        if (userToEdit) openUserModal(userToEdit);
    } else if (targetButton.classList.contains('btn-delete')) {
        openConfirmModal(uid, email);
    }
});

// Event listeners para el modal de confirmación
elements.cancelDeleteBtn.addEventListener('click', closeConfirmModal);
elements.confirmDeleteBtn.addEventListener('click', async () => {
    if (userToDeleteUid) {
        showNotification(`Usuario ${userToDeleteUid} eliminado (simulado).`, 'success');
        // Aquí es donde en el futuro harías la llamada a tu API de Netlify Functions para eliminar
        // await callApi('POST', { action: 'delete', uid: userToDeleteUid });
        
        // Por ahora, solo recargar los datos de ejemplo (el usuario no se eliminará realmente)
        await fetchAndRenderUsers(); 
        closeConfirmModal();
    }
});
