<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LabFlow Manager - Inicio</title>
    <!-- Enlace a tu archivo CSS general si lo necesitas para el layout de la app -->
    <link rel="stylesheet" href="../css/style.css">
    <style>
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: #f0f4f8;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: #2c3e50;
        }
        .welcome-container {
            background-color: #ffffff;
            border: 1px solid #d1d9e6;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(44, 62, 80, 0.15);
            text-align: center;
            max-width: 600px;
            width: 100%;
        }
        h1 {
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 20px;
            color: #4fc3f7; /* Color de acento */
        }
        p {
            font-size: 1.1rem;
            color: #607d8b;
            margin-bottom: 30px;
        }
        .logout-btn {
            background-color: #ef5350; /* Rojo para salir */
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: background-color 0.3s ease;
        }
        .logout-btn:hover {
            background-color: #d32f2f;
        }
    </style>
</head>
<body>
    <div class="welcome-container">
        <h1>¡Bienvenido a LabFlow Manager!</h1>
        <p>Has iniciado sesión correctamente. Este es tu panel de control.</p>
        <button id="logoutBtn" class="logout-btn">Cerrar Sesión</button>
    </div>

    <!-- Script para la lógica de cierre de sesión (necesitará Firebase Auth) -->
    <script type="module">
        import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';

        // Usa las variables globales proporcionadas por el entorno de Canvas
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = '../../index.html'; // Redirige a la página de login
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                alert("Error al cerrar sesión. Intenta de nuevo."); // Usar un modal en una app real
            }
        });
    </script>
</body>
</html>
