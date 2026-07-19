# CareerPath

Plataforma de orientación vocacional — CodeUp Riwi: Beyond Limits.

Un usuario se registra, responde un test vocacional de 20 preguntas, recibe un perfil vocacional calculado y 3 carreras recomendadas, puede consultar el catálogo completo de carreras y su historial de resultados. Un administrador puede gestionar preguntas y carreras, y consultar analítica básica de uso.

## Stack

- **Backend**: FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL, autenticación JWT.
- **Frontend**: SPA en JavaScript vanilla (sin framework ni build tool).
- **Base de datos**: PostgreSQL vía Docker Compose.

Ver [`Plan_Ruta_CareerPath_Individual.md`](Plan_Ruta_CareerPath_Individual.md) para el plan de trabajo completo y [`explicacion.md`](explicacion.md) para el detalle de decisiones técnicas tomadas en cada historia de usuario.

## Requisitos previos

- **Docker Desktop** en ejecución (para PostgreSQL y, opcionalmente, el backend).
- Algo para servir el frontend estático: extensión **Live Server** de VS Code, o `python -m http.server`.
- Solo si vas a correr el backend **sin** Docker: **Python 3.12** (no una versión más nueva: `pydantic-core` y `bcrypt` no publican wheels precompilados para 3.13/3.14 y compilarlos desde código falla en Windows).

## Opción rápida (recomendada): base de datos + backend con Docker

Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

Esto levanta **dos contenedores**:
- `db`: PostgreSQL 16 con usuario/clave/base `careerpath`, con un volumen persistente.
- `backend`: construye la imagen a partir de `backend/Dockerfile`, espera a que la base de datos esté lista, corre `alembic upgrade head` automáticamente (crea las tablas y carga los datos semilla: perfiles vocacionales, 20 preguntas, 20 carreras) y levanta `uvicorn` con recarga automática en `http://localhost:8000`.

No hace falta crear `.env`, instalar Python 3.12 ni un entorno virtual para este camino — las variables (`DATABASE_URL`, `JWT_SECRET_KEY`) ya están definidas en `docker-compose.yml` para desarrollo local. Confirma que quedó arriba en `http://127.0.0.1:8000/docs`.

Para ver los logs o confirmar que las migraciones corrieron: `docker compose logs backend`. Para apagar todo (conservando los datos): `docker compose down`. Para borrar también los datos: `docker compose down -v`.

Solo falta servir el frontend — ver el paso "Servir el frontend" más abajo.

## Alternativa: backend en Python local (sin Docker)

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

## Servir el frontend

Con Live Server, o:

```bash
python -m http.server 5500 --directory frontend
```

Abrir `http://127.0.0.1:5500`.

> **CORS**: el backend (`app/main.py`) solo acepta peticiones desde `http://localhost:5500` y `http://127.0.0.1:5500`. Si el frontend se sirve en otro puerto, hay que agregarlo a `allow_origins` en `main.py`.

## Correr los tests del backend

Los tests corren contra el entorno local de Python (no dentro del contenedor):

```bash
cd backend
./venv/Scripts/python.exe -m pytest -q
```

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
    config.py        # variables de entorno
    database.py      # engine SQLAlchemy, sesión
    models.py        # modelos ORM
    schemas.py       # esquemas Pydantic
    security.py      # hashing de contraseñas, JWT
    dependencies.py  # autenticación/autorización por rol
    routers/         # auth, test, careers, admin
  alembic/versions/  # migraciones de base de datos
  tests/             # pruebas con pytest
  Dockerfile         # imagen del backend (migra y levanta uvicorn)
  .dockerignore
frontend/
  index.html
  css/styles.css
  js/
    api.js           # wrapper fetch hacia la API
    app.js            # punto de entrada de la SPA, navegación
    views/            # una vista por pantalla
docker-compose.yml    # servicios db (PostgreSQL) y backend
```
