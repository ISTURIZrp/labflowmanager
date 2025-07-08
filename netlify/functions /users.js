// netlify/functions/users.js
const admin = require('firebase-admin');

let serviceAccount;
try {
  // Lee la variable de entorno Base64
  const base64ServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64ServiceAccount) {
    throw new Error('La variable de entorno FIREBASE_SERVICE_ACCOUNT_BASE64 no está definida.');
  }
  // Decodifica la cadena Base64 a un string JSON y lo parsea a un objeto
  const serviceAccountJson = Buffer.from(base64ServiceAccount, 'base64').toString('utf8');
  serviceAccount = JSON.parse(serviceAccountJson);
} catch (error) {
  console.error('Error CRÍTICO al decodificar o parsear la cuenta de servicio:', error);
  serviceAccount = null; 
}

// Inicializa la app de Firebase Admin solo si no hay errores y no ha sido inicializada previamente
if (admin.apps.length === 0 && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (initError) {
    console.error('Error al inicializar Firebase Admin SDK:', initError);
    serviceAccount = null; 
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Permite solicitudes desde cualquier origen (CORS)
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Permite estos encabezados
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' // Permite estos métodos
  };

  // Manejo de solicitudes OPTIONS (preflight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }; // 204 No Content para solicitudes OPTIONS exitosas
  }

  // Si Firebase Admin SDK no se inicializó, devuelve un error 500
  if (admin.apps.length === 0 || !serviceAccount) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Error de configuración del servidor: Firebase Admin SDK no se inicializó correctamente. Revisa tu FIREBASE_SERVICE_ACCOUNT_BASE64." })
    };
  }

  const method = event.httpMethod;
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Solicitud inválida: El cuerpo no es un JSON válido.' })
      };
    }
  }

  const { action, uid, email, password, username, role } = body; 

  let decodedToken;
  let requestorRole = 'usuario'; // Rol por defecto si no se puede verificar el token
  try {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Token de autorización no proporcionado o formato inválido.');
    }
    const idToken = authHeader.split('Bearer ')[1];
    decodedToken = await admin.auth().verifyIdToken(idToken); // Verifica el token ID del frontend
    requestorRole = decodedToken.role || 'usuario'; // Obtiene el rol de los claims personalizados
  } catch (error) {
    console.error('Error al verificar el token:', error.message);
    return {
      statusCode: 401, // No autorizado
      headers,
      body: JSON.stringify({ message: 'No autorizado: ' + error.message })
    };
  }

  const requestorUid = decodedToken.uid; // UID del usuario que hace la solicitud

  try {
    if (method === 'GET') {
      // Solo administradores pueden listar usuarios
      if (requestorRole !== 'administrador') {
        return {
          statusCode: 403, // Prohibido
          headers,
          body: JSON.stringify({ message: 'Prohibido: Solo los administradores pueden listar usuarios.' })
        };
      }

      const listUsersResult = await admin.auth().listUsers(1000); // Lista hasta 1000 usuarios
      const users = listUsersResult.users;

      const profiles = users.map(u => {
        return {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || 'N/A', // Nombre mostrado en Auth
          metadata: u.metadata,
          role: u.customClaims?.role || "usuario", // Rol de los custom claims
        };
      });
      return { statusCode: 200, headers, body: JSON.stringify(profiles) };

    } else if (method === 'POST') {
      switch (action) {
        case 'create':
          // Solo administradores pueden crear usuarios
          if (requestorRole !== 'administrador') {
            return { statusCode: 403, headers, body: JSON.stringify({ message: 'Prohibido: Solo los administradores pueden crear usuarios.' }) };
          }
          if (!email || !password || !username || !role) { 
            return { statusCode: 400, headers, body: JSON.stringify({ message: 'Faltan campos obligatorios para crear el usuario (email, password, username, role).' }) };
          }

          const newUser = await admin.auth().createUser({
            email,
            password,
            displayName: username, // Establece el displayName en Firebase Auth
          });
          
          await admin.auth().setCustomUserClaims(newUser.uid, { role }); // Asigna el rol personalizado
          
          return { statusCode: 200, headers, body: JSON.stringify({ message: 'Usuario creado exitosamente', uid: newUser.uid }) };

        case 'update':
          if (!uid || !username || !email || !role) { 
            return { statusCode: 400, headers, body: JSON.stringify({ message: 'Faltan campos obligatorios para actualizar el usuario (uid, username, email, role).' }) };
          }

          // Un usuario solo puede actualizar su propio perfil, o un administrador puede actualizar cualquier perfil
          if (requestorUid !== uid && requestorRole !== 'administrador') {
            return { statusCode: 403, headers, body: JSON.stringify({ message: 'Prohibido: No tienes permiso para actualizar este usuario.' }) };
          }

          const updates = {
            email: email,
            displayName: username,
          };
          if (password) { // Solo actualiza la contraseña si se proporciona
            updates.password = password;
          }

          await admin.auth().updateUser(uid, updates);

          const userToUpdateAuth = await admin.auth().getUser(uid);
          const currentTargetRole = userToUpdateAuth.customClaims?.role || 'usuario';

          // Solo un administrador puede cambiar roles
          if (requestorRole === 'administrador') {
            if (currentTargetRole !== role) { 
              await admin.auth().setCustomUserClaims(uid, { role });
            }
          } else {
            // Si no es admin y el rol intenta cambiarse, es un intento no autorizado
            if (currentTargetRole !== role) {
              return { statusCode: 403, headers, body: JSON.stringify({ message: 'Prohibido: No tienes permiso para cambiar el rol de un usuario.' }) };
            }
          }

          return { statusCode: 200, headers, body: JSON.stringify({ message: 'Usuario actualizado exitosamente', uid: uid }) };

        case 'delete':
          // Solo administradores pueden eliminar usuarios (y no a sí mismos)
          if (requestorRole !== 'administrador') {
            return { statusCode: 403, headers, body: JSON.stringify({ message: 'Prohibido: Solo los administradores pueden eliminar usuarios.' }) };
          }
          if (!uid) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: 'Falta el UID del usuario a eliminar.' }) };
          }
          if (requestorUid === uid) {
            return { statusCode: 403, headers, body: JSON.stringify({ message: 'Prohibido: No puedes eliminar tu propia cuenta de administrador.' }) };
          }
          await admin.auth().deleteUser(uid);
          return { statusCode: 200, headers, body: JSON.stringify({ message: 'Usuario eliminado exitosamente', uid: uid }) };
        
        case 'set-role': // Acción para cambiar solo el rol (si es necesario por separado)
          if (requestorRole !== 'administrador') {
            return { statusCode: 403, headers, body: JSON.stringify({ message: 'Prohibido: Solo los administradores pueden asignar roles.' }) };
          }
          if (!uid || !role) {
            return { statusCode: 400, headers, body: JSON.stringify({ message: 'Faltan campos obligatorios para asignar el rol (uid, role).' }) };
          }
          if (requestorUid === uid && role !== 'administrador') {
            return { statusCode: 403, headers, body: JSON.stringify({ message: 'Prohibido: No puedes degradar tu propio rol de administrador a través de esta acción.' }) };
          }

          await admin.auth().setCustomUserClaims(uid, { role });
          return { statusCode: 200, headers, body: JSON.stringify({ message: `Rol '${role}' asignado a usuario ${uid}.` }) };

        default:
          return { statusCode: 400, headers, body: JSON.stringify({ message: 'Acción no válida.' }) };
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Método no permitido.' }) };
  } catch (error) {
    console.error('Error en la función:', error);
    let statusCode = 500;
    let errorMessage = error.message;

    // Manejo de errores específicos de Firebase Auth
    if (error.code === 'auth/email-already-exists') {
      statusCode = 409;
      errorMessage = 'El correo electrónico ya está en uso.';
    } else if (error.code === 'auth/user-not-found') {
      statusCode = 404;
      errorMessage = 'Usuario no encontrado.';
    } else if (error.code === 'auth/invalid-password') {
      statusCode = 400;
      errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
    } else if (error.code === 'auth/invalid-email') {
      statusCode = 400;
      errorMessage = 'El formato del correo electrónico es inválido.';
    } else if (error.code === 'auth/weak-password') {
      statusCode = 400;
      errorMessage = 'La contraseña proporcionada es demasiado débil. Debe ser al menos de 6 caracteres.';
    } else if (error.code === 'auth/argument-error' && error.message.includes('email')) {
      statusCode = 400;
      errorMessage = 'El email proporcionado es inválido.';
    }

    return { statusCode: statusCode, headers, body: JSON.stringify({ message: errorMessage }) };
  }
};
