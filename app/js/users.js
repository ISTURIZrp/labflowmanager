import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://TU_PROYECTO.supabase.co',
  'TU_ANON_KEY' // clave pública (solo para `signUp`)
);

const form = document.getElementById('formUsuarios');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('correo').value;
  const password = document.getElementById('password').value;
  const rol = document.getElementById('rol').value;

  // Paso 1: Registrar usuario
  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    alert('Error al registrar usuario: ' + authError.message);
    return;
  }

  const userId = authUser.user.id; // ← aquí tienes el ID del usuario registrado

  // Paso 2: Guardar en tabla personalizada "usuarios"
  const { error: dbError } = await supabase.from('usuarios').insert({
    id: userId,
    correo: email,
    rol: rol
  });

  if (dbError) {
    alert('Error al guardar en tabla usuarios: ' + dbError.message);
  } else {
    alert('Usuario registrado correctamente');
    form.reset();
    cargarUsuarios(); // si tienes una tabla visual
  }
});