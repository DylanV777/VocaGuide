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

---

## HU-03 · Realizar el test vocacional — **Must**

> *Como usuario autenticado, quiero responder un test de 20 preguntas para conocer mi perfil vocacional.*

### Criterios de aceptación y cómo se cumplieron

| Criterio | Cómo se implementó |
|---|---|
| El test presenta las 20 preguntas en orden y permite responderlas todas | `GET /test/questions` (`routers/test.py`), protegido con `get_current_user`, devuelve las preguntas ordenadas por la columna `order`. El frontend (`js/views/test.js`) las muestra de a una, con navegación "Anterior"/"Siguiente" y un indicador "Pregunta X de 20". |
| No se puede enviar el test si quedan preguntas sin responder | Doble validación: en el frontend, el botón "Siguiente"/"Enviar" permanece deshabilitado hasta que la pregunta actual tiene una opción marcada, y solo se llega al botón "Enviar" tras recorrer las 20. En el backend, `validate_submission()` (`routers/test.py`) rechaza con `400` cualquier envío cuyo conjunto de `question_id` no sea exactamente igual al conjunto completo de preguntas existentes — así el backend no depende únicamente de que el frontend se comporte bien. |
| Las respuestas se envían al backend en un único envío estructurado | `POST /test/submit` recibe `TestSubmitIn { answers: [{question_id, value}, ...] }` en un solo request y persiste todo en una sola transacción (`TestAttempt` + 20 filas de `Answer`). |

### Modelo de datos y decisiones

- **Cuatro tablas nuevas**: `vocational_profiles`, `questions`, `test_attempts`, `answers`. Se separó **intento** (`test_attempts`, quién y cuándo) de **respuestas crudas** (`answers`, qué contestó en cada pregunta) porque el cálculo del perfil vocacional (HU-04, Fase 3) todavía no existe: HU-03 solo debe *recolectar y persistir* las respuestas, no interpretarlas. Cuando se construya HU-04, leerá estas filas de `answers` para calcular el perfil y creará un registro de resultado aparte — evita mezclar "lo que el usuario respondió" con "lo que el sistema concluyó", que son cosas distintas y con ciclos de vida distintos.
- **5 perfiles vocacionales, 4 preguntas cada uno** (Analítico-Científico, Creativo-Artístico, Social-Comunicativo, Técnico-Práctico, Organizacional-Administrativo) para llegar exactamente a 20 preguntas con una distribución pareja. Cada pregunta es una afirmación calificada en escala Likert de 1 a 5 ("Muy en desacuerdo" a "Muy de acuerdo"), y pertenece a un único perfil (`questions.profile_id`). Esta es la definición de "perfiles vocacionales y reglas de cálculo" (TEST-01); la regla de cálculo en sí (sumar puntajes por perfil y quedarse con el más alto) se implementará en HU-04.
- **El orden de presentación intercala los perfiles** (perfil 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, ...) en vez de agrupar las 4 preguntas de cada perfil consecutivamente. Así, dos preguntas seguidas nunca miden lo mismo, lo que reduce que el usuario note el patrón y responda de forma sesgada para "forzar" un resultado.
- **`GET /test/questions` nunca expone `profile_id`** en la respuesta (`QuestionOut` solo trae `id`, `order`, `text`). Por el mismo motivo: si el frontend supiera qué perfil mide cada pregunta, sería trivial manipular el resultado.
- **Datos semilla como migración de Alembic separada** (`cd11d45b33a2_seed_vocational_profiles_and_questions.py`), distinta de la migración que crea las tablas (`c74771156e62_create_vocational_test_tables.py`). Mantiene el principio de una migración = un cambio: una crea estructura, la otra carga datos de referencia fijos. Cualquiera que clone el proyecto y corra `alembic upgrade head` obtiene las 20 preguntas listas, sin pasos manuales adicionales.
- **Restricción `CHECK (value BETWEEN 1 AND 5)` a nivel de base de datos** en `answers`, además de la validación `Field(ge=1, le=5)` en Pydantic: doble capa de seguridad para que un valor fuera de rango no pueda llegar a la base de datos aunque se inserte por fuera de la API.
- **No hay endpoint explícito para "enviar respuestas" en el backlog técnico original** (Fase 2 solo listaba `TEST-03 Endpoint de preguntas`), pero el tercer criterio de aceptación de HU-03 exige un envío estructurado al backend. Se agregó `POST /test/submit` como tarea implícita de esta historia (documentado aquí porque no tiene código de backlog propio), separado de `RES-01`/`RES-02` (Fase 3), que se encargarán de leer estas respuestas para calcular y guardar el resultado.

### Pruebas realizadas

**Automatizadas** (`backend/tests/test_test_submission.py`, con `pytest`), sobre la función pura `validate_submission()` (sin necesidad de base de datos, mismo patrón usado en HU-02 para `require_role`):
1. Acepta un envío con exactamente las 20 preguntas válidas.
2. Rechaza un envío al que le falta una pregunta.
3. Rechaza un envío con un `question_id` que no existe.
4. Rechaza un envío con una pregunta repetida.

**Manuales end-to-end** (backend real + PostgreSQL real, vía curl):
1. `GET /test/questions` sin token → `401`.
2. `GET /test/questions` con token válido → `200` con las 20 preguntas ordenadas, sin `profile_id`.
3. `POST /test/submit` con las 20 respuestas completas → `201`, se crea 1 fila en `test_attempts` y 20 en `answers` (verificado directamente con `psql`).
4. `POST /test/submit` con 19 respuestas (falta una) → `400` "Debes responder exactamente las 20 preguntas del test, sin omitir ninguna".
5. `POST /test/submit` con una pregunta repetida → `400` "No puede haber preguntas repetidas en el envío".
6. `POST /test/submit` con un valor fuera de rango (6) → `422` (validación automática de Pydantic).

### Frontend

Se agregó `frontend/js/views/test.js`: pantalla que muestra una pregunta a la vez con 5 opciones tipo Likert, navegación "Anterior"/"Siguiente" (el botón de avanzar se deshabilita hasta marcar una opción), indicador de progreso, y en la última pregunta el botón se convierte en "Enviar", que arma el payload estructurado y llama a `POST /test/submit`. `api.js` no necesitó cambios adicionales (ya soportaba `apiGet`/`apiPost` con el header `Authorization`). Se conectó el flujo completo: un login exitoso ahora navega directamente a la vista del test (antes solo mostraba un mensaje), y `app.js` revisa si hay un `access_token` guardado en `localStorage` al cargar la página para ir directo al test sin pedir login de nuevo (persistencia de sesión entre recargas).

### Pendiente de verificación manual en navegador

La navegación entre preguntas, el estado deshabilitado del botón y el mensaje final de envío se probaron confirmando que los archivos se sirven correctamente y que la API responde como se espera en cada paso, pero la experiencia interactiva completa (clics reales, navegación entre pantallas) debe confirmarse abriendo `http://127.0.0.1:5500` en un navegador real, ya que este entorno no cuenta con uno disponible para automatizar esa verificación.

---

## HU-04 · Obtener el perfil vocacional — **Must**

> *Como usuario que completó el test, quiero ver mi perfil vocacional calculado para entender mis resultados.*

### Criterios de aceptación y cómo se cumplieron

| Criterio | Cómo se implementó |
|---|---|
| El backend calcula el perfil a partir de las respuestas según las reglas definidas | Función pura `calculate_profile()` (`routers/test.py`): suma el valor de cada respuesta al perfil de su pregunta (usando `Question.profile_id`) y devuelve el perfil con mayor puntaje total. |
| El resultado se guarda asociado al usuario | Nueva tabla `results` (modelo `Result`): `user_id`, `attempt_id` (único, un resultado por intento), `profile_id`, `created_at`. Se crea en la misma transacción que el intento y las respuestas dentro de `POST /test/submit`. |
| La pantalla de resultados muestra el perfil obtenido de forma clara | `frontend/js/views/results.js` (nueva vista `FRONT-02`): muestra el nombre y la descripción del perfil calculado en una tarjeta dedicada, reemplazando el mensaje genérico de "test enviado" que tenía la pantalla del test. |

### Decisiones técnicas

- **El cálculo se integró dentro de `POST /test/submit` en vez de crear un endpoint separado** (por ejemplo `POST /test/{attempt_id}/calculate`): para el usuario, terminar el test y ver su resultado es una sola acción; partirla en dos llamadas HTTP solo agregaría una petición de red sin ningún beneficio real, ya que el frontend siempre calcula el resultado inmediatamente después de enviar las respuestas. La separación entre "respuestas crudas" (`answers`) y "resultado calculado" (`results`) que se documentó en HU-03 se mantiene a nivel de **modelo de datos** (dos tablas con propósitos distintos), no a nivel de API.
- **Regla de desempate determinista**: si dos o más perfiles empatan en puntaje, gana el de menor `profile_id`. Es una regla simple y arbitraria (no hay ningún criterio de negocio definido por el proyecto que priorice un perfil sobre otro), pero es importante que sea **determinista**: mismas respuestas siempre deben dar el mismo resultado. Queda documentado como una simplificación consciente, no como una regla vocacional fundamentada; se puede refinar más adelante si se define un criterio de desempate más significativo (por ejemplo, el perfil de la pregunta respondida con mayor convicción).
- **`Result.attempt_id` es `UNIQUE`**: un intento (`TestAttempt`) solo puede tener un resultado calculado, reforzando a nivel de base de datos que el cálculo es 1 a 1 con el envío, y no algo que se recalcule o duplique.
- **La respuesta de `POST /test/submit` ahora incluye el perfil completo** (`code`, `name`, `description`) en vez de solo un `attempt_id`, para que el frontend pueda pintar la pantalla de resultados sin una segunda llamada a la API.

### Pruebas realizadas

**Automatizadas** (`backend/tests/test_test_submission.py`, ampliado con `pytest`), sobre la función pura `calculate_profile()` con un mapa sintético de preguntas/perfiles (independiente de los datos semilla reales, mismo patrón que las pruebas de HU-03):
1. Con puntajes claramente distintos entre dos perfiles, gana el de mayor puntaje total.
2. Con puntajes empatados entre dos perfiles, gana el de menor `profile_id` (regla de desempate documentada arriba).

**Manuales end-to-end** (backend real + PostgreSQL real, vía curl), usando el usuario de prueba `jairo@example.com`:
1. Envío del test respondiendo con valores altos (5) solo en las 4 preguntas del perfil `ANALITICO` y bajos (1) en el resto → el backend calculó y devolvió `ANALITICO` correctamente.
2. Envío de otro intento respondiendo alto solo en las preguntas del perfil `TECNICO` → el backend calculó y devolvió `TECNICO`, confirmando que el cálculo responde a las respuestas reales y no está fijo a un valor.
3. Verificación directa en la tabla `results` vía `psql`: ambos resultados quedaron guardados con el `user_id` y `profile_id` correctos, cada uno asociado a su `attempt_id`.

### Frontend

Se agregó `frontend/js/views/results.js`: una tarjeta simple que muestra el nombre del perfil vocacional y su descripción, recibidos directamente en la respuesta de `POST /test/submit` (sin necesidad de una llamada adicional a la API). Se modificó el manejador de envío en `test.js` para renderizar esta vista en lugar del mensaje genérico anterior. En ese momento no se agregó ninguna sección de carreras recomendadas en esta pantalla; esa parte se completó en HU-05 (ver más abajo).

### Pendiente de verificación manual en navegador

Se confirmó que `results.js` se sirve correctamente y que el flujo completo (login → test → envío → cálculo → resultado) funciona de extremo a extremo contra la API real, pero la vista final (tarjeta con el perfil, estilos aplicados) debe confirmarse visualmente abriendo `http://127.0.0.1:5500` en un navegador real.

---

## HU-05 · Recibir recomendación de carreras — **Must**

> *Como usuario con un perfil calculado, quiero recibir 3 carreras recomendadas para orientar mi decisión.*

### Criterios de aceptación y cómo se cumplieron

| Criterio | Cómo se implementó |
|---|---|
| El sistema recomienda exactamente 3 carreras coherentes con el perfil obtenido | Nueva tabla `careers`, cada una asociada a un único `profile_id`. Tras calcular el perfil ganador en `POST /test/submit`, se consultan las carreras de ese perfil (ordenadas por `id`) y `select_recommended_careers()` toma las primeras 3. |
| Cada carrera recomendada muestra un nombre y una breve descripción | Esquema `CareerOut` expone `id`, `name`, `description`. |
| La recomendación se muestra junto con el resultado del test | La respuesta de `POST /test/submit` ahora incluye `recommended_careers` junto con `profile`, y `frontend/js/views/results.js` las pinta en la misma pantalla, debajo del perfil. |

### Modelo de datos y decisiones

- **`Career.profile_id` como relación muchos-a-uno** (cada carrera pertenece a un único perfil), igual que `Question.profile_id`: mantiene el modelo simple y coherente con el resto del esquema. No se modeló una relación muchos-a-muchos (una carrera podría en teoría encajar con más de un perfil) porque el alcance del proyecto no lo pide y hubiera sido complejidad especulativa (YAGNI).
- **20 carreras semilla, 4 por cada uno de los 5 perfiles**, cargadas en una migración de datos separada (`74f8e78b7b31_seed_careers.py`), siguiendo el mismo patrón ya usado para las preguntas en HU-03 (una migración crea la tabla, otra separada carga los datos de referencia).
- **4 carreras por perfil en vez de exactamente 3**: deja un colchón de datos. Si en el futuro (Fase 5, HU-08) un administrador edita o elimina una carrera del catálogo, el perfil no se queda con menos de 3 y la recomendación no se rompe.
- **`select_recommended_careers()` valida que haya al menos 3 carreras disponibles y lanza un error si no las hay**, en vez de devolver silenciosamente menos de 3 o fallar de forma confusa más adelante. Esto no es una validación de entrada del usuario (el usuario no controla cuántas carreras tiene un perfil): es una verificación de integridad de los datos semilla/administrados, pensada para fallar ruidosamente si en el futuro alguien deja un perfil con menos de 3 carreras, en lugar de mostrar una recomendación incompleta sin que nadie se dé cuenta.
- **La recomendación se calculó dentro de `POST /test/submit`**, no en un endpoint aparte, por la misma razón documentada en HU-04: para el usuario, terminar el test y ver perfil + carreras recomendadas es una sola acción.
- **No se construyó todavía el catálogo completo de carreras** (listar/consultar todas, con detalle individual): eso es HU-06, Fase 4. Aquí las carreras solo se exponen como parte de la recomendación de un resultado, no hay endpoint para listarlas todas.

### Pruebas realizadas

**Automatizadas** (`backend/tests/test_test_submission.py`, con `pytest`), sobre la función pura `select_recommended_careers()`:
1. Con una lista de 4 carreras, devuelve exactamente las primeras 3.
2. Con una lista de menos de 3 carreras, lanza un error explícito en vez de devolver una recomendación incompleta.

**Manuales end-to-end** (backend real + PostgreSQL real, vía curl), usando el usuario de prueba `jairo@example.com`:
1. Envío del test sesgado hacia el perfil `SOCIAL` (preguntas 3, 8, 13, 18 con valor 5) → el backend devolvió el perfil `SOCIAL` junto con exactamente 3 carreras: Psicología, Trabajo Social y Licenciatura en Educación — las tres correspondientes a ese perfil.
2. Verificación en base de datos de que los 5 perfiles tienen 4 carreras cargadas cada uno (nunca menos de las 3 requeridas).
3. Se verificó que los caracteres especiales (tildes, eñes) se guardan y se transmiten correctamente en UTF-8 tanto en la base de datos como en la respuesta cruda de la API; una salida con codificación rara (`Ã±` en vez de `ñ`) resultó ser un artefacto de cómo una herramienta de terminal reprocesaba el JSON, no un problema real de datos.

### Frontend

Se actualizó `frontend/js/views/results.js` para recibir también `recommended_careers` de la respuesta de `POST /test/submit` y mostrarlas como una lista de tarjetas (nombre + descripción) debajo del perfil vocacional, en la misma pantalla de resultados construida en HU-04.

### Pendiente de verificación manual en navegador

Se confirmó que la nueva versión de `results.js` se sirve correctamente y que la API responde con perfil + 3 carreras coherentes en cada prueba manual, pero la vista final (tarjetas de carreras con sus estilos) debe confirmarse visualmente abriendo `http://127.0.0.1:5500` en un navegador real.

---

## HU-06 · Consultar catálogo de carreras — **Must**

> *Como usuario, quiero explorar un listado de carreras disponibles para informarme más allá de mi recomendación.*

### Criterios de aceptación y cómo se cumplieron

| Criterio | Cómo se implementó |
|---|---|
| Existe un listado accesible con todas las carreras cargadas en el sistema | `GET /careers` (`routers/careers.py`), nuevo router registrado en `main.py`. Devuelve las 20 carreras semilla ordenadas alfabéticamente por nombre. |
| Cada carrera del listado puede consultarse con su información básica | El listado (`CareerOut`) ya trae nombre y descripción de cada carrera. Además se implementó `GET /careers/{career_id}` (tarea `CAR-02`, Should, incluida en esta misma historia por ser trivial de agregar junto al listado), que devuelve el detalle de una carrera puntual junto con el perfil vocacional al que pertenece (`CareerDetailOut`), y responde `404` si el id no existe. |
| El listado carga correctamente incluso si el usuario no completó el test | El endpoint no depende en absoluto de `TestAttempt`/`Result`: consulta directamente la tabla `careers`. Se verificó registrando un usuario nuevo que nunca respondió el test y confirmando que `GET /careers` responde `200` igualmente. |

### Decisiones técnicas

- **`GET /careers` y `GET /careers/{id}` requieren autenticación** (`get_current_user`), igual que el resto de endpoints de la aplicación excepto `/auth/register` y `/auth/login`. La historia de usuario dice "Como usuario" sin especificar "visitante" ni "no autenticado" (a diferencia de cómo si se hubiera redactado explícitamente para acceso público), así que se mantuvo la misma postura de seguridad consistente con todo el resto de la API en vez de abrir una excepción puntual sin que el proyecto lo pida.
- **`CareerDetailOut` incluye el perfil vocacional relacionado**, mientras que el listado (`CareerOut`) no lo trae: así el detalle aporta algo más que el listado (si fueran idénticos, no tendría sentido tener un endpoint de detalle aparte). A diferencia de las preguntas del test (donde se oculta a propósito el perfil para que el usuario no pueda "hackear" sus respuestas), aquí no hay ningún riesgo de manipulación en mostrar la relación carrera–perfil: es información legítimamente útil para explorar el catálogo.
- **No se agregó ninguna relación (`relationship()`) de SQLAlchemy entre `Career` y `VocationalProfile`**: se mantiene el mismo estilo usado en todo `models.py` (solo columnas `ForeignKey`, sin relaciones ORM), resolviendo la carrera→perfil con una segunda consulta explícita en el endpoint. Es consistente con cómo ya se resolvía en `routers/test.py`.
- **Sin pruebas automatizadas nuevas para este endpoint**: a diferencia de HU-03/04/05, aquí no hay ninguna lógica de negocio pura que aislar (es una lectura directa de la base de datos con un `if not found → 404`), así que no había nada significativo que probar con un test unitario sin base de datos. Se verificó con pruebas manuales end-to-end, mismo criterio que se usó para `GET /test/questions` y `GET /auth/me` en HU-02/HU-03.

### Pruebas realizadas

**Manuales end-to-end** (backend real + PostgreSQL real, vía curl):
1. `GET /careers` sin token → `401`.
2. `GET /careers` con token válido → `200` con las 20 carreras ordenadas alfabéticamente.
3. `GET /careers/9` → `200` con el detalle de "Psicología" y su perfil relacionado (`SOCIAL`).
4. `GET /careers/999` (id inexistente) → `404` "Carrera no encontrada".
5. Registro de un usuario nuevo que nunca respondió el test, y `GET /careers` con su token → `200`, confirmando el tercer criterio de aceptación.

### Frontend

Se agregó `frontend/js/views/careers.js`: pantalla de catálogo que lista las carreras (nombre + descripción) y permite hacer clic en cualquiera para ver su detalle, incluyendo el perfil vocacional al que pertenece, con un botón para volver al listado. Como ahora hay más de una pantalla a la que un usuario autenticado puede querer volver (test vocacional y catálogo), se agregó una barra de navegación persistente (`<nav id="nav">` en `index.html`, controlada por `renderNav()` en `app.js`) que vive fuera del contenedor `#app` y por eso no se borra cuando cada vista reemplaza su contenido. Se muestra solo cuando hay sesión iniciada (se activa justo después del login y al recargar la página si ya hay un `access_token` guardado).

### Pendiente de verificación manual en navegador

Se confirmó que `careers.js` y los nuevos estilos se sirven correctamente y que la API responde como se espera en cada caso probado, pero la experiencia visual completa (navegación entre "Test vocacional" y "Catálogo de carreras", clic en una carrera para ver su detalle, botón de volver) debe confirmarse abriendo `http://127.0.0.1:5500` en un navegador real.

---

## HU-07 · Consultar historial de resultados — **Should**

> *Como usuario, quiero ver mis resultados anteriores para comparar mi evolución en el tiempo.*

### Criterios de aceptación y cómo se cumplieron

| Criterio | Cómo se implementó |
|---|---|
| El sistema almacena cada resultado de test con su fecha | Ya se cumplía desde HU-04: la tabla `results` guarda `created_at` en cada fila, una por intento. Esta historia no necesitó ningún cambio de modelo de datos, solo exponer lo que ya se guardaba. |
| El usuario puede ver una lista de sus resultados pasados | Nuevo endpoint `GET /test/history` (`routers/test.py`), protegido por `get_current_user`, que devuelve todos los resultados del usuario autenticado (filtrados por `Result.user_id`), del más reciente al más antiguo. |
| Se muestra al menos la fecha y el perfil obtenido en cada registro | `ResultHistoryItemOut` expone `id`, `profile` (código, nombre y descripción) y `created_at` por cada resultado. |

### Decisiones técnicas

- **El endpoint vive en el router de `test.py`** (`GET /test/history`) en vez de crear un router nuevo de "resultados": el historial es una vista distinta sobre el mismo dominio (`Result`) que ya maneja ese módulo (preguntas, envío, cálculo de perfil), así que no se justificaba partirlo en un archivo aparte solo por esta historia.
- **Orden descendente por fecha** (`Result.created_at.desc()`): para "comparar mi evolución en el tiempo" tiene más sentido ver primero el resultado más reciente.
- **Usuario sin ningún intento recibe una lista vacía (`200`, `[]`)**, no un error: no completar el test todavía es un estado válido, no una condición de error.
- **Sin pruebas automatizadas nuevas**: mismo razonamiento que en HU-06 — es una consulta directa a la base de datos filtrada y ordenada, sin ninguna regla de negocio pura que aislar en una función testeable sin base de datos. Se verificó con pruebas manuales end-to-end.
- **No se optimizó con un `JOIN` explícito** entre `results` y `vocational_profiles` (se resuelve con una consulta por cada resultado, igual que en `POST /test/submit` y `GET /careers/{id}`): a esta escala de datos (un usuario tiene, como mucho, unas pocas decenas de intentos) el costo es insignificante, y mantener el mismo patrón de "consulta explícita por relación" en todo el proyecto es más consistente que optimizar prematuramente un único endpoint.

### Pruebas realizadas

**Manuales end-to-end** (backend real + PostgreSQL real, vía curl):
1. `GET /test/history` sin token → `401`.
2. `GET /test/history` con un usuario que ya había hecho el test varias veces (en pruebas de HU-04/05) → `200` con 5 resultados, ordenados del más reciente al más antiguo, cada uno con su perfil y fecha.
3. `GET /test/history` con un usuario recién registrado que nunca respondió el test → `200` con lista vacía `[]`.

### Frontend

Se agregó `frontend/js/views/history.js`: pantalla que lista cada resultado pasado como una tarjeta con el nombre del perfil obtenido y la fecha formateada de forma legible (`toLocaleString("es-CO", ...)`). Si el usuario no tiene resultados, muestra un mensaje en vez de una lista vacía sin contexto. Se agregó un tercer botón "Mi historial" a la barra de navegación persistente (`app.js`), junto a "Test vocacional" y "Catálogo de carreras".

### Pendiente de verificación manual en navegador

Se confirmó que `history.js` se sirve correctamente y que la API responde como se espera en cada caso probado, pero la vista final (tarjetas de historial, formato de fecha, mensaje de estado vacío) debe confirmarse visualmente abriendo `http://127.0.0.1:5500` en un navegador real.

---

## HU-08 · Administrar preguntas y carreras — **Should**

> *Como administrador, quiero gestionar preguntas y carreras para mantener actualizado el contenido del test.*

### Criterios de aceptación y cómo se cumplieron

| Criterio | Cómo se implementó |
|---|---|
| El administrador puede crear, editar y eliminar preguntas | Nuevo router `routers/admin.py`: `POST /admin/questions`, `PUT /admin/questions/{id}`, `DELETE /admin/questions/{id}`. |
| El administrador puede crear, editar y eliminar carreras | `POST /admin/careers`, `PUT /admin/careers/{id}`, `DELETE /admin/careers/{id}`. |
| Solo usuarios con rol admin pueden acceder a estas operaciones | `require_role("admin")` (construido y probado desde HU-02, pero nunca usado hasta ahora) aplicado a **nivel de router completo** (`APIRouter(..., dependencies=[Depends(require_role("admin"))])`), no endpoint por endpoint: garantiza que ninguna ruta nueva bajo `/admin` pueda quedar accidentalmente desprotegida en el futuro. |

### Un bug real encontrado y corregido durante esta historia

Al probar `POST /admin/questions` por primera vez, la base de datos devolvió `duplicate key value violates unique constraint "questions_pkey"` al intentar insertar una fila con `id=1`, que ya existía. Causa raíz: las migraciones semilla de HU-03 y HU-05 (`cd11d45b33a2` y `74f8e78b7b31`) cargaron preguntas, perfiles y carreras con **ids explícitos** vía `op.bulk_insert`, lo cual en PostgreSQL no avanza la secuencia autoincremental asociada a la columna `id`. Como resultado, las secuencias de `vocational_profiles`, `questions` y `careers` quedaron ancladas en `1` mientras las tablas ya tenían filas hasta el id `20`; el primer `INSERT` de la aplicación (sin id explícito) chocaba con esas filas semilla. Esto no se había manifestado antes porque HU-01 a HU-07 solo *leían* esas tablas, nunca insertaban en ellas. Se corrigió con una nueva migración (`057904244978_fix_sequences_after_explicit_id_seed_`) que sincroniza cada secuencia con el máximo `id` real de su tabla (`setval(..., MAX(id))`), sin tocar las migraciones ya aplicadas.

### Decisiones técnicas

- **Ambos CRUD viven en un router nuevo (`admin.py`)** en vez de mezclarse dentro de `test.py`/`careers.py`: a diferencia de HU-06/07 (que reutilizaron el router existente por ser una extensión natural de esa misma funcionalidad), aquí se trata de un dominio distinto (gestión de contenido, no consumo del test), con su propio requisito transversal de autorización (`admin`), así que un archivo propio deja esa frontera más clara.
- **Dos DTOs de salida distintos para el mismo modelo `Question`**: la API pública (`GET /test/questions`, usada por quien responde el test) sigue devolviendo `QuestionOut` sin `profile_id`, por la razón ya documentada en HU-03 (no revelar qué perfil mide cada pregunta). El nuevo `AdminQuestionOut` sí incluye `profile_id`, porque el administrador necesita verlo y editarlo. Mismo modelo de datos, distinta información expuesta según quién consulta.
- **Protección de borrado para carreras (mínimo 3 por perfil)**: se extrajo como función pura `would_break_minimum_careers(current_count_for_profile, minimum_required=3)`, reutilizando la misma constante `RECOMMENDED_CAREERS_COUNT` que ya validaba `select_recommended_careers` en HU-05. Antes de esta historia, ese mínimo de 3 solo estaba protegido "hacia adelante" (fallaba al calcular una recomendación si ya faltaban carreras); ahora también se protege "hacia atrás", impidiendo que el propio CRUD cree esa situación.
- **Protección de borrado para preguntas con respuestas ya registradas**: `Answer.question_id` tiene una FK hacia `questions.id` sin `ON DELETE CASCADE`. En vez de dejar que ese error de integridad se propague como un `500` genérico, se captura `IntegrityError` y se traduce a un `400` con un mensaje claro. Esto protege la integridad de los intentos históricos (relevante para HU-07: el historial de un usuario no debe poder quedar con referencias rotas a preguntas borradas).
- **No se aplicó una protección equivalente de "mínimo de preguntas" ni de "mínimo de preguntas por perfil"**: a diferencia de las carreras (donde `select_recommended_careers` literalmente falla si faltan), no existe ninguna regla técnica en el proyecto que exija un número mínimo de preguntas o un balance por perfil — `validate_submission` y `calculate_profile` funcionan correctamente con cualquier cantidad de preguntas, siempre que el usuario responda todas las que existan en ese momento (el frontend ya calcula el total dinámicamente, no tiene el número 20 escrito a mano). Se documenta aquí como una decisión consciente: no agregar una validación para un problema que el sistema no tiene.
- **El `order` de una pregunta nueva es opcional**: si no se especifica, se autoasigna como `MAX(order) + 1`; si se especifica y ya está en uso, se rechaza con `400` en vez de reordenar silenciosamente otras preguntas.
- **Se creó un usuario administrador de prueba promoviendo manualmente su `role` a `admin` directamente en la base de datos** (`UPDATE users SET role='admin' WHERE email=...`), ya que —a propósito— no existe ningún mecanismo en la API para auto-asignarse el rol admin (ni falta que debería existir uno: la Definition of Done de este proyecto no contempla un flujo de "primer admin", así que se resuelve igual que lo haría un despliegue real, con acceso directo a la base de datos).

### Pruebas realizadas

**Automatizadas** (`backend/tests/test_admin.py`, con `pytest`), sobre la función pura `would_break_minimum_careers()`:
1. Con exactamente el mínimo (3), borrar una más rompería la regla → `True`.
2. Con margen (4), borrar una más sigue siendo seguro → `False`.
3. Con un mínimo personalizado distinto del valor por defecto, la función respeta el parámetro.

**Manuales end-to-end** (backend real + PostgreSQL real, vía curl), con un usuario admin y uno normal:
1. `GET /admin/questions` sin token → `401`; con token de usuario normal → `403`; con token admin → `200`.
2. Crear pregunta sin `order` → se autoasigna correctamente; con `profile_id` inexistente → `400`.
3. Editar una pregunta (cambiar el texto) → `200` con los datos actualizados.
4. Eliminar una pregunta sin respuestas asociadas → `204`; eliminar una pregunta que ya tiene respuestas registradas (de pruebas anteriores) → `400` con mensaje claro, no un `500`.
5. Crear carrera → `201`; con nombre duplicado → `400`.
6. Editar una carrera (descripción) → `200`.
7. Eliminar una carrera cuando su perfil queda con 4 restantes → `204` (permitido); eliminar una más cuando el perfil ya está en exactamente 3 → `400` "el perfil se quedaría con menos de 3 carreras" (verificado que efectivamente no se borró).
8. Después de las pruebas, se restauró vía la propia API la carrera de prueba que se había eliminado, dejando los 20 registros semilla intactos.

### Frontend

No se construyó una interfaz de administración en esta historia; se dejó como CRUD solo de API, probado desde `/docs` (Swagger) autenticándose con un usuario admin. La brecha frontend se cerró después, a solicitud explícita del usuario, en **HU-08b** (ver más abajo).

---

## HU-08b · Gestionar preguntas y carreras desde la interfaz — **Should**

> *Como administrador, quiero gestionar preguntas y carreras desde una pantalla propia de la aplicación en vez de usar Swagger o la base de datos directamente, para poder mantener el contenido del test de forma más ágil.*

Historia adicional dentro del alcance de HU-08 (el plan de ruta original ya pedía poder "crear, editar y eliminar sin salir de la aplicación", pero HU-08 solo se implementó a nivel de API — ver su sección "Frontend" arriba). Se numera **HU-08b** en vez de HU-10 para no chocar con la HU-10 definida más adelante en el plan de ruta ("Sistema de diseño y tema visual"), que es una historia distinta. Aquí se documenta el proceso completo de esta extensión frontend.

### Criterios de aceptación y cómo se cumplieron

| Criterio | Cómo se implementó |
|---|---|
| La opción "Administración" solo aparece en la nav si el usuario tiene rol admin | `app.js` ahora llama a `GET /auth/me` justo después de obtener el token (en `initApp()` al cargar la página, y en `login.js` justo después de un login exitoso) y guarda el rol en `localStorage`. `renderNav()` solo agrega el botón "Administración" si `localStorage.getItem("user_role") === "admin"`. |
| El administrador puede ver, crear, editar y eliminar preguntas y carreras sin salir de la app | Nueva vista `frontend/js/views/admin.js`, con dos pestañas ("Preguntas" y "Carreras"), cada una con un formulario (crear/editar) y un listado con botones "Editar"/"Eliminar" por fila, todo contra los endpoints `/admin/*` construidos en HU-08. |
| Los errores del backend se muestran de forma clara | Mismo patrón de manejo de errores usado en el resto del frontend desde HU-01: `api.js` extrae `detail` de la respuesta y lo lanza como `Error`, cada formulario lo captura y lo muestra en un `<p class="message message--error">`. |

### Un bug real encontrado y corregido durante esta historia

`api.js` llamaba incondicionalmente a `response.json()` en cada request. Los endpoints `DELETE /admin/questions/{id}` y `DELETE /admin/careers/{id}` (HU-08) responden `204 No Content`, es decir, **sin cuerpo**. Intentar parsear una respuesta vacía como JSON lanza una excepción, lo que habría roto todos los botones "Eliminar" apenas se probara en el navegador (no se detectó antes porque hasta ahora el frontend nunca había hecho un `DELETE`). Se corrigió leyendo la respuesta como texto primero (`response.text()`) y solo intentando `JSON.parse` si el cuerpo no está vacío. Aprovechando el cambio, se agregaron `apiPut` y `apiDelete` a `api.js`, que hasta ahora solo tenía `apiGet`/`apiPost`.

### Decisiones técnicas

- **El rol se obtiene de `GET /auth/me`, no se decodifica del JWT en el cliente**: el token ya incluye el claim `role`, y decodificarlo en el navegador (JSON.parse de la parte central en base64url) habría evitado una llamada de red, pero se prefirió reutilizar un endpoint que ya existía y cuyo contrato es estable, en vez de acoplar el frontend a la estructura interna del token. El costo (una llamada extra a `/auth/me`) es insignificante y ya se pagaba antes en una versión anterior de `login.js`.
- **El rol mostrado en la nav es solo una conveniencia de UI, no un control de seguridad real**: si alguien manipulara `localStorage.user_role` a mano, vería el botón "Administración", pero cada petición a `/admin/*` sigue validando el rol en el backend vía `require_role("admin")` (HU-02/HU-08). La UI oculta la opción para no confundir a usuarios sin permisos; no es la barrera de seguridad, que vive exclusivamente en el servidor.
- **Preguntas y carreras comparten una sola vista con pestañas (`admin.js`)** en vez de dos vistas separadas: son dos formularios estructuralmente casi idénticos (crear/editar/eliminar con un selector de perfil), y ambos son parte del mismo concepto de "Administración" en la navegación; separarlos en dos botones de nav distintos habría fragmentado innecesariamente algo que conceptualmente es una sola pantalla con dos pestañas.
- **`GET /admin/profiles` es un endpoint nuevo, admin-only**: los formularios de preguntas y carreras necesitan poblar un `<select>` con los 5 perfiles vocacionales (id + nombre) para poder enviar `profile_id`. No existía ningún endpoint que expusiera esa lista con `id` incluido (`VocationalProfileOut` nunca lo llevaba, porque en todos los usos anteriores el perfil siempre iba anidado dentro de otra respuesta ya identificada por su propio id). Se agregó `id: int` a `VocationalProfileOut` —cambio compatible hacia atrás, ya que todo el código que la usaba construye la instancia a partir de un objeto `VocationalProfile` real, que siempre tiene `id`— en vez de crear un esquema paralelo solo para este caso.
- **Confirmación (`confirm()`) antes de cada eliminación**: es una acción destructiva; un clic accidental en "Eliminar" no debería borrar una pregunta o carrera sin una confirmación explícita.
- **No se agregó paginación ni búsqueda al listado de preguntas/carreras**: con 20 elementos cada uno, una lista simple es perfectamente usable; agregar paginación ahora habría sido resolver un problema que no existe todavía.

### Pruebas realizadas

**Manuales end-to-end** (backend real + PostgreSQL real), replicando exactamente las llamadas que dispara la interfaz:
1. `GET /admin/profiles` con usuario admin → `200` con los 5 perfiles (incluyendo `id`); con usuario normal → `403`.
2. `GET /auth/me` confirma que el `role` viaja correctamente en la respuesta que consume `app.js`/`login.js` para decidir si mostrar el botón "Administración".
3. Ciclo completo crear → editar → eliminar una pregunta de prueba usando exactamente el mismo payload que construiría el formulario (`text`, `profile_id`, sin `order` en la creación) → cada paso respondió como se esperaba, y el `DELETE` final devolvió `204` sin cuerpo (validando la corrección del bug de `api.js`).
4. Verificación de que los 20 registros semilla de `questions` y `careers` quedaron intactos después de las pruebas (la pregunta de prueba se creó y se eliminó, sin dejar residuos).
5. Se reutilizó la batería de pruebas de HU-08 (permisos por rol, validaciones de negocio, protección de borrado) ya que la interfaz llama exactamente a los mismos endpoints sin lógica adicional en el servidor.

### Pendiente de verificación manual en navegador

Se verificó que `admin.js` se sirve correctamente y que cada llamada a la API reproduce fielmente lo que la interfaz dispararía, pero la experiencia visual completa (cambio de pestañas, formulario precargado al editar, diálogo de confirmación al eliminar, mensajes de error en pantalla) debe confirmarse abriendo `http://127.0.0.1:5500` en un navegador real, con el usuario admin (`sinsertest@example.com` / `clave1234`).

---

## HU-09 · Consultar analítica básica — **Should**

> *Como administrador, quiero ver estadísticas simples sobre el uso del test para entender cómo lo están usando los usuarios.*

### Criterios de aceptación y cómo se cumplieron

| Criterio | Cómo se implementó |
|---|---|
| El sistema muestra el perfil vocacional más frecuente entre los resultados guardados | `GET /admin/analytics` calcula la moda de `Result.profile_id` sobre todos los resultados guardados. |
| El sistema muestra la carrera recomendada con más apariciones | Para cada resultado, se recalculan las 3 carreras que se le habrían recomendado (mismo criterio que `select_recommended_careers`, HU-05) y se cuenta cuántas veces aparece cada carrera en total; gana la de mayor conteo. |
| El sistema muestra el número total de tests completados | Conteo simple de filas en `results` (una por cada test enviado y calculado, ver HU-04). |
| Solo usuarios con rol admin pueden acceder a esta vista | El endpoint vive bajo el router `/admin`, que ya aplica `require_role("admin")` a nivel global desde HU-08. |

### Decisiones técnicas

- **"Carrera más recomendada" es una aproximación recalculada, no un registro histórico**: el sistema nunca guardó qué 3 carreras se mostraron exactamente en cada resultado pasado (HU-05 las calcula al vuelo en el momento del envío y no las persiste, ver esa historia). Guardar esa foto habría significado agregar una tabla nueva (`result_recommended_careers` o similar) solo para esta historia Should, cuando se puede obtener una respuesta suficientemente buena recalculando con los datos actuales. La consecuencia práctica: si el catálogo de carreras cambió después de generarse un resultado (por ejemplo, con el CRUD de HU-08/HU-10), la analítica refleja el catálogo *actual* aplicado retroactivamente, no una foto exacta de lo que vio cada usuario en su momento. Se documenta como limitación consciente, no como bug.
- **Ambas funciones de cálculo (`most_frequent`, `most_recommended_career_id`) son puras**, reciben listas/diccionarios simples y no tocan la base de datos: siguen el mismo patrón que `calculate_profile` (HU-04) y `would_break_minimum_careers` (HU-08), lo que permitió probarlas exhaustivamente con `pytest` sin necesitar una base de datos real ni resultados de prueba previamente cargados.
- **Mismo criterio de desempate que el resto del proyecto**: ante un empate, gana el id más bajo (perfil o carrera). Es la misma regla ya usada en `calculate_profile` (HU-04); mantenerla consistente evita introducir un criterio de desempate distinto para cada función.
- **Sin resultados todavía → `null` en los campos de perfil/carrera, no un error**: un proyecto recién desplegado sin ningún test completado es un estado válido (`total_completed_tests: 0`), no una condición de error. El frontend lo traduce como "Sin datos todavía" en vez de intentar mostrar un perfil o carrera inexistente.
- **Diseño visual de los stat tiles**: antes de construir la pestaña "Analítica" se cargó el skill `dataviz` de este entorno, que identificó el caso como un "stat tile" (etiqueta en minúscula sin dos puntos + valor grande semibold, sin sparkline ni delta porque no hay series de tiempo que comparar). Se mantuvo la paleta neutra ya usada en el resto de la aplicación (mismos tonos de texto/borde que las demás tarjetas) en vez de introducir la paleta de referencia del skill, porque no hay ninguna serie categórica que colorear: son tres valores independientes, no una comparación entre categorías, así que las reglas de color categórico/secuencial/divergente del skill no aplican aquí.

### Pruebas realizadas

**Automatizadas** (`backend/tests/test_admin.py`, con `pytest`):
1. `most_frequent([])` → `None` (sin datos).
2. `most_frequent` con un ganador claro → lo identifica correctamente.
3. `most_frequent` con empate → gana el valor más bajo.
4. `most_recommended_career_id` sin resultados → `None`.
5. `most_recommended_career_id` tallando correctamente las top-3 carreras de cada resultado a través de varios perfiles.
6. `most_recommended_career_id` con empate entre carreras de distintos perfiles → gana la de menor id.

**Manuales end-to-end** (backend real + PostgreSQL real, vía curl):
1. `GET /admin/analytics` sin token → `401`; con usuario normal → `403`; con admin → `200`.
2. Con 5 resultados reales en la base (2 SOCIAL, 2 TECNICO, 1 ANALITICO — un empate real entre SOCIAL y TECNICO), el endpoint devolvió `SOCIAL` como perfil más frecuente (desempate correcto por menor id) y `Psicología` como carrera más recomendada; se verificó a mano que el conteo era coherente con el desempate esperado entre las carreras de ambos perfiles empatados.

### Frontend

Se agregó una tercera pestaña "Analítica" a la vista de administración (`admin.js`), junto a "Preguntas" y "Carreras" (HU-10), con tres stat tiles: tests completados, perfil más frecuente y carrera más recomendada.

### Pendiente de verificación manual en navegador

Se confirmó que la pestaña de analítica se sirve correctamente y que replica fielmente la respuesta de la API en cada caso probado, pero la disposición visual de los stat tiles debe confirmarse abriendo `http://127.0.0.1:5500` en un navegador real, con el usuario admin.

---

## HU-10 · Sistema de diseño y tema visual — **Should**

> *Como usuario, quiero una interfaz con estilo visual coherente (colores, tipografía, espaciados) para que la plataforma se sienta profesional y agradable.*

### Criterios de aceptación y cómo se cumplieron

| Criterio | Cómo se implementó |
|---|---|
| Paleta de colores, tipografía y componentes base reutilizables (botones, tarjetas, inputs) | `frontend/css/styles.css` se reescribió alrededor de **design tokens** en `:root`: escala de color (primario, peligro, éxito, texto, bordes, superficies, estado deshabilitado), escala tipográfica (`--text-xs` a `--text-2xl`), escala de espaciado de 4px (`--space-1` a `--space-6`), radios de borde y una sombra de tarjeta única. Sobre esos tokens se construyeron los componentes base: `.card` (con modificadores `--sm`, `--lg`, `--center`), `.btn` (con variantes `-primary`, `-secondary`, `-outline`, `-danger-outline`, `-link` y tamaño `-sm`), y estilos globales para `input`/`select`/`textarea`/`label` que aplican a cualquier formulario sin necesidad de clases adicionales. |
| Todas las pantallas aplican el mismo estilo de forma consistente | Se migraron a estos componentes las seis vistas que ya existían (`register.js`, `login.js`, `test.js`, `results.js`, `careers.js`, `history.js`) reemplazando sus clases de tarjeta específicas (`auth-card`, `test-card`, `results-card`, `careers-catalog-card`) por `.card` + el modificador correspondiente, y sus botones sueltos por `.btn` + variante. |
| Los elementos interactivos tienen estados visibles: hover, foco, activo y deshabilitado | Selector global `:focus-visible` (cubre `a`, `button`, `input`, `select`, `textarea` y cualquier `[tabindex]`) que aplica el mismo anillo de foco en toda la app sin repetirlo por componente. Cada variante de `.btn` define su propio `:hover` y `:active`; `.btn:disabled` tiene un estado visual compartido (fondo/color atenuado + cursor `not-allowed`). |

### Un bug real encontrado y corregido durante esta historia

Al revisar qué pantallas ya habían sido migradas al nuevo sistema de diseño, `frontend/js/views/admin.js` (la vista de administración de HU-08b) seguía usando clases de la versión anterior del CSS: `careers-catalog-card`, `admin-card` y `admin-cancel-btn`. Ninguna de las tres existe ya en `styles.css` — se habían renombrado o eliminado al construir el nuevo sistema de tarjetas —, así que la pantalla de administración se habría visto completamente sin estilo (tarjeta sin fondo ni sombra, botones de "Crear", "Cancelar", "Editar" y "Eliminar" con la apariencia por defecto del navegador) apenas alguien la abriera en un navegador, mientras el resto de la aplicación ya lucía consistente. No se había detectado antes porque el trabajo de diseño visual se probó pantalla por pantalla y `admin.js` fue la última en revisarse. Se corrigió reemplazando esas clases por `card card--lg` y agregando las clases `.btn` correspondientes a cada botón (`btn-primary` para crear/guardar, `btn-secondary` para cancelar, `btn-outline btn-sm` para editar, `btn-danger-outline btn-sm` para eliminar).

### Decisiones técnicas

- **Tokens como variables CSS (`:root`), no un preprocesador (Sass/Less)**: el stack del proyecto es JS vanilla sin build tool (decisión ya tomada en Fase 0); agregar un preprocesador solo para variables habría introducido un paso de compilación que el resto del frontend no tiene. Las variables CSS nativas ya tienen el soporte de navegador necesario y se pueden usar directamente en los archivos servidos tal cual.
- **`.btn`/`.card` como clases de utilidad compuestas (base + modificador)** en vez de una clase distinta por combinación (por ejemplo, una única `.btn-primary-sm`): siguiendo el mismo principio ya usado en el proyecto de preferir composición simple sobre una matriz de clases, `class="btn btn-primary btn-sm"` cubre cualquier combinación de variante y tamaño sin que el CSS tenga que anticipar cada mezcla.
- **`:active` explícito en todas las variantes de `.btn` y en `.career-item--clickable`**: al revisar el criterio de aceptación ("hover, foco, activo y deshabilitado") se notó que solo `.btn-primary` y los botones de navegación tenían un estado `:active` definido; las demás variantes (`-secondary`, `-outline`, `-danger-outline`, `-link`) dependían del estilo por defecto del navegador, que no es visible en botones con estilo plano. Se agregó `:active` a cada una para que el criterio se cumpla de forma pareja en todos los botones, no solo en el primario.
- **Las tarjetas de carrera del catálogo (`career-item--clickable`) no eran alcanzables por teclado**: el CSS ya traía la regla `[tabindex]:focus-visible` (parte del selector global de foco), pero ningún elemento la usaba porque el `<li>` clicable de `careers.js` no tenía `tabindex`. Sin eso, el criterio "foco" era literalmente imposible de cumplir en ese elemento (no hay estado de foco que mostrar si el elemento nunca puede recibirlo). Se agregó `tabindex="0"` y `role="button"`, junto con un manejador de `keydown` para `Enter`/`Espacio` que dispara la misma acción que el clic — sin este último paso, el elemento habría quedado enfocable pero inerte al teclado, un estado a medias peor que no tocarlo. Esta corrección puntual no reemplaza la revisión de accesibilidad completa que le corresponde a HU-17 (navegación por teclado en general, contraste WCAG AA, textos alternativos); se limitó a lo estrictamente necesario para que el criterio de "foco visible" de esta historia tuviera sentido en este componente.
- **No se tocó la barra de navegación (`.nav-bar button`) ni las pestañas de administración (`.admin-tab`)** para usar clases `.btn`: ya tenían su propio estilo dedicado, coherente con la paleta y con sus propios estados hover/active, construido antes de esta historia; envolverlos en `.btn` habría significado pelear contra estilos ya correctos sin ganar nada.
- **Sin librería de componentes ni framework CSS (Bootstrap, Tailwind)**: se evaluó implícitamente al construir esto desde cero en vez de sumar una dependencia; el alcance visual (botones, tarjetas, inputs, un puñado de estados) es pequeño y ya cubierto con ~250 líneas de CSS propio, sin el peso ni la curva de aprendizaje de una librería completa para un proyecto que ya tiene todo su stack definido sin frameworks de frontend.

### Pruebas realizadas

Este es un cambio puramente visual/de marcado (CSS + clases HTML), sin lógica de negocio nueva que aislar en una función pura, así que no aplica el patrón de pruebas automatizadas con `pytest` usado en HU-04/05/08/09. Se verificó de forma estática, sin navegador disponible en este entorno:

1. Búsqueda exhaustiva (`grep`) de las clases de tarjeta antiguas (`careers-catalog-card`, `auth-card`, `test-card`, `results-card`, `admin-card`, `admin-cancel-btn`, `back-link`) en todo `frontend/`, confirmando que no queda ninguna referencia sin migrar tras corregir `admin.js`.
2. Revisión manual, vista por vista, de que cada `<button>` en el HTML generado por cada archivo de `js/views/` tiene una clase `.btn` (excepto los de la barra de navegación y las pestañas de administración, que tienen su propio estilo dedicado y ya eran consistentes antes de esta historia).
3. Revisión de que cada variante de `.btn` y `.career-item--clickable` tiene definidos sus cuatro estados (`:hover`, `:focus-visible` vía el selector global, `:active`, `:disabled` donde aplica) directamente en `styles.css`.

### Pendiente de verificación manual en navegador

Todo lo anterior se verificó revisando el CSS y el HTML que genera cada vista, pero la apariencia final (colores realmente aplicados, alineación, y sobre todo que los estados `:hover`/`:focus`/`:active` se vean como se espera al interactuar) debe confirmarse abriendo `http://127.0.0.1:5500` en un navegador real y recorriendo las pantallas: registro, login, test (incluyendo navegar con Tab entre opciones), resultados, catálogo de carreras (incluyendo enfocar una tarjeta con Tab y activarla con Enter), historial y administración (las tres pestañas, con un usuario admin).

---

## Cerrar sesión — complemento de HU-02

No es una historia de usuario del plan de ruta; es el complemento natural de HU-02 (Inicio de sesión), agregado a solicitud explícita del usuario: una vez dentro de la cuenta, hacía falta una forma de terminar la sesión desde la propia interfaz (antes solo se podía "salir" borrando `localStorage` manualmente desde DevTools).

### Cómo se implementó

- **Botón "Cerrar sesión" en la barra de navegación persistente** (`renderNav()`, `frontend/js/app.js`): se agrega junto a "Test vocacional", "Catálogo de carreras", "Mi historial" y (si aplica) "Administración", ya que esa barra solo se renderiza cuando hay una sesión activa (`localStorage.access_token` presente).
- **Al hacer clic**: se eliminan `access_token` y `user_role` de `localStorage`, se vuelve a llamar `renderNav()` (que ahora renderiza vacío, al no encontrar token) y se muestra `renderLoginView(appContainer)`.

### Decisiones técnicas

- **Solo del lado del cliente, sin endpoint de backend**: la autenticación es JWT stateless (HS256, sin sesiones ni refresh tokens en servidor — decisión ya documentada en HU-02), así que no hay nada que invalidar en la base de datos. El token técnicamente sigue siendo válido hasta su expiración natural (60 minutos) aunque el cliente deje de usarlo; agregar una lista de revocación de tokens solo para esta acción habría sido infraestructura nueva desproporcionada para lo que pide "cerrar sesión" en el alcance de este proyecto. Es la misma compensación entre simplicidad y statelessness ya aceptada en HU-02.
- **Botón alineado a la derecha de la barra (`margin-left: auto`) y con paleta neutra** (`--color-text-muted`, `--color-border-strong`) en vez de la paleta primaria que usan los demás botones de navegación: es una acción de salida, no una sección más de la app, y separarla visualmente evita que se confunda con un destino de navegación.
- **Reutiliza `renderNav()` y `renderLoginView()` ya existentes**: no se creó ningún archivo nuevo ni lógica adicional; el flujo de logout es simétrico al de login (mismo contenedor, misma función de navegación).

### Pruebas realizadas

Sin backend involucrado, no aplica ninguna prueba automatizada nueva. Verificación manual pendiente en navegador: iniciar sesión, confirmar que aparece "Cerrar sesión" en la nav, hacer clic y confirmar que vuelve a la pantalla de login, que la barra de navegación desaparece, y que recargar la página después ya no restaura la sesión (por no quedar `access_token` en `localStorage`).

---

## Datos de perfil en el registro — complemento de HU-01

No es una historia del plan de ruta; es una ampliación explícita del formulario de registro (HU-01), agregando nombre, apellido, país y género como datos obligatorios de la cuenta.

### Cómo se implementó

| Campo | Modelo (`models.py`) | Validación (`schemas.py`, `UserCreate`) |
|---|---|---|
| Nombre | `first_name`, `String(100)`, nullable | `Field(min_length=1, max_length=100)`, obligatorio |
| Apellido | `last_name`, `String(100)`, nullable | `Field(min_length=1, max_length=100)`, obligatorio |
| País | `country`, `String(100)`, nullable | `Field(min_length=1, max_length=100)`, obligatorio |
| Género | `gender`, `String(20)`, nullable, `CHECK (gender IN ('hombre','mujer'))` | `Literal["hombre", "mujer"]`, obligatorio |

Migración nueva `b6d2a1f4c7e9_add_profile_fields_to_users.py` (encadenada después de `057904244978`, la última existente): agrega las cuatro columnas a `users` y el `CHECK` de género. `POST /auth/register` (`routers/auth.py`) ahora recibe estos cuatro campos en `UserCreate` y los pasa al constructor de `User`. `UserOut` (usado por `/auth/register` y `/auth/me`) los expone también.

### Decisiones técnicas

- **Columnas nullable a nivel de base de datos, obligatorias a nivel de API**: la tabla `users` ya tenía filas de usuarios reales creados durante las pruebas manuales de HU-01 a HU-10 (`jairo@example.com`, el usuario admin, etc.), ninguna con estos datos. Agregar las columnas como `NOT NULL` habría roto la migración contra esas filas existentes (no hay ningún valor razonable que rellenar automáticamente para "nombre" o "país" de un usuario ya creado). Se optó por el mismo patrón que ya usa `role`: la integridad fuerte de negocio ("todo usuario *nuevo* debe traer estos datos") se garantiza en la capa de Pydantic (`UserCreate` los declara sin valor por defecto, así que faltan → `422`), mientras que la base de datos permite `NULL` para no invalidar el histórico. Los usuarios registrados antes de esta historia simplemente quedan con estos campos en `NULL`; no se hizo ningún backfill porque no hay ningún dato real que inferir para ellos.
- **`CHECK (gender IN ('hombre', 'mujer'))` a nivel de base de datos, además de `Literal[...]` en Pydantic**: mismo doble-candado ya usado en `role` (`ck_users_role`) — un valor fuera de las dos opciones no puede llegar a la base de datos ni siquiera si se inserta por fuera de la API. Se limitó exactamente a las dos opciones que se pidieron explícitamente ("hombre, mujer"), sin agregar opciones adicionales no solicitadas (por ejemplo "otro"); si en el futuro se requiere ampliar el conjunto de valores, es un cambio de una sola migración (agregar el valor al `CHECK` y al `Literal`), no un rediseño.
- **País como texto libre (`String(100)`), no un selector con lista fija de países**: no existe en el proyecto ningún catálogo de países ya definido, y construir/mantener uno (con sus códigos ISO, etc.) es complejidad no pedida por el alcance actual. Un campo de texto simple cumple el requisito ("¿de qué país es?") sin esa sobre-ingeniería.
- **Sin endpoint para editar estos datos después del registro**: no se pidió como parte de esta ampliación (solo se pidió agregarlos "en el formulario de registrarse"); agregar edición de perfil habría sido una historia de usuario nueva no solicitada.
- **El formulario de registro pide estos cuatro campos antes que correo/contraseña**: orden pensado como flujo natural de un formulario de registro (quién eres → cómo te identificas en el sistema), sin ningún requisito funcional detrás; es una decisión puramente de UX, fácil de reordenar si no se prefiere así.

### Un problema operativo encontrado (no relacionado con el código)

Al probar el nuevo endpoint contra el servidor que ya estaba corriendo, la respuesta ignoró los cuatro campos nuevos sin error (devolvió `201` con el `UserOut` viejo). Causa: ese proceso de `uvicorn` se había iniciado sin la bandera `--reload` (`uvicorn app.main:app --port 8000`), así que seguía sirviendo el código anterior a los cambios de `models.py`/`schemas.py`/`auth.py`, y FastAPI/Pydantic simplemente descarta del payload cualquier campo que el esquema activo no reconozca, en vez de fallar. Se reinició el servidor con `--reload` para que futuros cambios de código se reflejen automáticamente sin reinicios manuales.

### Pruebas realizadas

**Automatizadas**: no se agregó ninguna nueva; `pytest` (22 pruebas existentes) se corrió después del cambio para confirmar que nada se rompió — en particular `test_auth.py::make_user`, que construye un `User` del ORM directamente sin pasar los campos nuevos, sigue funcionando porque son nullable a nivel de modelo.

**Manuales end-to-end** (backend real + PostgreSQL real, vía curl, tras aplicar la migración con `alembic upgrade head`):
1. Registro con los cuatro campos y credenciales válidas → `201`, con `first_name`, `last_name`, `country` y `gender` presentes en la respuesta.
2. Registro con `gender: "otro"` (valor fuera de las dos opciones permitidas) → `422`, mensaje de Pydantic indicando que solo se acepta `'hombre'` o `'mujer'`.
3. Registro sin `first_name` → `422`, "Field required".

### Frontend

Se amplió `frontend/js/views/register.js`: el formulario ahora pide Nombre, Apellido, País (campos de texto) y Género (`<select>` con "Hombre"/"Mujer", sin opción preseleccionada válida — la primera opción es un placeholder deshabilitado que obliga a elegir explícitamente), antes de los campos de correo y contraseña ya existentes. Los cuatro se envían junto con `email`/`password` en el mismo `POST /auth/register`.

### Pendiente de verificación manual en navegador

Se confirmó el flujo completo por API (incluyendo los casos de error), pero la experiencia del formulario (orden visual de los campos, comportamiento del `<select>` de género, mensajes de error en pantalla) debe confirmarse abriendo la app en un navegador real.

---

## Dockerizar el backend — simplificar la reproducción del proyecto

No es una historia de usuario; es una mejora de infraestructura de desarrollo, pedida explícitamente para que un colaborador (o un líder que solo quiere revisar el proyecto) pueda levantarlo con el mínimo de pasos posible, sin instalar Python 3.12 ni crear un entorno virtual manualmente.

### Cómo se implementó

- **`backend/Dockerfile`**: imagen basada en `python:3.12-slim` (misma versión ya exigida por el proyecto), instala `requirements.txt`, copia el código y arranca con un comando que primero corre `alembic upgrade head` en un bucle de reintentos y luego `uvicorn --host 0.0.0.0 --reload`.
- **`backend/.dockerignore`**: excluye `venv/`, `__pycache__/`, `.env`, `.pytest_cache/` y `tests/` de la imagen (nada de eso debe viajar dentro del contenedor).
- **`docker-compose.yml`**: se agregó el servicio `backend` (se construye desde `./backend`), con `depends_on: db: condition: service_healthy` y las variables `DATABASE_URL`/`JWT_SECRET_KEY` puestas directamente ahí (host `db`, el nombre del servicio, en vez de `localhost`). Se agregó un `healthcheck` (`pg_isready`) al servicio `db`, que antes no lo tenía. Se montan `./backend/app` y `./backend/alembic` como volúmenes dentro del contenedor, para que los cambios de código en el host se reflejen de inmediato gracias a `--reload`, sin reconstruir la imagen en cada edición.

### Un bug real encontrado y corregido durante esta historia

Al probar el flujo completo simulando a un colaborador nuevo (un proyecto de Docker Compose aparte, con un volumen de PostgreSQL totalmente vacío, para no usar los datos ya existentes en el entorno de Jairo), el contenedor `backend` entró en un **crash-loop**: `alembic upgrade head` fallaba con `sqlalchemy.exc.OperationalError: ... Name or service not known` al intentar resolver el hostname `db`, a pesar de que `depends_on: condition: service_healthy` ya había confirmado que Postgres estaba `healthy`. Causa: que Postgres esté "healthy" (acepta conexiones) no garantiza que la resolución de nombres interna de Docker para el contenedor `backend` esté lista en ese mismo instante — es una condición de carrera conocida, más notoria en Docker Desktop sobre Windows. El primer intento de esta prueba en el entorno normal de Jairo (con datos ya existentes) también había fallado una vez de la misma forma silenciosa, pero como el segundo intento funcionó, en su momento pareció un evento aislado; al reproducirlo desde cero quedó claro que era este problema de fondo, no una casualidad.

Se corrigió cambiando el comando de arranque del contenedor de un solo intento (`alembic upgrade head && uvicorn ...`) a un bucle de reintentos (`until alembic upgrade head; do echo ...; sleep 2; done && exec uvicorn ...`): si la conexión falla (por DNS todavía no resuelto o porque Postgres de verdad no está listo), simplemente reintenta cada 2 segundos hasta lograrlo, en vez de morir en el primer intento. Es el patrón estándar de "esperar a la base de datos" en Docker Compose, y cubre de paso cualquier otra causa de arranque lento de la base de datos, no solo el problema de DNS puntual que se observó.

### Decisiones técnicas

- **Variables de entorno para el contenedor definidas directamente en `docker-compose.yml`, no en `backend/.env`**: el objetivo explícito de esta historia es que un colaborador *no* tenga que crear ni editar ningún archivo para correr el proyecto. El flujo con `.env` (documentado en el README como "alternativa sin Docker") sigue existiendo intacto para quien prefiera correr el backend con `venv` directamente en su máquina (por ejemplo, para depurar con breakpoints del IDE sin entrar al contenedor). El `JWT_SECRET_KEY` de desarrollo que queda en `docker-compose.yml` es un valor fijo, documentado como solo apto para desarrollo local — el mismo criterio que ya aplicaba `.env.example` con su placeholder.
- **Healthcheck en `db` (`pg_isready`) agregado como parte de esta historia**: no existía antes porque no hacía falta (nada dependía de la base de datos a nivel de Docker Compose hasta ahora). Es un prerrequisito de `depends_on: condition: service_healthy`, pero —como muestra el bug de arriba— no es suficiente por sí solo; se mantiene igual porque reduce la ventana del problema (sin él, `backend` arrancaría inmediatamente después de que el contenedor de `db` exista, sin esperar nada) y el bucle de reintentos cubre el resto.
- **Bind mounts de `app/` y `alembic/` (no todo el proyecto) hacia el contenedor**: permite seguir editando código y ver el efecto con `--reload` sin reconstruir la imagen, igual que el flujo de `venv` de siempre. No se montó `requirements.txt` ni el resto del proyecto porque un cambio de dependencias sí debe forzar una reconstrucción de imagen (`docker compose up -d --build`), para no tener un contenedor con código nuevo corriendo contra dependencias viejas sin que nadie lo note.
- **`tests/` excluido de la imagen (`.dockerignore`)**: el contenedor está pensado para *correr* la aplicación, no para ejecutar su batería de pruebas; `pytest` se sigue corriendo contra el entorno `venv` local, documentado aparte en el README. Meter las pruebas dentro de la imagen de producción/demo no aporta nada al caso de uso que motivó esta historia (que alguien pueda levantar y usar la app).
- **No se dockerizó también el frontend**: es JS vanilla sin paso de build, así que Live Server o `python -m http.server` ya son igual de simples (o más) que agregar un contenedor Nginx solo para servir archivos estáticos; hacerlo habría sido complejidad sin beneficio real para este proyecto.
- **`README.md` reestructurado** para presentar el camino con Docker como el recomendado/rápido, y el flujo manual con `venv` como alternativa explícita para quien necesite depurar el backend directamente en su máquina.

### Pruebas realizadas

Dado que este cambio es de infraestructura (no hay lógica de negocio nueva que probar con `pytest`), la verificación fue completamente manual, sobre Docker real:

1. **Sobre el entorno existente de Jairo** (`docker compose up -d --build`): la imagen construyó correctamente, las migraciones corrieron (sin aplicar nada nuevo, porque esa base ya estaba al día por pruebas anteriores con `venv`), y `POST /auth/register` respondió `201` con los datos completos.
2. **Simulación de un colaborador nuevo**, en un proyecto de Docker Compose separado (`docker compose -p careerpath-freshtest up -d --build`) con su propio volumen de PostgreSQL vacío, para no arriesgar los datos reales del entorno de Jairo:
   - Primer intento: reprodujo el bug de DNS descrito arriba (crash-loop).
   - Tras el fix del bucle de reintentos: las **ocho migraciones corrieron en orden desde cero** (creación de tablas, semillas de perfiles/preguntas/carreras, fix de secuencias, y la migración de datos de perfil de HU-01) y el contenedor quedó estable.
   - `POST /auth/register` → `201`; `POST /auth/login` → `200` con token; `GET /careers` con ese token → `200` con las 20 carreras semilla.
   - Se destruyó el proyecto de prueba (`docker compose -p careerpath-freshtest down -v`), eliminando su volumen aparte, sin tocar el volumen real del proyecto de Jairo.
3. **Verificación de que los datos reales de Jairo sobrevivieron** a todo el proceso: tras devolver `docker compose up -d` al proyecto normal, la tabla `users` seguía con sus filas (`SELECT count(*) FROM users` sin cambios respecto a antes de la prueba).

### Pendiente

Verificación manual en navegador de que el frontend, apuntando al backend ahora servido desde Docker en `http://localhost:8000`, funciona igual que con el backend corrido vía `venv` (no debería haber diferencia, ya que el contrato de la API no cambió, pero queda pendiente confirmarlo visualmente junto con el resto de verificaciones de navegador ya anotadas en historias anteriores).

---

## Rediseño visual de la pantalla de login — fondo oscuro + tarjeta en vidrio esmerilado

Cambio puntual pedido explícitamente sobre `frontend/js/views/login.js` y `styles.css`: fondo negro semitransparente a pantalla completa y la tarjeta del formulario con efecto "difuminado" (vidrio esmerilado / glassmorphism).

### Cómo se implementó

- **`login.js`**: se envolvió la tarjeta existente (`<section class="card card--sm">`) en un `<div class="login-backdrop">`, y se le agregó la clase `card--glass` a la tarjeta, sin tocar el formulario, los campos ni la lógica de envío.
- **`styles.css`**:
  - `.login-backdrop`: capa `position: fixed; inset: 0` que cubre toda la ventana (no depende del layout de `body`/`#app`), con un fondo oscuro casi negro (`rgba(8,10,15,0.92)`) combinado con dos degradados radiales suaves (azul y morado, en las esquinas opuestas) — sin esos degradados, el fondo quedaba completamente plano y el `backdrop-filter: blur()` de la tarjeta no tenía nada visible que difuminar (se notó exactamente ese problema en la primera captura de prueba, ver más abajo).
  - `.card--glass`: fondo blanco al 8% de opacidad + `backdrop-filter: blur(16px)` (con el prefijo `-webkit-` para Safari), borde blanco tenue y una sombra más pronunciada que la tarjeta normal, para que se despegue del fondo.
  - Overrides de texto (`h1`, `label`, enlaces, mensajes de éxito/error) a tonos claros, ya que el texto oscuro por defecto de `.card` es ilegible sobre un fondo ahora oscuro.

### Un bug real encontrado y corregido durante esta historia (detectado gracias a verificación visual real, no solo revisión de código)

Al levantar el frontend y tomar una captura real con un navegador headless (Playwright) para verificar el cambio, los campos de correo y contraseña seguían viéndose blancos y opacos, ignorando por completo el estilo "vidrio" que se les había definido (`.card--glass input { background: rgba(255,255,255,0.12); ... }`). Causa: **especificidad CSS**. La regla global de inputs (`input:not([type="radio"]):not([type="hidden"]) { background: var(--color-surface); ... }`, definida en la sección "Campos de formulario" de `styles.css`) tiene mayor especificidad que `.card--glass input`, porque cada pseudo-clase `:not(...)` suma a la especificidad tanto como una clase — dos `:not()` pesan más que la única clase `.card--glass`. La regla más específica gana sin importar el orden en el archivo, así que el estilo "vidrio" perdía silenciosamente contra el estilo global, sin ningún error visible en consola. Se corrigió igualando la forma del selector global en el override: `.card--glass input:not([type="radio"]):not([type="hidden"])`, que ahora sí supera en especificidad a la regla genérica.

Este bug no se habría detectado solo con inspección de código (el CSS "se veía correcto" a simple vista); solo apareció al renderizar la página de verdad y mirar el resultado.

### Decisiones técnicas

- **Verificación con navegador real (Playwright headless) en vez de solo inferir del CSS**: dado que este es un cambio puramente visual y el entorno de desarrollo no tiene un navegador gráfico interactivo disponible, se instaló Playwright (`npm install playwright` + `npx playwright install chromium`) en el directorio de scratchpad para tomar una captura de pantalla real de `http://127.0.0.1:5501` (un servidor estático temporal, separado del Live Server que ya tenía abierto el usuario en el puerto 5500, para no interferir con su sesión). Esto es justamente lo que permitió encontrar el bug de especificidad de arriba, que una revisión visual del código fuente no hubiera detectado.
- **Degradados radiales sutiles en vez de negro plano**: el pedido fue "fondo negro transparentoso", pero un negro completamente plano deja al `backdrop-filter: blur` sin ningún detalle que difuminar, por lo que el efecto de vidrio esmerilado se vuelve invisible en la práctica (se confirmó este problema exacto en la primera captura de prueba). Se mantiene predominantemente oscuro/negro (92% de opacidad) — sigue leyéndose como "fondo negro transparentoso" — pero con dos manchas de color muy sutiles que le dan al `blur` algo que mostrar.
- **Cambio limitado a la vista de login, no a registro**: se pidió explícitamente para "cuando el cliente se va a loguear"; `register.js` sigue usando `card card--sm` sin el fondo oscuro. Ambas pantallas quedan visualmente distintas a propósito (login como pantalla de entrada con tratamiento especial); si se prefiere extender el mismo efecto a registro, es un cambio de una sola clase adicional en `register.js` más su propio `<div class="login-backdrop">` (o renombrarlo a algo más genérico como `auth-backdrop` si se reutiliza).
- **Sin imagen de fondo**: los degradados se generan con CSS puro (`radial-gradient`), sin necesitar ni alojar ningún archivo de imagen adicional.

### Pruebas realizadas

**Visual, con navegador real** (Playwright headless, capturas de pantalla revisadas directamente):
1. Primera captura: fondo oscuro aplicado correctamente, pero inputs sin el estilo de vidrio (bug de especificidad descrito arriba) y sin degradados (el blur no se apreciaba).
2. Tras corregir ambos problemas, segunda captura: fondo oscuro con los degradados sutiles, tarjeta y campos en vidrio esmerilado con el blur claramente visible contra el fondo, texto y enlaces legibles en tonos claros, botón "Entrar" con buen contraste.
3. `console --errors` del navegador sin errores en ambas capturas.

### Pendiente de verificación manual

El comportamiento funcional (envío del formulario, mensajes de error/éxito, transición hacia el test tras un login exitoso) no cambió y ya estaba cubierto por las pruebas de HU-02; no se repitió aquí porque el cambio fue exclusivamente visual. Falta confirmar el efecto en modo responsive (móvil) y en un navegador real no headless, con la app corriendo contra el backend real.

---

## Extender la paleta oscura a registro y a toda la interfaz ya logueada

Ampliación explícita de lo anterior: la misma paleta oscura + vidrio esmerilado debía verse también en la pantalla de registro y en toda la interfaz una vez el usuario ya inició sesión (test, catálogo, historial, administración, barra de navegación) — no solo en login.

### Decisión clave: mover el efecto a los tokens de diseño, no repetirlo por pantalla

En vez de copiar la clase `card--glass` y el fondo especial a cada vista (`register.js`, `test.js`, `careers.js`, `history.js`, `admin.js`), se llevó el cambio a la raíz: los tokens de color definidos en `:root` (`styles.css`), construidos en HU-10 precisamente para que todo el sistema de diseño se derive de un único lugar. Se redefinieron ahí:

- `--color-bg`: ahora es el fondo oscuro con los dos degradados radiales (antes vivía solo en `.login-backdrop`), aplicado directamente en `body` con `background-attachment: fixed` (para que el degradado se mantenga fijo respecto a la ventana y no respecto al alto del contenido, que varía mucho entre, por ejemplo, login y la lista de administración).
- `--color-surface` / `--color-surface-muted`: pasan de blanco sólido a blanco translúcido (vidrio).
- `--color-text` / `--color-text-muted`: pasan de tonos oscuros a tonos claros.
- `--color-border` / `--color-border-strong`: pasan a blanco translúcido tenue.
- `--color-primary`, `--color-danger`, `--color-success` y sus variantes "surface": se aclararon/ajustaron para tener buen contraste sobre fondo oscuro (por ejemplo, los fondos "surface" que antes eran colores sólidos muy claros —pensados para resaltar sobre blanco— pasaron a ser el mismo color pero translúcido, para que sea sobre el vidrio oscuro).
- `--color-disabled-bg` / `--color-disabled-text` y `--focus-ring`: mismo ajuste, adaptados a fondo oscuro.
- `--shadow-card`: la sombra sutil pensada para tarjetas blancas sobre fondo claro se reemplazó por la sombra más pronunciada que ya se había definido para el vidrio de login.

El componente `.card` (usado por las siete vistas del proyecto) se actualizó para incluir directamente `backdrop-filter: blur(16px)` y un borde translúcido, en vez de necesitar el modificador `.card--glass`. Como resultado, **todas** las pantallas que ya usaban `.card`, `.btn`, inputs globales, `.nav-bar`, `.career-item`, `.admin-form`, `.stat-tile`, etc. (es decir, toda la app, gracias a que HU-10 ya había migrado todo a este sistema de tokens) adoptaron la paleta oscura automáticamente, sin editar una sola línea de esas vistas.

### Limpieza de código que quedó redundante

Con el efecto ahora aplicado globalmente vía tokens, las reglas especiales creadas en la historia anterior (`.login-backdrop`, `.card--glass` y sus overrides de texto/inputs/enlaces) se volvieron innecesarias y se eliminaron de `styles.css`. `login.js` se revirtió a su estructura original simple (`<section class="card card--sm">`, sin el `<div>` envolvente ni la clase `card--glass`), porque el fondo oscuro ahora es una propiedad de `body`, no algo que cada vista tenga que montar por separado. Esto también corrige un efecto secundario de la implementación anterior: al usar `position: fixed` solo en login, esa pantalla quedaba perfectamente centrada verticalmente mientras que el resto de la app (incluida register) se alineaba arriba (por el `padding-top` de `body`). Ahora las siete pantallas comparten exactamente el mismo comportamiento de layout.

### Verificación visual real (Playwright), no solo inspección de CSS

Se reutilizó la instalación de Playwright de la historia anterior para tomar cuatro capturas reales contra el backend real (Docker) y un servidor estático temporal:

1. **Login**: fondo oscuro con degradado, tarjeta en vidrio, ahora alineada arriba (consistente con el resto de la app) en vez de centrada verticalmente.
2. **Registro**: mismos estilos — confirmando que los 6 campos nuevos de HU-01 (nombre, apellido, país, género, correo, contraseña) se ven legibles sobre vidrio oscuro, incluyendo el `<select>` de género.
3. **Interfaz ya logueada (test vocacional)**: se hizo un login real contra la API (usuario `retest_uno@example.com`, creado en una prueba anterior) y se confirmó que la barra de navegación (botones "Test vocacional", "Catálogo de carreras", "Mi historial", "Cerrar sesión") se ve como píldoras de vidrio consistentes con el resto, y que la tarjeta de preguntas (opciones Likert, botones Anterior/Siguiente) mantiene buen contraste.
4. **Catálogo de carreras**: confirmando que las tarjetas de carrera dentro de la lista también heredan el vidrio oscuro correctamente.

Para poder hacer un login real desde el navegador de prueba (necesario para ver la nav y las pantallas protegidas, no solo login/registro que no requieren sesión) hizo falta que el backend aceptara peticiones CORS desde el puerto del servidor estático temporal (`5501`): se agregó ese origen a `allow_origins` en `main.py` **temporalmente**, se tomaron las capturas, y se revirtió el archivo a su configuración original (`5500`/`127.0.0.1:5500` únicamente) inmediatamente después. `console --errors` del navegador no mostró errores en ninguna de las cuatro capturas.

### Decisiones técnicas

- **Un solo punto de cambio (tokens) en vez de duplicar estilos por vista**: es la razón de ser del sistema de tokens construido en HU-10; esta historia es la prueba de que esa inversión rindió — extender la paleta a 7 pantallas tomó cambiar `:root` y `.card`, no seis archivos distintos.
- **No se dockerizó ni se tocó nada del backend para este cambio**: es puramente visual (`styles.css`, `login.js`). El único tocado temporal a `main.py` (CORS) fue exclusivamente para poder *verificar* el cambio con una sesión real desde el entorno de pruebas, y se revirtió de inmediato; no forma parte del cambio en sí.
- **Se mantuvieron los encabezados (`.card h1`) en azul de marca (`--color-primary`) en vez de blanco puro**: da jerarquía visual (el título se distingue del resto del texto claro) y aprovecha que el azul ya tenía buen contraste sobre fondo oscuro en las pruebas de la historia anterior.
- **`background-attachment: fixed` en `body`**: sin esto, el degradado de fondo se posiciona relativo a la altura total del contenido (que crece mucho en, por ejemplo, la lista de administración con muchas preguntas), y las manchas de color podían terminar fuera de la vista inicial en pantallas con contenido largo. Fijar el fondo a la ventana garantiza que el degradado se vea igual sin importar cuánto contenido tenga cada pantalla.

---

## Marca y eslogan en la pantalla de login

Pedido explícito: mostrar el nombre del proyecto arriba y, debajo, un mensaje motivacional corto dirigido a estudiantes que salen del colegio sin tener clara su vocación — la audiencia real del proyecto según el enunciado de CodeUp Riwi.

### Cómo se implementó

- **`login.js`**: se envolvió todo en un `<div class="login-page">` con tres partes: un wordmark `<h1>Career<span>Path</span></h1>`, la tarjeta de login (ahora con `<h2>Iniciar sesión</h2>` en vez de `<h1>`, porque el `<h1>` de la página pasó a ser el nombre del producto — hay que respetar que solo haya un `<h1>` real por pantalla), y un `<p class="login-tagline">` debajo de la tarjeta con el eslogan.
- **Eslogan elegido**: *"¿Aún no sabes qué estudiar? No estás solo: vamos a descubrirlo juntos."* — corto (una sola oración con dos partes), empático (nombra la incertidumbre sin dramatizarla), y en primera persona del plural ("vamos", "juntos") para que la plataforma se sienta como acompañamiento y no como un test frío que evalúa.
- **`styles.css`**: `.login-brand h1` con tipografía grande y bold (2.75rem, peso 800) para que lea como un logotipo, con "Career" en el color de texto principal y "Path" en el azul de marca (`<span>` interno) — un tratamiento de wordmark de dos colores, común en nombres de producto compuestos por dos palabras. `.login-tagline` en cursiva, tono atenuado (`--color-text-muted`) y ancho máximo limitado (340px) para que el mensaje se lea como una frase corta centrada, no como un párrafo ancho.
- **`.card h1` se amplió a `.card h1, .card h2`** en `styles.css`, para que el nuevo `<h2>` de la tarjeta de login siga recibiendo el mismo estilo (color de marca, tamaño) que ya tenían los `<h1>` de las demás tarjetas (registro, test, resultados, etc.), que no se tocaron.

### Decisiones técnicas

- **Cambio limitado a login**: el wordmark y el eslogan solo se agregaron en `login.js`, no en `register.js` ni en el resto de vistas — es la puerta de entrada a la plataforma, el lugar natural para presentar la marca y el mensaje motivacional una sola vez, no en cada pantalla.
- **Jerarquía semántica de encabezados corregida**: antes, "Iniciar sesión" era el único `<h1>` de la pantalla de login. Al agregar el nombre del producto como elemento más prominente, se degradó "Iniciar sesión" a `<h2>` para mantener un solo `<h1>` por página (relevante tanto para accesibilidad/lectores de pantalla como para SEO semántico, aunque esto último no aplique a una SPA sin indexación).
- **Sin logotipo/imagen**: el "logo" es tipográfico (CSS puro, dos colores), consistente con el resto del proyecto (sin assets de imagen en ninguna pantalla hasta ahora).

### Pruebas realizadas

Verificación visual con Playwright (mismo mecanismo ya usado en las dos historias anteriores): captura de la pantalla de login confirmando que el wordmark, la tarjeta y el eslogan se ven correctamente espaciados y legibles sobre el fondo oscuro, sin errores de consola.

### Pendiente de verificación manual

Confirmar en un navegador real que el tamaño del wordmark (2.75rem) se ve proporcionado en pantallas pequeñas (móvil) — no se probó aún en modo responsive, igual que el resto de verificaciones de navegador real pendientes.
