# Explicación del proceso de desarrollo — CareerPath

Este documento registra, historia de usuario por historia de usuario, qué se construyó, cómo y por qué se tomó cada decisión técnica. Sirve como respaldo para la sustentación del proyecto.

---

## Fase 0 — Cimentación (prerrequisito antes de HU-01)

Antes de poder implementar cualquier historia de usuario hizo falta el esqueleto mínimo del proyecto: no existía backend, frontend ni base de datos.

### Estructura creada

```
backend/
  app/
    main.py          # instancia de FastAPI, CORS, routers
    config.py         # lee DATABASE_URL desde .env
    database.py        # engine SQLAlchemy, sesión, Base declarativa
    models.py          # modelos ORM (User)
    schemas.py          # esquemas Pydantic de entrada/salida
    security.py         # hashing de contraseñas
    routers/
      auth.py            # endpoints de autenticación
  alembic/               # migraciones de base de datos
  requirements.txt
  .env / .env.example
frontend/
  index.html
  css/styles.css
  js/api.js               # wrapper fetch hacia la API
  js/app.js                # punto de entrada de la SPA
  js/views/register.js      # vista de registro
docker-compose.yml         # contenedor de PostgreSQL
```

### Decisiones tomadas y por qué

- **PostgreSQL vía Docker Compose**: aísla la base de datos del sistema operativo y hace el entorno reproducible. Se definió el servicio `db` con usuario/clave/base `careerpath` y un volumen persistente para no perder datos entre reinicios.
- **venv + pip** para el entorno Python: es el estándar más simple, sin curva de aprendizaje adicional (se descartó Poetry/uv para no sumar herramientas nuevas a un proyecto que ya tiene bastante superficie por cubrir en poco tiempo).
- **Python 3.12 en vez de 3.14**: la máquina tenía instalado Python 3.14 (recién liberado), y paquetes clave (`pydantic-core`, `bcrypt`) todavía no publican wheels precompilados para esa versión. El intento de compilarlos desde código fuente falló por un problema de linker de MSVC/Rust. En vez de pelear con la cadena de compilación, se instaló Python 3.12 (LTS, con soporte completo de todas las librerías necesarias) y el entorno virtual del backend se recreó con esa versión. Python 3.14 sigue instalado en el sistema sin tocarse.
- **`psycopg` (v3) en vez de `psycopg2-binary`**: por el mismo motivo de compatibilidad con el entorno, se usó el driver más nuevo, que además es el recomendado activamente por el proyecto psycopg.
- **SQLAlchemy 2.0 + Alembic**: SQLAlchemy como ORM y Alembic para versionar el esquema de la base de datos mediante migraciones (en vez de crear las tablas directamente con `Base.metadata.create_all`), de forma que cualquier cambio futuro al modelo de datos quede documentado y sea reproducible.
- **CORS configurado explícitamente** en `main.py` para aceptar peticiones desde `http://localhost:5500` / `http://127.0.0.1:5500`, que es donde corre el frontend estático durante desarrollo (por ejemplo con la extensión Live Server de VS Code, o `python -m http.server 5500`).
- **Frontend sin framework ni build tool**: JS vanilla con módulos de script simples (`api.js`, `app.js`, `js/views/*.js`) cargados directamente en `index.html`, tal como define el stack del proyecto. `api.js` centraliza las llamadas `fetch` a la API para no repetir lógica de manejo de errores en cada vista.

---

## HU-01 · Registro de usuario — **Must**

> *Como visitante, quiero crear una cuenta para acceder a la plataforma y guardar mis resultados.*

### Criterios de aceptación y cómo se cumplieron

| Criterio | Cómo se implementó |
|---|---|
| Correo único | Columna `email` con restricción `UNIQUE` + índice en el modelo `User` (`models.py`). El endpoint además verifica explícitamente si el correo ya existe antes de insertar, para devolver un mensaje de error claro (400) en vez de un error genérico de base de datos. |
| Contraseña con requisitos mínimos de seguridad | Validador de Pydantic (`schemas.py`, `UserCreate.password_must_be_strong`): mínimo 8 caracteres, al menos una letra y al menos un número. Se valida en el esquema de entrada, antes de tocar la base de datos. |
| Rol "usuario" por defecto | Columna `role` en el modelo `User` con `default="usuario"` y restricción `CHECK (role IN ('usuario','admin'))` a nivel de base de datos, para que el dato nunca pueda quedar en un valor inválido aunque se inserte por fuera de la API. |
| Confirmación clara de éxito/error | El endpoint `POST /auth/register` responde `201 Created` con los datos públicos del usuario (`UserOut`: id, email, role, created_at) si todo sale bien; `400` con mensaje si el correo ya existe; `422` (generado automáticamente por FastAPI/Pydantic) con el detalle del campo inválido si la contraseña es débil o el correo no tiene formato válido. |

### Decisiones de seguridad

- **Hashing con `bcrypt` directo** (no `passlib`): se evaluó `passlib[bcrypt]`, que es la opción más citada en tutoriales, pero tiene un conflicto conocido con versiones recientes de `bcrypt` (>=4.1) que genera errores/warnings. Para no depender de una librería con ese problema abierto, se usa `bcrypt` directamente (`security.py::hash_password`), que es la librería que `passlib` usa por debajo de todas formas.
- **La contraseña nunca se devuelve ni se loguea**: el esquema de salida (`UserOut`) no incluye `password` ni `hashed_password`; solo se expone `id`, `email`, `role`, `created_at`.

### Pruebas realizadas

Se probó el flujo completo de extremo a extremo (backend real + PostgreSQL real en Docker, no mocks):

1. **Registro exitoso**: `POST /auth/register` con correo y contraseña válidos → `201`, usuario creado con rol `usuario`, contraseña almacenada como hash bcrypt (verificado directamente en la tabla `users` vía `psql`, nunca en texto plano).
2. **Correo duplicado**: segundo registro con el mismo correo → `400` con mensaje "El correo ya está registrado".
3. **Contraseña sin número**: → `422` con mensaje de validación específico.
4. **Contraseña menor a 8 caracteres**: → `422` con mensaje específico.
5. **Correo con formato inválido**: → `422` (validación automática de `EmailStr`).

Todas las pruebas se ejecutaron contra el servidor real (`uvicorn`) y la base de datos real (contenedor `postgres:16`), no con mocks, siguiendo el mismo criterio de "probado manualmente" que exige la Definition of Done del plan de ruta.

### Cómo correr esta historia localmente

```bash
# 1. Levantar PostgreSQL
docker compose up -d

# 2. Activar entorno virtual e instalar dependencias (una sola vez)
cd backend
python -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt

# 3. Aplicar migraciones
./venv/Scripts/python.exe -m alembic upgrade head

# 4. Levantar el backend
./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000

# 5. Servir el frontend (en otra terminal)
python -m http.server 5500 --directory frontend
# abrir http://127.0.0.1:5500 en el navegador
```

### Pendiente de verificación manual en navegador

El formulario de registro (`frontend/js/views/register.js`) se probó sirviendo los archivos estáticos y confirmando que cargan correctamente (200 OK en HTML/CSS/JS), pero la interacción visual completa (llenar el formulario y ver el mensaje de éxito/error en el navegador) debe confirmarse abriendo `http://127.0.0.1:5500` manualmente, ya que este entorno de desarrollo no tiene un navegador gráfico disponible para automatizar esa verificación.

---

## HU-02 · Inicio de sesión — **Must**

> *Como usuario registrado, quiero iniciar sesión para acceder a mi cuenta de forma segura.*

### Criterios de aceptación y cómo se cumplieron

| Criterio | Cómo se implementó |
|---|---|
| Autenticación con correo/contraseña y emisión de JWT | `POST /auth/login` (`routers/auth.py`) recibe `UserLogin` (email + password), busca el usuario por correo y compara la contraseña con `verify_password` (bcrypt). Si es válida, genera un JWT firmado con `create_access_token`. |
| Rutas protegidas rechazan acceso sin token válido | Dependencia `get_current_user` (`dependencies.py`), que se inyecta con `Depends()` en cualquier endpoint que deba exigir sesión. Decodifica el JWT del header `Authorization: Bearer <token>`; si el token falta, es inválido o expiró, responde `401`. Se aplicó de entrada al nuevo endpoint `GET /auth/me`. |
| El rol determina qué vistas puede consultar | El JWT incluye el claim `role` además de `sub` (email). Se creó la dependencia genérica `require_role(rol_requerido)` (`dependencies.py`), que reutiliza `get_current_user` y responde `403` si el rol del usuario autenticado no coincide. Esta dependencia queda lista para usarse en los endpoints de administración de la Fase 5 (HU-08); por ahora se validó con tests automatizados (ver abajo) porque todavía no existe ningún endpoint exclusivo de administrador en el alcance actual. |

### Decisiones técnicas

- **PyJWT en vez de `python-jose`**: `python-jose` es la librería que más aparece en tutoriales de FastAPI, pero tiene historial de vulnerabilidades sin mantenimiento activo tan constante. `PyJWT` es más simple, activamente mantenida, y es todo lo que se necesita para firmar/verificar con HS256.
- **Firma simétrica (HS256) en vez de asimétrica (RS256)**: el mismo servicio (FastAPI) es el único que emite y valida tokens; no hay otro servicio externo que necesite verificar la firma con una clave pública separada. RS256 solo aportaría complejidad adicional sin beneficio real aquí.
- **Login recibe JSON (`UserLogin`), no el formulario OAuth2 estándar (`OAuth2PasswordRequestForm`)**: FastAPI/Swagger suelen documentarse con el flujo de formulario `username`/`password` porque así funciona el botón "Authorize" de `/docs` out-of-the-box. Se prefirió mantener el endpoint de login consistente con el resto de la API (JSON, igual que `/auth/register`), ya que el frontend es una SPA que solo habla JSON vía `fetch`. La contrapartida es que el candado de Swagger UI no autentica automáticamente, pero cada endpoint se puede seguir probando individualmente desde `/docs` con "Try it out".
- **Mensaje de error genérico en login** ("Credenciales inválidas") tanto si el correo no existe como si la contraseña es incorrecta: evita que un atacante pueda usar el endpoint de login para enumerar qué correos están registrados.
- **Token expira en 60 minutos** (`ACCESS_TOKEN_EXPIRE_MINUTES` en `config.py`): tiempo suficiente para una sesión de uso normal del test vocacional sin dejar tokens válidos indefinidamente. No se implementó refresh token porque el alcance del proyecto no lo requiere (no hay historia de usuario que lo pida).
- **`JWT_SECRET_KEY` generado con `secrets.token_hex(32)`** y guardado solo en `.env` (ignorado por git), nunca hardcodeado en el código ni en `.env.example` (que solo trae un placeholder).
- **`GET /auth/me` como endpoint protegido de prueba**: no corresponde a ninguna historia de usuario por sí solo, pero es el mecanismo estándar para que el frontend confirme quién es el usuario autenticado y qué rol tiene justo después del login (se usa en `login.js` para mostrar "Sesión iniciada como X (rol: Y)"), y sirve como la ruta protegida sobre la que se valida el criterio de aceptación de HU-02.

### Pruebas realizadas

**Automatizadas** (`backend/tests/test_auth.py`, con `pytest`):
1. Un token creado con `create_access_token` se decodifica correctamente y conserva `sub` y `role`.
2. `decode_access_token` rechaza un token con formato inválido.
3. `get_current_user` responde `401` ante un token inválido (sin necesidad de tocar la base de datos, ya que la validación del token ocurre antes).
4. `require_role("admin")` permite el paso a un usuario con rol `admin`.
5. `require_role("admin")` rechaza con `403` a un usuario con rol `usuario`.

Se optó por probar `require_role` con un test unitario en vez de crear un endpoint de administración ficticio solo para probarlo, ya que ese endpoint no corresponde a ninguna historia de usuario del alcance actual (llegará en la Fase 5, HU-08) y habría sido código sin propósito real.

**Manuales end-to-end** (backend real + PostgreSQL real, vía curl):
1. Login con credenciales correctas → `200` con `access_token` JWT.
2. Login con contraseña incorrecta → `401` "Credenciales inválidas".
3. `GET /auth/me` sin header `Authorization` → `401`.
4. `GET /auth/me` con un token inválido/falso → `401`.
5. `GET /auth/me` con el token válido obtenido en el login → `200` con los datos del usuario (id, email, rol, fecha de creación).

### Frontend

Se agregó `frontend/js/views/login.js`: formulario de correo/contraseña que llama a `/auth/login`, guarda el `access_token` en `localStorage`, y luego llama a `/auth/me` para mostrar confirmación de sesión con el rol del usuario. `api.js` se extendió con `apiGet` y un `apiRequest` genérico que adjunta automáticamente el header `Authorization: Bearer <token>` cuando hay un token guardado. Las vistas de registro y login ahora se enlazan entre sí (registro → login y viceversa) mediante un enlace simple, sin necesidad de un router de SPA completo (no hay aún más de dos vistas).

### Pendiente de verificación manual en navegador

Igual que con HU-01: se confirmó que `login.js` se sirve correctamente (200 OK) y la lógica se probó de extremo a extremo por API, pero la interacción visual (formulario de login, navegación entre vistas, mensaje de bienvenida con el rol) debe confirmarse abriendo `http://127.0.0.1:5500` en un navegador real.
