# Plan de Ruta y Desarrollo Individual
### Proyecto CareerPath — CodeUp Riwi: Beyond Limits
*Adaptación del bosquejo Scrum / MoSCoW original (equipo de 6) a ejecución individual*

Jairo · Julio 2026

---

## 1. Adaptación del enfoque

El bosquejo original fue diseñado para un equipo de 6 personas trabajando 8 días en 2 sprints. Como vas a ejecutar tú solo todas las tareas (Scrum Master, Backend, Frontend y Analista a la vez), este plan reorganiza el mismo alcance en fases secuenciales, con una carga de trabajo realista para una sola persona.

**Supuesto de tiempo:** se plantea un total de 20 días hábiles (aprox. 4 semanas) con dedicación parcial diaria. Si tu disponibilidad real es distinta, las fases se pueden comprimir o extender proporcionalmente sin cambiar su orden ni su contenido.

**Ajuste de stack tecnológico:** el bosquejo original mencionaba MySQL y Jira/GitHub Projects como opciones. Este plan usa el stack que ya definiste para el proyecto: FastAPI, PostgreSQL, SQLAlchemy, Alembic, autenticación JWT, y frontend SPA en JavaScript vanilla con GitHub Projects como tablero.

---

## 2. Roadmap general por fases

Cada fase entrega algo funcional y verificable antes de pasar a la siguiente. El orden respeta las dependencias técnicas: primero la base, luego autenticación, luego el núcleo funcional (test → resultado → recomendación), y al final las mejoras Should Have y el cierre.

| Fase | Duración estimada | Objetivo principal | Entregable clave |
|---|---|---|---|
| **Fase 0 — Cimentación** | 2 días | Repositorio, entorno, estructura FastAPI + SPA, modelo de datos en PostgreSQL | Proyecto ejecutable localmente con esqueleto backend/frontend |
| **Fase 1 — Autenticación** | 3 días | Registro, login, JWT y roles (usuario/admin) | Sistema de acceso funcional y protegido |
| **Fase 2 — Test vocacional** | 4 días | Modelo de preguntas, perfiles vocacionales, endpoint y pantalla del test | Test de 20 preguntas operativo de principio a fin |
| **Fase 3 — Resultados y recomendación** | 4 días | Cálculo de perfil, recomendación de 3 carreras, pantalla de resultados, pruebas automatizadas de la lógica de cálculo | Flujo completo: test → perfil → recomendación, cubierto por tests |
| **Fase 4 — Catálogo de carreras** | 2 días | Listado y detalle de carreras (reutiliza patrón CRUD ya resuelto) | Catálogo navegable conectado al backend |
| **Fase 5 — Extras seleccionados** | 3 días | Historial de resultados, CRUD básico de administración y analítica básica para el admin | Funcionalidad Should Have esencial |
| **Fase 6 — Cierre** | 2 días | Pruebas manuales, documentación final y preparación de la demo | Proyecto listo para sustentación |

---

## 3. Historias de usuario mínimas necesarias

Se redujo el backlog a las historias estrictamente necesarias para que el MVP funcione de principio a fin. Las funcionalidades Could Have y Won't Have del bosquejo original no se incluyen como historias; quedan como posibles mejoras si el tiempo lo permite.

### HU-01 · Registro de usuario — **Must**
*Como visitante, quiero crear una cuenta para acceder a la plataforma y guardar mis resultados.*
- El sistema valida correo único y contraseña con requisitos mínimos de seguridad.
- Se crea el usuario con rol "usuario" por defecto.
- Se retorna confirmación clara si el registro fue exitoso o si hubo un error.

### HU-02 · Inicio de sesión — **Must**
*Como usuario registrado, quiero iniciar sesión para acceder a mi cuenta de forma segura.*
- El sistema autentica con correo/contraseña y emite un token JWT.
- Rutas protegidas rechazan el acceso sin token válido.
- El rol del usuario determina qué vistas puede consultar (usuario/admin).

### HU-03 · Realizar el test vocacional — **Must**
*Como usuario autenticado, quiero responder un test de 20 preguntas para conocer mi perfil vocacional.*
- El test presenta las 20 preguntas en orden y permite responderlas todas.
- No se puede enviar el test si quedan preguntas sin responder.
- Las respuestas se envían al backend en un único envío estructurado.

### HU-04 · Obtener el perfil vocacional — **Must**
*Como usuario que completó el test, quiero ver mi perfil vocacional calculado para entender mis resultados.*
- El backend calcula el perfil a partir de las respuestas según las reglas definidas.
- El resultado se guarda asociado al usuario.
- La pantalla de resultados muestra el perfil obtenido de forma clara.

### HU-05 · Recibir recomendación de carreras — **Must**
*Como usuario con un perfil calculado, quiero recibir 3 carreras recomendadas para orientar mi decisión.*
- El sistema recomienda exactamente 3 carreras coherentes con el perfil obtenido.
- Cada carrera recomendada muestra un nombre y una breve descripción.
- La recomendación se muestra junto con el resultado del test.

### HU-06 · Consultar catálogo de carreras — **Must**
*Como usuario, quiero explorar un listado de carreras disponibles para informarme más allá de mi recomendación.*
- Existe un listado accesible con todas las carreras cargadas en el sistema.
- Cada carrera del listado puede consultarse con su información básica.
- El listado carga correctamente incluso si el usuario no completó el test.

### HU-07 · Consultar historial de resultados — **Should**
*Como usuario, quiero ver mis resultados anteriores para comparar mi evolución en el tiempo.*
- El sistema almacena cada resultado de test con su fecha.
- El usuario puede ver una lista de sus resultados pasados.
- Se muestra al menos la fecha y el perfil obtenido en cada registro.

## HU-08 · Gestionar preguntas y carreras desde la interfaz — **Should**
*Como administrador, quiero gestionar preguntas y carreras desde una pantalla propia de la aplicación en vez de usar Swagger o la base de datos directamente, para poder mantener el contenido del test de forma más ágil.*
- La opción "Administración" solo aparece en la navegación si el usuario autenticado tiene rol `admin`.
- El administrador puede ver el listado completo de preguntas y de carreras, crear nuevas, editar las existentes y eliminarlas, sin salir de la aplicación.
- Los errores devueltos por el backend (perfil inexistente, nombre u `order` duplicado, borrado bloqueado por reglas de negocio) se muestran de forma clara en la interfaz, no como un error genérico.

### HU-09 · Consultar analítica básica — **Should**
*Como administrador, quiero ver estadísticas simples sobre el uso del test para entender cómo lo están usando los usuarios.*
- El sistema muestra el perfil vocacional más frecuente entre los resultados guardados.
- El sistema muestra la carrera recomendada con más apariciones.
- El sistema muestra el número total de tests completados.
- Solo usuarios con rol admin pueden acceder a esta vista.

## Diseño y consistencia visual

### HU-10 · Sistema de diseño y tema visual — **Should**
*Como usuario, quiero una interfaz con estilo visual coherente (colores, tipografía, espaciados) para que la plataforma se sienta profesional y agradable.*

- Se define una paleta de colores, tipografía y componentes base reutilizables (botones, tarjetas, inputs).
- Todas las pantallas aplican el mismo estilo de forma consistente.
- Los elementos interactivos tienen estados visibles: hover, foco, activo y deshabilitado.

### HU-11 · Modo claro / oscuro — **Could**
*Como usuario, quiero alternar entre modo claro y oscuro para usar la plataforma según mi preferencia o entorno.*

- Existe un botón visible para cambiar de tema.
- La preferencia se conserva entre sesiones.
- Ambos modos mantienen contraste y legibilidad adecuados.

## Retroalimentación y estados

### HU-12 · Estados de carga y vacío — **Should**
*Como usuario, quiero ver indicadores mientras la app procesa datos y mensajes claros cuando no hay contenido, para saber siempre qué está pasando.*

- Las peticiones al backend muestran un spinner o skeleton mientras cargan.
- Las listas sin datos (historial, catálogo) muestran un estado vacío con mensaje e ícono, no una pantalla en blanco.
- Los errores muestran un mensaje amigable con opción de reintentar.

### HU-13 · Notificaciones y confirmaciones visuales — **Should**
*Como usuario, quiero recibir avisos claros (toasts/alertas) tras mis acciones para confirmar que se realizaron correctamente.*

- Acciones como registro, login, envío del test y operaciones de admin muestran una notificación de éxito o error.
- Las notificaciones desaparecen solas y no bloquean la navegación.
- El color y el ícono comunican el tipo de mensaje (éxito, error, info).

## Experiencia del test y resultados

### HU-14 · Barra de progreso del test — **Should**
*Como usuario, quiero ver mi avance mientras respondo las 20 preguntas para saber cuánto me falta.*

- Se muestra una barra o contador (ej. "Pregunta 7 de 20").
- El progreso se actualiza al responder cada pregunta.
- Se resalta visualmente si faltan preguntas por responder antes de enviar.

### HU-15 · Resultados visuales con gráficos — **Should**
*Como usuario, quiero ver mi perfil vocacional y recomendaciones con gráficos y tarjetas atractivas en lugar de solo texto.*

- El perfil se muestra con un gráfico (barras, radar o similar).
- Cada carrera recomendada aparece en una tarjeta con ícono, nombre y descripción.
- El diseño resalta el resultado principal de forma visualmente clara.

## Navegación y accesibilidad

### HU-16 · Navegación y layout responsive — **Must/Should**
*Como usuario, quiero una navegación clara y que la interfaz se adapte a móvil, tablet y escritorio.*

- Existe una barra de navegación coherente que indica la sección actual.
- Todas las pantallas se ven y funcionan bien en móvil y escritorio.
- La opción "Administración" solo aparece visualmente para rol admin.

### HU-17 · Accesibilidad básica — **Could**
*Como usuario, quiero una interfaz accesible para poder usarla cómodamente sin importar mis capacidades.*

- Contraste de color suficiente (WCAG AA) y tamaños de texto legibles.
- Navegación por teclado y textos alternativos en íconos/imágenes.
- Formularios con etiquetas y mensajes de error asociados.

---

## 4. Backlog técnico por fase

Desglose de tareas técnicas dentro de cada fase, manteniendo los códigos del bosquejo original para trazabilidad.

### Fase 0 — Cimentación
| Código | Tarea | Prioridad |
|---|---|---|
| ARQ-01 | Crear repositorio y estructura de ramas (GitFlow) | Must |
| ARQ-02 | Crear tablero personal en GitHub Projects | Must |
| ARQ-03 | Crear estructura base de FastAPI | Must |
| ARQ-04 | Crear estructura base de la SPA (vanilla JS) | Must |
| DB-01 | Diseñar modelo de datos en PostgreSQL (3NF) | Must |
| DB-02 | Configurar conexión FastAPI + SQLAlchemy + Alembic | Must |

### Fase 1 — Autenticación
| Código | Tarea | Prioridad |
|---|---|---|
| AUTH-01 | Endpoint y pantalla de registro | Must |
| AUTH-02 | Endpoint y pantalla de login con JWT | Must |
| AUTH-03 | Roles usuario/admin y protección de rutas | Must |

### Fase 2 — Test vocacional
| Código | Tarea | Prioridad |
|---|---|---|
| TEST-01 | Definir perfiles vocacionales y reglas de cálculo | Must |
| TEST-02 | Cargar 20 preguntas del test | Must |
| TEST-03 | Endpoint de preguntas | Must |
| FRONT-01 | Pantalla del test (navegación entre preguntas) | Must |

### Fase 3 — Resultados y recomendación
| Código | Tarea | Prioridad |
|---|---|---|
| RES-01 | Calcular perfil vocacional a partir de respuestas | Must |
| RES-02 | Guardar resultado del usuario | Must |
| RES-03 | Recomendar 3 carreras según perfil | Must |
| RES-04 | Tests automatizados (pytest) para RES-01 y RES-03, incluyendo casos borde (empates, respuestas incompletas) | Must |
| FRONT-02 | Pantalla de resultados | Must |

### Fase 4 — Catálogo de carreras
| Código | Tarea | Prioridad |
|---|---|---|
| CAR-01 | Endpoint y pantalla de listado de carreras | Must |
| CAR-02 | Detalle de carrera | Should |

### Fase 5 — Extras seleccionados
| Código | Tarea | Prioridad |
|---|---|---|
| HIST-01 | Historial de resultados | Should |
| ADMIN-01 | CRUD de carreras (admin) | Should |
| ADMIN-02 | CRUD de preguntas (admin) | Should |
| ANALYTICS-01 | Endpoint y pantalla de analítica básica (HU-09): perfil más frecuente, carrera más recomendada, total de tests completados | Should |

### Fase 6 — Cierre
| Código | Tarea | Prioridad |
|---|---|---|
| DOC-01 | README y documentación técnica | Must |
| DOC-02 | Documentación Scrum final | Must |
| QA-01 | Pruebas manuales completas | Must |
| DEMO-01 | Preparar sustentación | Must |

---

## 5. Flujo de trabajo Git (GitFlow simplificado)

Al trabajar solo, no necesitas ramas de integración por integrante, pero sí mantener separación clara entre lo estable y lo que estás construyendo.

| Rama | Uso |
|---|---|
| `main` | Versión estable y desplegable del proyecto |
| `develop` | Integración de funcionalidades completadas |
| `feature/<nombre>` | Desarrollo individual de cada tarea (una por historia o tarea técnica) |
| `fix/<nombre>` | Corrección de errores detectados durante pruebas |

> Recomendación: crea una rama `feature/` por cada tarea del backlog técnico (por ejemplo `feature/auth-login`) y haz merge a `develop` solo cuando la tarea cumpla su Definition of Done.

---

## 6. Definition of Done (adaptada para trabajo individual)

- Cumple los criterios de aceptación de su historia de usuario.
- Está subida a GitHub en la rama correspondiente.
- Tiene un commit claro y descriptivo.
- Fue probada manualmente por ti antes de marcarla como hecha.
- No rompe otra funcionalidad ya construida.
- Está documentada si aplica (README o comentarios relevantes).

---

## 7. Tablero personal

Columnas sugeridas para tu tablero (se elimina "Code Review" entre pares, ya que no aplica trabajando solo; se reemplaza por una revisión propia antes de mover la tarjeta a Hecho):

- Backlog
- To Do
- En Progreso
- En Pruebas
- Hecho

---

## 8. Registro diario (autoseguimiento)

Formato para completar cada día de trabajo. Sustituye al daily del equipo, pero cumple la misma función: mantener visibilidad de avance, bloqueos y ajustes.

| Campo | Registro |
|---|---|
| Fecha | |
| Fase / Objetivo del día | |
| Avance de ayer | |
| Plan de hoy | |
| Bloqueos o dudas | |
| Ajustes al plan | |

---

## 9. Regla de prioridad

1. Durante las Fases 0 a 3 (núcleo del MVP) solo se trabajan tareas Must Have.
2. En la Fase 4 y 5 se incorporan tareas Should Have, priorizando las que dan más valor a la sustentación.
3. En la Fase 6 no se agregan funcionalidades nuevas: solo pruebas, correcciones, documentación y preparación de la demo.
4. Las tareas Could Have del bosquejo original solo se retoman si terminas antes de tiempo y el MVP ya está estable.
