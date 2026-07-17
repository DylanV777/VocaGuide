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
