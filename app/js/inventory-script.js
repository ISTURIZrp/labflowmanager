// app/js/inventory-script.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, runTransaction, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// **IMPORTANTE: Configuración de Firebase hardcodeada.**
const firebaseConfig = {
    apiKey: "AIzaSyCxJOpBEXZUo7WrAqDTrlJV_2kJBsL8Ym0",
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
const userEmailDisplaySidebar = document.getElementById('user-email-display-sidebar');
const userLogoutBtnSidebar = document.getElementById('user-logout-btn-sidebar');
const productTableBody = document.getElementById('productTableBody');
const btnAddProduct = document.getElementById('btnAddProduct');
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const saveBtn = document.getElementById('saveBtn');
const closeModalBtns = document.querySelectorAll('.close-modal-btn');
const notificationDiv = document.getElementById('app-notification');
const confirmModal = document.getElementById('confirmModal');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');

const searchInput = document.getElementById('searchInput'); // Elemento de búsqueda
const csvActionsContainer = document.getElementById('csvActionsContainer');
const btnCSVActions = document.getElementById('btnCSVActions');
const csvDropdownMenu = document.getElementById('csvDropdownMenu');
const btnExportCSV = document.getElementById('btnExportCSV');
const btnImportInsumosCSV = document.getElementById('btnImportInsumosCSV');
const btnImportLotesCSV = document.getElementById('btnImportLotesCSV');
const csvFileInput = document.getElementById('csvFileInput');
let currentImportType = null; // Para saber qué tipo de CSV se está importando

// Elementos para selección múltiple
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const btnDeleteSelected = document.getElementById('btnDeleteSelected');

let isAdmin = false; // Estado para el rol de administrador
let currentUserUid = null; // UID del usuario actual

// --- Funciones de Utilidad ---

/**
 * Muestra una notificación temporal en la interfaz de usuario.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - El tipo de notificación ('info', 'success', 'error', 'warning').
 */
function showNotification(message, type = 'info') {
    notificationDiv.textContent = message;
    notificationDiv.className = 'show ' + type;
    setTimeout(() => { notificationDiv.className = ''; }, 3000);
}

/**
 * Muestra un modal de confirmación y devuelve una promesa que se resuelve con true/false.
 * @param {string} message - El mensaje de confirmación.
 * @returns {Promise<boolean>} - True si el usuario confirma, false si cancela.
 */
function showConfirm(message) {
    return new Promise((resolve) => {
        document.getElementById('confirmModalTitle').textContent = "Confirmar Acción"; // Asegura el título
        confirmModalMessage.textContent = message;
        confirmModal.classList.add('active');

        const onOk = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };
        const cleanup = () => {
            confirmOkBtn.removeEventListener('click', onOk);
            confirmCancelBtn.removeEventListener('click', onCancel);
            confirmModal.classList.remove('active');
        };
        confirmOkBtn.addEventListener('click', onOk, { once: true });
        confirmCancelBtn.addEventListener('click', onCancel, { once: true });
    });
}

// --- Funciones de Gestión de Datos (Firestore) ---

/**
 * Calcula y actualiza la existencia total de un insumo sumando las existencias de sus lotes.
 * @param {string} insumoId - ID del insumo a actualizar.
 */
async function updateInsumoTotalExistence(insumoId) {
    try {
        const lotesQuery = query(collection(db, "lotes"), where("insumo_id", "==", insumoId));
        const lotesSnapshot = await getDocs(lotesQuery);
        const totalExistencia = lotesSnapshot.docs.reduce((sum, doc) => sum + doc.data().existencia, 0);
        await updateDoc(doc(db, "insumos", insumoId), { existencia_total: totalExistencia });
    } catch (error) {
        console.error("Error al actualizar la existencia total del insumo:", error);
        showNotification("Error al actualizar la existencia total.", "error");
    }
}

/**
 * Carga y renderiza la tabla de insumos y sus lotes desde Firestore.
 */
async function fetchAndRenderInsumos() {
    productTableBody.innerHTML = `<tr><td colspan="5">Cargando insumos...</td></tr>`;
    try {
        const insumosQuery = query(collection(db, "insumos"), orderBy("nombre"));
        const insumosSnapshot = await getDocs(insumosQuery);
        
        if (insumosSnapshot.empty) {
            productTableBody.innerHTML = `<tr><td colspan="5">No hay insumos registrados.</td></tr>`;
            return;
        }

        let tableHtml = '';
        for (const insumoDoc of insumosSnapshot.docs) {
            const insumo = { id: insumoDoc.id, ...insumoDoc.data() };
            const lotesQuery = query(collection(db, "lotes"), where("insumo_id", "==", insumo.id));
            const lotesSnapshot = await getDocs(lotesQuery);
            const lotes = lotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            tableHtml += `
                <tr class="insumo-row" data-insumo-id="${insumo.id}">
                    <td><input type="checkbox" class="insumo-checkbox" data-id="${insumo.id}"></td>
                    <td><strong>${insumo.nombre}</strong></td>
                    <td>${insumo.existencia_total || 0}</td>
                    <td>${insumo.stock_minimo}</td>
                    <td class="action-buttons">
                        <button class="btn btn-edit" data-action="edit-insumo" data-id="${insumo.id}" data-nombre="${insumo.nombre}" data-stock-minimo="${insumo.stock_minimo}">Editar</button>
                        <button class="btn btn-delete" data-action="delete-insumo" data-id="${insumo.id}" data-nombre="${insumo.nombre}">Eliminar</button>
                    </td>
                </tr>
            `;
            if (lotes.length > 0) {
                // Fila para mostrar/ocultar lotes (inicialmente oculta)
                tableHtml += `<tr class="lote-toggle-row" data-lote-toggle-for="${insumo.id}"><td colspan="5" style="text-align: center;"><button class="btn btn-secondary btn-toggle-lotes" data-insumo-id="${insumo.id}">Mostrar Lotes (${lotes.length})</button></td></tr>`;
                tableHtml += `<tr class="lote-container-row" data-lote-for="${insumo.id}" style="display:none;"><td colspan="5">`;
                tableHtml += `<table><thead><tr><th>Lote</th><th>Caducidad</th><th>Existencia</th><th>Acciones</th></tr></thead><tbody>`;
                lotes.forEach(lote => {
                    tableHtml += `
                        <tr>
                            <td>${lote.lote || 'N/A'}</td>
                            <td>${lote.fecha_caducidad || 'N/A'}</td>
                            <td>${lote.existencia}</td>
                            <td class="action-buttons">
                                <button class="btn btn-edit" data-action="edit-lote" data-id="${lote.id}" data-insumo-id="${insumo.id}" data-insumo-nombre="${insumo.nombre}" data-stock-minimo="${insumo.stock_minimo}" data-lote='${JSON.stringify(lote)}'>Editar</button>
                                <button class="btn btn-delete" data-action="delete-lote" data-id="${lote.id}" data-lote-nombre="${lote.lote || 'este lote'}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                });
                tableHtml += `</tbody></table></td></tr>`;
            }
        }
        productTableBody.innerHTML = tableHtml;
        // Reinicia el estado de los checkboxes y el botón de eliminar seleccionados
        updateDeleteSelectedButtonVisibility();
        selectAllCheckbox.checked = false;
    } catch (error) {
        console.error("Error cargando insumos:", error);
        showNotification("Error al cargar los insumos.", "error");
        productTableBody.innerHTML = `<tr><td colspan="5">Error al cargar datos.</td></tr>`;
    }
}

/**
 * Abre el modal para añadir/editar insumos o lotes.
 * @param {object|null} insumo - Objeto insumo si se está editando o añadiendo lote a uno existente.
 * @param {object|null} lote - Objeto lote si se está editando un lote específico.
 */
function openModal(insumo = null, lote = null) {
    productForm.reset();
    const modalTitle = document.getElementById('modalTitle');
    const insumoIdField = document.getElementById('insumoIdField');
    const loteIdField = document.getElementById('loteIdField');
    const nombreInput = document.getElementById('nombre');
    const stockMinimoInput = document.getElementById('stockMinimo');
    const loteInput = document.getElementById('lote');
    const fechaCaducidadInput = document.getElementById('fechaCaducidad');
    const existenciaInput = document.getElementById('existencia');

    // Habilita todos los campos por defecto y luego deshabilita según la lógica
    nombreInput.disabled = false;
    stockMinimoInput.disabled = false;
    loteInput.disabled = false;
    fechaCaducidadInput.disabled = false;
    existenciaInput.disabled = false;

    if (lote) { // Editando un lote existente
        modalTitle.textContent = "Editar Lote";
        insumoIdField.value = lote.insumo_id;
        loteIdField.value = lote.id;
        nombreInput.value = insumo.nombre;
        nombreInput.disabled = true; // No se puede cambiar el nombre del insumo al editar un lote
        stockMinimoInput.value = insumo.stock_minimo;
        stockMinimoInput.disabled = true; // No se puede cambiar el stock mínimo al editar un lote
        loteInput.value = lote.lote;
        fechaCaducidadInput.value = lote.fecha_caducidad;
        existenciaInput.value = lote.existencia;
    } else if (insumo) { // Editando un insumo existente o añadiendo un nuevo lote a un insumo existente
        modalTitle.textContent = "Editar Insumo / Añadir Lote";
        insumoIdField.value = insumo.id;
        loteIdField.value = ''; // Se borra el loteId si se está añadiendo un lote nuevo
        nombreInput.value = insumo.nombre;
        stockMinimoInput.value = insumo.stock_minimo;
        // Los campos de lote se dejan vacíos para añadir un nuevo lote
        loteInput.value = '';
        fechaCaducidadInput.value = '';
        existenciaInput.value = '';
    } else { // Añadiendo un insumo completamente nuevo con su primer lote
        modalTitle.textContent = "Agregar Insumo y Lote";
        insumoIdField.value = '';
        loteIdField.value = '';
    }
    productModal.classList.add('active');
}

/** Cierra el modal de añadir/editar insumos/lotes. */
function closeModal() {
    productModal.classList.remove('active');
}

/**
 * Maneja el envío del formulario para crear o actualizar insumos/lotes.
 * @param {Event} e - Evento de envío del formulario.
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    saveBtn.disabled = true;

    const insumoId = document.getElementById('insumoIdField').value;
    const loteId = document.getElementById('loteIdField').value;
    const data = {
        nombre: document.getElementById('nombre').value.trim(),
        stock_minimo: Number(document.getElementById('stockMinimo').value),
        lote: document.getElementById('lote').value.trim(),
        fecha_caducidad: document.getElementById('fechaCaducidad').value,
        existencia: Number(document.getElementById('existencia').value)
    };

    // Validación básica
    if (!data.nombre || isNaN(data.stock_minimo) || data.stock_minimo < 0 || isNaN(data.existencia) || data.existencia < 0) {
        showNotification("Por favor, rellena los campos obligatorios correctamente (Nombre, Stock Mínimo, Existencia del Lote).", "error");
        saveBtn.disabled = false;
        return;
    }

    try {
        if (loteId) { // Actualizar un lote existente
            await updateDoc(doc(db, "lotes", loteId), { lote: data.lote, fecha_caducidad: data.fecha_caducidad, existencia: data.existencia });
            showNotification("Lote actualizado correctamente.", "success");
            await updateInsumoTotalExistence(insumoId); // Actualiza la existencia total del insumo padre
        } else if (insumoId) { // Editar insumo y/o añadir un nuevo lote a un insumo existente
            await updateDoc(doc(db, "insumos", insumoId), { nombre: data.nombre, stock_minimo: data.stock_minimo });
            if (data.lote || data.fecha_caducidad || data.existencia > 0) { // Si se proporcionan datos de lote, añadirlo
                await addDoc(collection(db, "lotes"), { insumo_id: insumoId, lote: data.lote, fecha_caducidad: data.fecha_caducidad, existencia: data.existencia, created_at: new Date().toISOString() });
                showNotification("Insumo actualizado y/o nuevo lote añadido correctamente.", "success");
                await updateInsumoTotalExistence(insumoId); // Actualiza la existencia total del insumo
            } else {
                showNotification("Insumo actualizado correctamente (sin añadir lote).", "success");
            }
        } else { // Crear un nuevo insumo con su primer lote
            // Verificar si ya existe un insumo con el mismo nombre
            const q = query(collection(db, "insumos"), where("nombre", "==", data.nombre));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                showNotification("Error: Ya existe un insumo con este nombre.", "error");
                saveBtn.disabled = false;
                return;
            }

            await runTransaction(db, async (transaction) => {
                const newInsumoRef = doc(collection(db, "insumos"));
                transaction.set(newInsumoRef, { 
                    nombre: data.nombre, 
                    stock_minimo: data.stock_minimo, 
                    existencia_total: data.existencia, // La existencia inicial es la del primer lote
                    created_at: new Date().toISOString() 
                });
                if (data.lote || data.fecha_caducidad || data.existencia > 0) {
                    const newLoteRef = doc(collection(db, "lotes"));
                    transaction.set(newLoteRef, { 
                        insumo_id: newInsumoRef.id, 
                        lote: data.lote, 
                        fecha_caducidad: data.fecha_caducidad, 
                        existencia: data.existencia, 
                        created_at: new Date().toISOString() 
                    });
                }
            });
            showNotification("Insumo y lote creados correctamente.", "success");
        }
        
        closeModal();
        await fetchAndRenderInsumos(); // Recargar la tabla para ver los cambios
    } catch (error) {
        console.error("Error guardando:", error);
        showNotification("Error al guardar: " + error.message, "error");
    } finally {
        saveBtn.disabled = false;
    }
}

/**
 * Maneja la eliminación de insumos o lotes.
 * @param {string} action - 'delete-insumo' o 'delete-lote'.
 * @param {string} id - ID del insumo o lote a eliminar.
 * @param {string} name - Nombre del insumo o lote para el mensaje de confirmación.
 */
async function handleDelete(action, id, name) {
    const confirmed = await showConfirm(`¿Seguro que quieres eliminar "${name}"? Esta acción es irreversible.`);
    if (!confirmed) return;

    try {
        if (action === 'delete-insumo') {
            // Eliminar todos los lotes asociados y luego el insumo
            const lotesQuery = query(collection(db, "lotes"), where("insumo_id", "==", id));
            const lotesSnapshot = await getDocs(lotesQuery);
            const batch = writeBatch(db);
            lotesSnapshot.forEach(doc => batch.delete(doc.ref)); // Añade eliminación de lotes al batch
            batch.delete(doc(db, "insumos", id)); // Añade eliminación del insumo al batch
            await batch.commit(); // Ejecuta todas las eliminaciones en un batch
            showNotification("Insumo y sus lotes eliminados correctamente.", "success");
        } else if (action === 'delete-lote') {
            const loteRef = doc(db, "lotes", id);
            const loteSnap = await getDoc(loteRef);
            if (!loteSnap.exists()) {
                showNotification("El lote no existe.", "error");
                return;
            }
            const insumoId = loteSnap.data().insumo_id;
            await deleteDoc(loteRef); // Elimina el lote
            showNotification("Lote eliminado correctamente.", "success");
            await updateInsumoTotalExistence(insumoId); // Actualiza la existencia total del insumo padre
        }
        await fetchAndRenderInsumos(); // Recargar la tabla
    } catch (error) {
        console.error("Error eliminando:", error);
        showNotification("Error al eliminar: " + error.message, "error");
    }
}

// --- Funciones de CSV ---

/**
 * Exporta todos los insumos y sus lotes a un archivo CSV.
 */
async function exportToCSV() {
    showNotification("Generando CSV...", "info");
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = ["InsumoID", "NombreInsumo", "StockMinimo", "NumeroLote", "FechaCaducidad", "ExistenciaLote"];
    csvContent += headers.join(",") + "\r\n";

    try {
        const insumosQuery = query(collection(db, "insumos"), orderBy("nombre"));
        const insumosSnapshot = await getDocs(insumosQuery);
        
        for (const insumoDoc of insumosSnapshot.docs) {
            const insumo = { id: insumoDoc.id, ...insumoDoc.data() };
            const lotesQuery = query(collection(db, "lotes"), where("insumo_id", "==", insumo.id));
            const lotesSnapshot = await getDocs(lotesQuery);

            if (lotesSnapshot.empty) {
                // Si no hay lotes, exportar el insumo con campos de lote vacíos
                const row = [insumo.id, insumo.nombre, insumo.stock_minimo, "", "", 0];
                csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\r\n";
            } else {
                lotesSnapshot.forEach(loteDoc => {
                    const lote = loteDoc.data();
                    const row = [insumo.id, insumo.nombre, insumo.stock_minimo, lote.lote || "", lote.fecha_caducidad || "", lote.existencia];
                    csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\r\n";
                });
            }
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "inventario_completo.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("CSV exportado correctamente.", "success");
    } catch (error) {
        console.error("Error al exportar CSV:", error);
        showNotification("Error al generar el CSV.", "error");
    }
}

/**
 * Maneja la carga de un archivo CSV y lo procesa según el tipo de importación.
 * @param {Event} event - Evento de cambio del input de archivo.
 */
async function handleCSVFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        if (currentImportType === 'insumos') {
            await handleInsumosCSVImport(text);
        } else if (currentImportType === 'lotes') {
            await handleLotesCSVImport(text);
        }
        csvFileInput.value = ''; // Limpiar el input de archivo
    };
    reader.readAsText(file);
}

/**
 * Procesa un CSV para importar/actualizar insumos.
 * Espera el formato: InsumoID,NombreInsumo,StockMinimo
 * @param {string} csvText - Contenido del archivo CSV.
 */
async function handleInsumosCSVImport(csvText) {
    const rows = csvText.split('\n').slice(1).filter(row => row.trim() !== ''); // Ignorar encabezado y filas vacías
    if (rows.length === 0) {
        showNotification("El archivo CSV de insumos está vacío o no tiene datos válidos.", "warning"); return;
    }
    showNotification(`Importando ${rows.length} insumos...`, "info");
    
    try {
        const batch = writeBatch(db);
        const existingInsumos = new Map(); // Map<nombre_insumo_lower, id_insumo>
        const insumosSnapshot = await getDocs(collection(db, "insumos"));
        insumosSnapshot.forEach(doc => existingInsumos.set(doc.data().nombre.toLowerCase(), doc.id));

        for (const row of rows) {
            const columns = row.split(',').map(s => s.trim().replace(/"/g, '')); // Simple split, no maneja comas dentro de comillas
            if (columns.length < 3) {
                console.warn(`Fila CSV de insumo inválida (menos de 3 columnas): ${row}`);
                continue;
            }

            const idOriginal = columns[0]; // Podría ser un ID externo o un ID de Firestore si se reimporta
            const nombreInsumo = columns[1];
            const stockMinimo = parseInt(columns[2], 10) || 0;
            
            if (!nombreInsumo) {
                console.warn(`Saltando insumo con nombre vacío en CSV: ${row}`);
                continue;
            }

            const existingId = existingInsumos.get(nombreInsumo.toLowerCase());

            if (existingId) {
                // Actualizar insumo existente
                const insumoRef = doc(db, "insumos", existingId);
                batch.update(insumoRef, {
                    stock_minimo: stockMinimo,
                    id_original: idOriginal // Actualizar id_original si viene en el CSV
                });
            } else {
                // Crear nuevo insumo
                const newInsumoRef = doc(collection(db, "insumos"));
                batch.set(newInsumoRef, {
                    nombre: nombreInsumo,
                    stock_minimo: stockMinimo,
                    existencia_total: 0, // Se actualizará al importar lotes o manualmente
                    id_original: idOriginal,
                    created_at: new Date().toISOString()
                });
            }
        }
        await batch.commit();
        showNotification("Insumos importados/actualizados. Recargando lista...", "success");
        await fetchAndRenderInsumos();
    } catch (error) {
        console.error("Error al importar insumos CSV:", error);
        showNotification("Error al importar insumos: " + error.message, "error");
    }
}

/**
 * Procesa un CSV para importar/actualizar lotes.
 * Espera el formato: InsumoID,NombreInsumo,StockMinimo,NumeroLote,FechaCaducidad,ExistenciaLote
 * @param {string} csvText - Contenido del archivo CSV.
 */
async function handleLotesCSVImport(csvText) {
    const rows = csvText.split('\n').slice(1).filter(row => row.trim() !== ''); // Ignorar encabezado y filas vacías
    if (rows.length === 0) {
        showNotification("El archivo CSV de lotes está vacío o no tiene datos válidos.", "warning"); return;
    }
    showNotification(`Importando ${rows.length} lotes...`, "info");

    try {
        const batch = writeBatch(db);
        const insumoMap = new Map(); // Map<nombre_insumo_lower, id_insumo_firestore>

        // Primero, obtener todos los insumos para mapear nombres a IDs de Firestore
        const insumosSnapshot = await getDocs(collection(db, "insumos"));
        insumosSnapshot.forEach(doc => insumoMap.set(doc.data().nombre.toLowerCase(), doc.id));

        const updatedInsumoIds = new Set(); // Para saber qué insumos necesitan actualizar su existencia total

        for (const row of rows) {
            const columns = row.split(',').map(s => s.trim().replace(/"/g, ''));
            if (columns.length < 6) {
                console.warn(`Fila CSV de lote inválida (menos de 6 columnas): ${row}`);
                continue;
            }

            const nombreInsumo = columns[1];
            const numeroLote = columns[3];
            const fechaCaducidad = columns[4];
            const existenciaLote = parseInt(columns[5], 10) || 0;

            if (!nombreInsumo || !numeroLote) {
                console.warn(`Saltando lote con nombre de insumo o número de lote vacío: ${row}`);
                continue;
            }

            const insumoId = insumoMap.get(nombreInsumo.toLowerCase());
            if (!insumoId) {
                console.warn(`Insumo "${nombreInsumo}" no encontrado para el lote. Saltando lote: ${row}`);
                continue;
            }

            // Buscar si el lote ya existe para este insumo
            const existingLotesQuery = query(collection(db, "lotes"), 
                where("insumo_id", "==", insumoId),
                where("lote", "==", numeroLote)
            );
            const existingLotesSnapshot = await getDocs(existingLotesQuery);

            if (!existingLotesSnapshot.empty) {
                // Actualizar lote existente
                const loteRef = existingLotesSnapshot.docs[0].ref;
                batch.update(loteRef, {
                    fecha_caducidad: fechaCaducidad,
                    existencia: existenciaLote
                });
            } else {
                // Crear nuevo lote
                const newLoteRef = doc(collection(db, "lotes"));
                batch.set(newLoteRef, {
                    insumo_id: insumoId,
                    lote: numeroLote,
                    fecha_caducidad: fechaCaducidad,
                    existencia: existenciaLote,
                    created_at: new Date().toISOString()
                });
            }
            updatedInsumoIds.add(insumoId); // Marca el insumo para actualizar su existencia total
        }

        await batch.commit();

        // Actualizar existencias totales para los insumos afectados
        for (const id of updatedInsumoIds) {
            await updateInsumoTotalExistence(id);
        }

        showNotification("Lotes importados/actualizados. Recargando lista...", "success");
        await fetchAndRenderInsumos();
    } catch (error) {
        console.error("Error al importar lotes CSV:", error);
        showNotification("Error al importar lotes: " + error.message, "error");
    }
}


// --- Funciones de Selección Múltiple ---

/** Actualiza la visibilidad del botón de eliminar seleccionados. */
function updateDeleteSelectedButtonVisibility() {
    const checkedCheckboxes = document.querySelectorAll('.insumo-checkbox:checked');
    if (checkedCheckboxes.length > 0) {
        btnDeleteSelected.style.display = 'inline-flex';
    } else {
        btnDeleteSelected.style.display = 'none';
    }
}

/** Maneja la eliminación de múltiples insumos seleccionados. */
async function handleDeleteSelected() {
    const selectedInsumoIds = Array.from(document.querySelectorAll('.insumo-checkbox:checked'))
                                   .map(checkbox => checkbox.dataset.id);

    if (selectedInsumoIds.length === 0) {
        showNotification("No hay insumos seleccionados para eliminar.", "warning");
        return;
    }

    const confirmed = await showConfirm(`¿Seguro que quieres eliminar ${selectedInsumoIds.length} insumo(s) seleccionado(s) y todos sus lotes asociados? Esta acción es irreversible.`);
    if (!confirmed) return;

    showNotification(`Eliminando ${selectedInsumoIds.length} insumo(s)...`, "info");
    const batch = writeBatch(db);
    let successCount = 0;
    let errorCount = 0;

    for (const insumoId of selectedInsumoIds) {
        try {
            // Eliminar todos los lotes asociados
            const lotesQuery = query(collection(db, "lotes"), where("insumo_id", "==", insumoId));
            const lotesSnapshot = await getDocs(lotesQuery);
            lotesSnapshot.forEach(doc => batch.delete(doc.ref));
            
            // Eliminar el insumo
            batch.delete(doc(db, "insumos", insumoId));
            successCount++;
        } catch (error) {
            console.error(`Error al eliminar insumo ${insumoId}:`, error);
            errorCount++;
        }
    }

    try {
        await batch.commit();
        showNotification(`Eliminación completada: ${successCount} insumo(s) eliminados, ${errorCount} errores.`, "success");
        await fetchAndRenderInsumos(); // Recargar la tabla
    } catch (batchError) {
        console.error("Error al ejecutar el batch de eliminación:", batchError);
        showNotification("Error al completar la eliminación de insumos.", "error");
    }
}

// --- Autenticación y Carga Inicial ---

/**
 * Listener para el estado de autenticación de Firebase.
 * Redirige si no hay usuario logueado y actualiza la UI del sidebar.
 */
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid;
        userEmailDisplaySidebar.textContent = user.email;
        // Opcional: Obtener rol del usuario si lo tienes en custom claims
        try {
            const idTokenResult = await user.getIdTokenResult();
            isAdmin = idTokenResult.claims.role === 'administrador'; // Establece el estado de admin
            // Oculta/muestra elementos .admin-only si es necesario en esta página
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = isAdmin ? '' : 'none';
            });
        } catch (error) {
            console.error("Error al obtener claims de ID:", error);
            isAdmin = false; // Por seguridad, si falla, asume que no es admin
        }
        await fetchAndRenderInsumos(); // Carga los datos una vez autenticado
    } else {
        // Si no hay usuario logueado, redirige a la página de inicio de sesión
        window.location.href = '../../index.html';
    }
});

// --- Event Listeners ---

// Sidebar toggle para dispositivos móviles
document.getElementById('menu-toggle-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('expanded');
});

// Cierre de sesión
userLogoutBtnSidebar.addEventListener('click', async () => {
    await signOut(auth);
});

// Abrir modal para añadir nuevo insumo/lote
btnAddProduct.addEventListener('click', () => openModal());

// Cerrar modales
closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));

// Enviar formulario (añadir/editar)
productForm.addEventListener('submit', handleFormSubmit);

// Delegación de eventos para botones de editar/eliminar en la tabla
productTableBody.addEventListener('click', async (e) => {
    const targetButton = e.target.closest('.btn-edit, .btn-delete');
    if (!targetButton) return;

    const action = targetButton.dataset.action;
    const id = targetButton.dataset.id;
    const name = targetButton.dataset.nombre || targetButton.dataset.loteNombre; // Nombre para el mensaje de confirmación

    if (action === 'edit-insumo') {
        const insumoDoc = await getDoc(doc(db, "insumos", id));
        if (insumoDoc.exists()) {
            openModal(insumoDoc.data());
        } else {
            showNotification("Insumo no encontrado.", "error");
        }
    } else if (action === 'edit-lote') {
        const insumoId = targetButton.dataset.insumoId;
        const insumoDoc = await getDoc(doc(db, "insumos", insumoId));
        if (!insumoDoc.exists()) {
            showNotification("Insumo padre del lote no encontrado.", "error");
            return;
        }
        const loteData = JSON.parse(targetButton.dataset.lote); // Parsear el objeto lote completo
        openModal(insumoDoc.data(), loteData);
    } else if (action === 'delete-insumo' || action === 'delete-lote') {
        await handleDelete(action, id, name);
    }
});

// Delegación de eventos para mostrar/ocultar lotes
productTableBody.addEventListener('click', (e) => {
    const toggleButton = e.target.closest('.btn-toggle-lotes');
    if (toggleButton) {
        const insumoId = toggleButton.dataset.insumoId;
        const loteContainerRow = document.querySelector(`tr[data-lote-for="${insumoId}"]`);
        if (loteContainerRow) {
            if (loteContainerRow.style.display === 'none') {
                loteContainerRow.style.display = 'table-row';
                toggleButton.textContent = 'Ocultar Lotes';
            } else {
                loteContainerRow.style.display = 'none';
                toggleButton.textContent = `Mostrar Lotes (${toggleButton.textContent.match(/\d+/)[0]})`; // Mantener el conteo
            }
        }
    }
});

// Búsqueda en tiempo real
searchInput.addEventListener('input', async () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm === '') {
        await fetchAndRenderInsumos(); // Recargar todos si la búsqueda está vacía
        return;
    }

    productTableBody.innerHTML = `<tr><td colspan="5">Buscando...</td></tr>`;
    try {
        const insumosRef = collection(db, "insumos");
        // Firestore no soporta búsquedas de texto completo como 'contains'
        // Se realizará una búsqueda simple por prefijo o se cargarán todos para filtrar en el cliente
        // Para una búsqueda más avanzada, se necesitaría un servicio de búsqueda externo (ej. Algolia)
        
        // Estrategia: Cargar todos los insumos y filtrar en el cliente
        const allInsumosSnapshot = await getDocs(query(insumosRef, orderBy("nombre")));
        const filteredInsumos = allInsumosSnapshot.docs.filter(doc => 
            doc.data().nombre.toLowerCase().includes(searchTerm)
        );

        if (filteredInsumos.length === 0) {
            productTableBody.innerHTML = `<tr><td colspan="5">No se encontraron insumos.</td></tr>`;
            return;
        }

        let tableHtml = '';
        for (const insumoDoc of filteredInsumos) {
            const insumo = { id: insumoDoc.id, ...insumoDoc.data() };
            const lotesQuery = query(collection(db, "lotes"), where("insumo_id", "==", insumo.id));
            const lotesSnapshot = await getDocs(lotesQuery);
            const lotes = lotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            tableHtml += `
                <tr class="insumo-row" data-insumo-id="${insumo.id}">
                    <td><input type="checkbox" class="insumo-checkbox" data-id="${insumo.id}"></td>
                    <td><strong>${insumo.nombre}</strong></td>
                    <td>${insumo.existencia_total || 0}</td>
                    <td>${insumo.stock_minimo}</td>
                    <td class="action-buttons">
                        <button class="btn btn-edit" data-action="edit-insumo" data-id="${insumo.id}" data-nombre="${insumo.nombre}" data-stock-minimo="${insumo.stock_minimo}">Editar</button>
                        <button class="btn btn-delete" data-action="delete-insumo" data-id="${insumo.id}" data-nombre="${insumo.nombre}">Eliminar</button>
                    </td>
                </tr>
            `;
            if (lotes.length > 0) {
                tableHtml += `<tr class="lote-toggle-row" data-lote-toggle-for="${insumo.id}"><td colspan="5" style="text-align: center;"><button class="btn btn-secondary btn-toggle-lotes" data-insumo-id="${insumo.id}">Mostrar Lotes (${lotes.length})</button></td></tr>`;
                tableHtml += `<tr class="lote-container-row" data-lote-for="${insumo.id}" style="display:none;"><td colspan="5"><table><thead><tr><th>Lote</th><th>Caducidad</th><th>Existencia</th><th>Acciones</th></tr></thead><tbody>`;
                lotes.forEach(lote => {
                    tableHtml += `
                        <tr>
                            <td>${lote.lote || 'N/A'}</td>
                            <td>${lote.fecha_caducidad || 'N/A'}</td>
                            <td>${lote.existencia}</td>
                            <td class="action-buttons">
                                <button class="btn btn-edit" data-action="edit-lote" data-id="${lote.id}" data-insumo-id="${insumo.id}" data-insumo-nombre="${insumo.nombre}" data-stock-minimo="${insumo.stock_minimo}" data-lote='${JSON.stringify(lote)}'>Editar</button>
                                <button class="btn btn-delete" data-action="delete-lote" data-id="${lote.id}" data-lote-nombre="${lote.lote || 'este lote'}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                });
                tableHtml += `</tbody></table></td></tr>`;
            }
        }
        productTableBody.innerHTML = tableHtml;
        updateDeleteSelectedButtonVisibility(); // Actualiza el botón de eliminar seleccionados
    } catch (error) {
        console.error("Error buscando insumos:", error);
        showNotification("Error al buscar insumos.", "error");
    }
});


// CSV Dropdown Toggle
btnCSVActions.addEventListener('click', (e) => {
    e.stopPropagation(); // Evita que el clic se propague al documento
    csvDropdownMenu.parentElement.classList.toggle('show');
});

// Close dropdown if clicked outside
document.addEventListener('click', (e) => {
    if (!csvActionsContainer.contains(e.target)) {
        csvDropdownMenu.parentElement.classList.remove('show');
    }
});

// CSV Export
btnExportCSV.addEventListener('click', (e) => {
    e.preventDefault();
    exportToCSV();
    csvDropdownMenu.parentElement.classList.remove('show');
});

// CSV Import (Insumos)
btnImportInsumosCSV.addEventListener('click', (e) => {
    e.preventDefault();
    currentImportType = 'insumos';
    csvFileInput.click(); // Trigger file input click
    csvDropdownMenu.parentElement.classList.remove('show');
});

// CSV Import (Lotes)
btnImportLotesCSV.addEventListener('click', (e) => {
    e.preventDefault();
    currentImportType = 'lotes';
    csvFileInput.click(); // Trigger file input click
    csvDropdownMenu.parentElement.classList.remove('show');
});

// File input change listener
csvFileInput.addEventListener('change', handleCSVFile);


// --- Event Listeners para Selección Múltiple ---

// Seleccionar/Deseleccionar todos
selectAllCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    document.querySelectorAll('.insumo-checkbox').forEach(checkbox => {
        checkbox.checked = isChecked;
    });
    updateDeleteSelectedButtonVisibility();
});

// Actualizar el estado del checkbox "seleccionar todo" y el botón de eliminar
productTableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('insumo-checkbox')) {
        const allCheckboxes = document.querySelectorAll('.insumo-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.insumo-checkbox:checked');
        selectAllCheckbox.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
        updateDeleteSelectedButtonVisibility();
    }
});

// Eliminar seleccionados
btnDeleteSelected.addEventListener('click', handleDeleteSelected);
