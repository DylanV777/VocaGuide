# CareerPath

> Plataforma de orientación vocacional — proyecto integrador **CodeUp Riwi: Beyond Limits**.

Un usuario se registra, responde un test vocacional de 20 preguntas, recibe un **perfil vocacional calculado** y **3 carreras recomendadas**, puede consultar el catálogo completo de carreras y revisar su historial de resultados. Un administrador puede gestionar preguntas y carreras, y consultar analítica básica de uso — todo desde la propia interfaz, sin tocar la base de datos ni Swagger.

## Tabla de contenido

- [Características](#características)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Instalación y ejecución](#instalación-y-ejecución)
  - [Opción rápida: Docker Compose](#opción-rápida-recomendada-base-de-datos--backend-con-docker)
  - [Alternativa: backend en Python local](#alternativa-backend-en-python-local-sin-docker)
  - [Servir el frontend](#servir-el-frontend)
- [Variables de entorno](#variables-de-entorno)
- [Referencia de la API](#referencia-de-la-api)
- [Modelo de datos](#modelo-de-datos)
- [Testing](#testing)
- [Crear un usuario administrador](#crear-un-usuario-administrador)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Historias de usuario](#historias-de-usuario)
- [Decisiones técnicas destacadas](#decisiones-técnicas-destacadas)
- [Documentación adicional](#documentación-adicional)

## Características

- **Autenticación JWT** con registro (nombre, apellido, país, género, correo y contraseña) e inicio de sesión.
- **Test vocacional de 20 preguntas** (escala Likert 1–5), presentadas de a una, con navegación y validación de que todas fueron respondidas.
- **Cálculo automático del perfil vocacional** (5 perfiles posibles) a partir de las respuestas, con regla de desempate determinista.
- **Recomendación de 3 carreras** coherentes con el perfil obtenido, mostradas junto al resultado.
- **Catálogo completo de carreras** (20 carreras), con detalle individual y perfil asociado.
- **Historial de resultados** del usuario, ordenado del más reciente al más antiguo.
- **Panel de administración** (solo rol `admin`): CRUD de preguntas y carreras, y analítica básica (tests completados, perfil más frecuente, carrera más recomendada).
- **Autorización por rol** aplicada tanto en la API (`require_role`) como reflejada en la interfaz (la navegación de administración solo aparece para admins).
- **Interfaz sin build tool**: SPA en JavaScript vanilla con sistema de diseño propio basado en design tokens (paleta oscura, componentes `.card`/`.btn` reutilizables, estados de foco/hover/activo/deshabilitado).

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | [FastAPI](https://fastapi.tiangolo.com/) + [SQLAlchemy 2.0](https://www.sqlalchemy.org/) + [Alembic](https://alembic.sqlalchemy.org/) |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT (PyJWT, HS256) + bcrypt |
| Frontend | JavaScript vanilla (SPA sin framework ni build tool) |
| Infraestructura | Docker Compose |
| Testing | pytest + httpx |

Ver [`Plan_Ruta_CareerPath_Individual.md`](Plan_Ruta_CareerPath_Individual.md) para el plan de trabajo completo.

## Arquitectura

```
┌─────────────────┐        HTTP / JSON        ┌──────────────────────┐        SQL        ┌──────────────┐
│  Frontend (SPA)  │  ───────────────────────▶ │   Backend (FastAPI)  │  ───────────────▶ │  PostgreSQL  │
│  JS vanilla      │  ◀─────────────────────── │   SQLAlchemy + JWT   │  ◀─────────────── │              │
└─────────────────┘                            └──────────────────────┘                    └──────────────┘
   Live Server /                                   uvicorn :8000                            Docker volume
   http.server :5500                                (Docker o venv)                          persistente
```

El frontend nunca accede a la base de datos directamente: toda la comunicación pasa por la API REST del backend, autenticada con un token JWT guardado en `localStorage` tras el login.

## Requisitos previos

- **Docker Desktop** en ejecución (para PostgreSQL y, opcionalmente, el backend).
- Algo para servir el frontend estático: extensión **Live Server** de VS Code, o `python -m http.server`.
- Solo si vas a correr el backend **sin** Docker: **Python 3.12** (no una versión más nueva: `pydantic-core` y `bcrypt` no publican wheels precompilados para 3.13/3.14 y compilarlos desde código falla en Windows).

## Instalación y ejecución

### Opción rápida (recomendada): base de datos + backend con Docker

Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

Esto levanta **dos contenedores**:
- `db`: PostgreSQL 16 con usuario/clave/base `careerpath`, con un volumen persistente.
- `backend`: construye la imagen a partir de `backend/Dockerfile`, espera a que la base de datos esté lista, corre `alembic upgrade head` automáticamente (crea las tablas y carga los datos semilla: perfiles vocacionales, 20 preguntas, 20 carreras) y levanta `uvicorn` con recarga automática en `http://localhost:8000`.

No hace falta crear `.env`, instalar Python 3.12 ni un entorno virtual para este camino — las variables (`DATABASE_URL`, `JWT_SECRET_KEY`) ya están definidas en `docker-compose.yml` para desarrollo local. Confirma que quedó arriba en `http://127.0.0.1:8000/docs`.

Para ver los logs o confirmar que las migraciones corrieron: `docker compose logs backend`. Para apagar todo (conservando los datos): `docker compose down`. Para borrar también los datos: `docker compose down -v`.

Solo falta servir el frontend — ver [Servir el frontend](#servir-el-frontend).

### Alternativa: backend en Python local (sin Docker)

Útil si prefieres depurar con tu IDE en vez de dentro del contenedor. Requiere Python 3.12.

Primero levanta solo la base de datos: `docker compose up -d db`.

**1. Variables de entorno** — `backend/.env` no está versionado en git (contiene secretos). Crea el tuyo:

```bash
cd backend
cp .env.example .env
```

Y genera tu propio `JWT_SECRET_KEY` (no reutilices el de otra persona):

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Pega el resultado en `.env`, reemplazando el placeholder. `DATABASE_URL` ya apunta a `localhost:5432`, coincidente con el `docker-compose.yml`.

**2. Entorno virtual e instalación de dependencias**

```bash
cd backend
py -3.12 -m venv venv
```

Windows:
```bash
./venv/Scripts/python.exe -m pip install -r requirements.txt
```

Mac/Linux:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

**3. Migraciones**

```bash
./venv/Scripts/python.exe -m alembic upgrade head
```

**4. Levantar el backend**

```bash
./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

### Servir el frontend

Con Live Server, o:

```bash
python -m http.server 5500 --directory frontend
```

Abrir `http://127.0.0.1:5500`.

> **CORS**: el backend (`app/main.py`) solo acepta peticiones desde `http://localhost:5500` y `http://127.0.0.1:5500`. Si el frontend se sirve en otro puerto, hay que agregarlo a `allow_origins` en `main.py`.

## Variables de entorno

Definidas en `backend/.env` (flujo local) o directamente en `docker-compose.yml` (flujo Docker):

| Variable | Descripción | Valor de ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión SQLAlchemy a PostgreSQL | `postgresql+psycopg://careerpath:careerpath@localhost:5432/careerpath` |
| `JWT_SECRET_KEY` | Clave simétrica para firmar/verificar los JWT (HS256) | Generar con `secrets.token_hex(32)` |

## Referencia de la API

Documentación interactiva completa (Swagger UI) disponible en `http://localhost:8000/docs` una vez el backend está arriba.

### Autenticación (`/auth`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/auth/register` | — | Crea un usuario (rol `usuario` por defecto). |
| `POST` | `/auth/login` | — | Autentica y devuelve un JWT. |
| `GET` | `/auth/me` | Usuario | Datos del usuario autenticado. |

### Test vocacional (`/test`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/test/questions` | Usuario | Las 20 preguntas, ordenadas (sin exponer el perfil que miden). |
| `POST` | `/test/submit` | Usuario | Envía las 20 respuestas; calcula perfil + 3 carreras recomendadas. |
| `GET` | `/test/history` | Usuario | Historial de resultados del usuario, del más reciente al más antiguo. |

### Carreras (`/careers`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/careers` | Usuario | Catálogo completo (20 carreras), orden alfabético. |
| `GET` | `/careers/{id}` | Usuario | Detalle de una carrera junto con su perfil vocacional. |

### Administración (`/admin`) — requiere rol `admin`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/profiles` | Lista los 5 perfiles vocacionales (para poblar formularios). |
| `GET` / `POST` | `/admin/questions` | Listar / crear preguntas. |
| `PUT` / `DELETE` | `/admin/questions/{id}` | Editar / eliminar una pregunta. |
| `GET` / `POST` | `/admin/careers` | Listar / crear carreras. |
| `PUT` / `DELETE` | `/admin/careers/{id}` | Editar / eliminar una carrera (protegido: no permite dejar un perfil con menos de 3 carreras). |
| `GET` | `/admin/analytics` | Tests completados, perfil más frecuente, carrera más recomendada. |

### Otros

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Healthcheck simple. |

## Modelo de datos

Tablas principales (ver migraciones en `backend/alembic/versions/`):

- **`users`** — cuenta, credenciales (hash bcrypt), rol (`usuario` / `admin`), datos de perfil (nombre, apellido, país, género).
- **`vocational_profiles`** — los 5 perfiles vocacionales posibles.
- **`questions`** — las 20 preguntas del test, cada una asociada a un perfil.
- **`test_attempts`** / **`answers`** — cada intento de test y las respuestas crudas asociadas (separado del resultado calculado).
- **`results`** — perfil calculado por intento, asociado al usuario (1 resultado por intento).
- **`careers`** — catálogo de carreras (20), cada una asociada a un perfil.

## Testing

Los tests corren contra el entorno local de Python (no dentro del contenedor) y cubren la lógica de negocio pura (cálculo de perfil, validación de envíos, reglas de administración) sin necesidad de base de datos:

```bash
cd backend
./venv/Scripts/python.exe -m pytest -q
```

| Archivo | Cubre |
|---|---|
| `tests/test_auth.py` | JWT (creación/decodificación), `get_current_user`, `require_role`. |
| `tests/test_test_submission.py` | Validación de envío del test, cálculo de perfil, selección de carreras recomendadas. |
| `tests/test_admin.py` | Reglas de borrado seguro de carreras, cálculo de analítica (moda de perfil, carrera más recomendada). |

## Crear un usuario administrador

No existe un flujo de auto-registro como admin (decisión intencional). Hay que registrarse normalmente desde la app y luego promover el rol directamente en la base de datos:

```bash
docker exec -it proyecto_integradorriwi-db-1 psql -U careerpath -d careerpath -c "UPDATE users SET role='admin' WHERE email='tu_correo@ejemplo.com';"
```

Con ese usuario, la opción "Administración" aparece en la barra de navegación al iniciar sesión.

## Estructura del proyecto

```
backend/
  app/
    main.py          # instancia de FastAPI, CORS, routers
    config.py         # variables de entorno
    database.py        # engine SQLAlchemy, sesión
    models.py           # modelos ORM
    schemas.py           # esquemas Pydantic
    security.py           # hashing de contraseñas, JWT
    dependencies.py        # autenticación/autorización por rol
    routers/                # auth, test, careers, admin
  alembic/versions/    # migraciones de base de datos
  tests/               # pruebas con pytest
  Dockerfile           # imagen del backend (migra y levanta uvicorn)
  .dockerignore
frontend/
  index.html
  css/styles.css
  js/
    api.js             # wrapper fetch hacia la API
    app.js              # punto de entrada de la SPA, navegación
    views/               # register, login, test, results, careers, history, admin
docker-compose.yml     # servicios db (PostgreSQL) y backend
```

## Historias de usuario

| Historia | Prioridad | Descripción |
|---|---|---|
| HU-01 | Must | Registro de usuario |
| HU-02 | Must | Inicio de sesión |
| HU-03 | Must | Realizar el test vocacional |
| HU-04 | Must | Obtener el perfil vocacional calculado |
| HU-05 | Must | Recibir recomendación de 3 carreras |
| HU-06 | Must | Consultar catálogo de carreras |
| HU-07 | Should | Consultar historial de resultados |
| HU-08 / HU-08b | Should | Administrar preguntas y carreras (API + interfaz) |
| HU-09 | Should | Consultar analítica básica |
| HU-10 | Should | Sistema de diseño y tema visual |

## Decisiones técnicas destacadas

- **Doble validación** (Pydantic + `CHECK` en base de datos) para reglas de negocio críticas (rol, contraseña, rango de respuestas, género), de forma que la integridad no dependa únicamente de la API.
- **JWT stateless con HS256**: sin refresh tokens ni lista de revocación, dado el alcance del proyecto; el logout es solo del lado del cliente.
- **Cálculo del perfil oculto al frontend**: `GET /test/questions` nunca expone a qué perfil pertenece cada pregunta, para que el resultado no pueda manipularse.
- **Autorización por rol reforzada a nivel de router** (`require_role("admin")` aplicado a todo `/admin`), no endpoint por endpoint.
<<<<<<< HEAD
- **Sin frameworks de frontend ni build tool**: SPA en JS vanilla con un sistema de diseño propio basado en variables CSS (design tokens), suficiente para el alcance visual del proyecto.
=======
- **Sin frameworks de frontend ni build tool**: SPA en JS vanilla con un sistema de diseño propio basado en variables CSS (design tokens), suficiente para el alcance visual del proyecto.

>>>>>>> 5ad9da6b714e684ba83913cb1f849f138b5ff57e
