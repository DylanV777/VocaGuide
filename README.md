# VocaGuide

## Resumen de cambios (Frontend 2)

- **Login:** se corrigió `Login()` para envolver los inputs en un `form` con id `loginForm`, permitiendo que `loginEvents()` capture y maneje el submit correctamente.
- **Registro:** se implementó la interfaz de registro en `src/pages/register/register.js` con validación cliente (nombre, email, contraseña y confirmación). Actualmente el registro se simula en frontend y redirige a la pantalla de login.
- **Revisión general:** se revisaron y limpiaron archivos clave: `src/pages/results/results.js`, `src/main.js`, `src/router/router.js`, `src/services/api.js`, `src/services/resultService.js`, `src/utils/storage.js`.

## Integración del endpoint de registro (nota para frontend)

- Endpoint esperado: `POST /auth/register`.
- Payload JSON: `{ name, email, password }`.
- Respuesta esperada (ejemplo): `{ success: true, token: "<jwt>", user: { id, name, email } }` o `{ success: false, message: "..." }`.
- Archivo UI: [src/pages/register/register.js](src/pages/register/register.js) contiene el formulario y la validación cliente; actualmente simula el registro en frontend y redirige a la pantalla de login.
- Integración recomendada: implementar `register()` en [src/services/authService.js](src/services/authService.js) que haga la petición al endpoint y devuelva el objeto de respuesta; luego reemplazar la simulación en `registerEvents()` por la llamada real y, si `success`, usar `saveSession(token, user)` y `navigate('/')`.
- Pruebas locales: arrancar el backend (si existe) y probar registro con datos reales para verificar token y navegación.

## Verificación del flujo (Pruebas manuales)

### Flujo de registro + login:

1. **Navega a registro:** abre `#/register` en el navegador.
2. **Valida campos cliente:**
   - Sin nombre → "Ingresa tu nombre completo."
   - Email inválido → "Ingresa un correo válido."
   - Contraseña < 6 caracteres → "La contraseña debe tener al menos 6 caracteres."
   - Contraseñas no coinciden → "Las contraseñas no coinciden."
3. **Con backend real:**
   - Rellena el formulario con datos válidos.
   - Click en "Crear cuenta".
   - Si el endpoint devuelve `{ success: true, token, user }` → se guarda sesión en `localStorage` y navega a `/` (dashboard).
   - Si error → muestra el mensaje del backend.
4. **Sin backend (frontend solo):**
   - El formulario se valida cliente pero falla la petición al backend → muestra "Error del servidor. Intenta más tarde."
   - Usa `localStorage` para probar: abre la consola del navegador y ejecuta:
     ```javascript
     localStorage.setItem('cp_token', 'test-token');
     localStorage.setItem('cp_user', JSON.stringify({ id: 1, name: 'Test' }));
     // Ahora recarga y podrás navegar a /results sin login
     ```

### Flujo de login:

1. **Navega a login:** abre `#/login` en el navegador.
2. **Ingresa credenciales válidas** → petición a `/auth/login` → si éxito, guarda sesión y navega a `/`.
3. **Cualquier vista protegida** (ej. `/results`) redirige a `/login` si no hay sesión.
