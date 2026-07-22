function formatResultDate(isoDate) {
  return new Date(isoDate).toLocaleString("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

async function renderHistoryView(container) {
  container.innerHTML = `<section class="card"><p>Cargando historial...</p></section>`;

  let history;
  try {
    history = await apiGet("/test/history");
  } catch (error) {
    container.innerHTML = `<section class="card"><p class="message message--error">${error.message}</p></section>`;
    return;
  }

  if (history.length === 0) {
    container.innerHTML = `
      <section class="card">
        <h1>Mi historial</h1>
        <p>Todavía no has completado el test vocacional.</p>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section class="card">
      <h1>Mi historial</h1>
      <ul class="careers-list">
        ${history
          .map(
            (item) => `
              <li class="career-item">
                <p class="career-name">${item.profile.name}</p>
                <p class="career-description">${formatResultDate(item.created_at)}</p>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
  `;
}
