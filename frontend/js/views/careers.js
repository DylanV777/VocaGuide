async function renderCareersView(container) {
  container.innerHTML = `<section class="card"><p>Cargando carreras...</p></section>`;

  let careers;
  try {
    careers = await apiGet("/careers");
  } catch (error) {
    container.innerHTML = `<section class="card"><p class="message message--error">${error.message}</p></section>`;
    return;
  }

  function renderList() {
    container.innerHTML = `
      <section class="card">
        <h1>Catálogo de carreras</h1>
        <ul class="careers-list">
          ${careers
            .map(
              (career) => `
                <li class="career-item career-item--clickable" data-id="${career.id}" tabindex="0" role="button">
                  <p class="career-name">${career.name}</p>
                  <p class="career-description">${career.description}</p>
                </li>
              `
            )
            .join("")}
        </ul>
      </section>
    `;

    container.querySelectorAll(".career-item--clickable").forEach((item) => {
      item.addEventListener("click", () => renderDetail(Number(item.dataset.id)));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          renderDetail(Number(item.dataset.id));
        }
      });
    });
  }

  async function renderDetail(careerId) {
    container.innerHTML = `<section class="card"><p>Cargando...</p></section>`;

    try {
      const career = await apiGet(`/careers/${careerId}`);
      container.innerHTML = `
        <section class="card">
          <button type="button" class="btn btn-link" id="back-to-list">&larr; Volver al catálogo</button>
          <h1>${career.name}</h1>
          <p class="results-label">Perfil vocacional relacionado</p>
          <p class="career-related-profile">${career.profile.name}</p>
          <p class="career-description">${career.description}</p>
        </section>
      `;
      container.querySelector("#back-to-list").addEventListener("click", renderList);
    } catch (error) {
      container.innerHTML = `<section class="card"><p class="message message--error">${error.message}</p></section>`;
    }
  }

  renderList();
}
