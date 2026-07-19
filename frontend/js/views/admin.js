function renderAdminTabsHtml(activeTab) {
  return `
    <div class="admin-tabs">
      <button type="button" class="admin-tab ${activeTab === "questions" ? "admin-tab--active" : ""}" id="tab-questions">Preguntas</button>
      <button type="button" class="admin-tab ${activeTab === "careers" ? "admin-tab--active" : ""}" id="tab-careers">Carreras</button>
      <button type="button" class="admin-tab ${activeTab === "analytics" ? "admin-tab--active" : ""}" id="tab-analytics">Analítica</button>
    </div>
  `;
}

function wireAdminTabs(container, profiles) {
  container.querySelector("#tab-questions").addEventListener("click", () => renderAdminQuestions(container, profiles));
  container.querySelector("#tab-careers").addEventListener("click", () => renderAdminCareers(container, profiles));
  container.querySelector("#tab-analytics").addEventListener("click", () => renderAdminAnalytics(container, profiles));
}

async function renderAdminAnalytics(container, profiles) {
  container.innerHTML = `
    <section class="careers-catalog-card admin-card">
      ${renderAdminTabsHtml("analytics")}
      <h1>Analítica</h1>
      <p>Cargando estadísticas...</p>
    </section>
  `;
  wireAdminTabs(container, profiles);

  let analytics;
  try {
    analytics = await apiGet("/admin/analytics");
  } catch (error) {
    container.innerHTML = `
      <section class="careers-catalog-card admin-card">
        ${renderAdminTabsHtml("analytics")}
        <p class="message message--error">${error.message}</p>
      </section>
    `;
    wireAdminTabs(container, profiles);
    return;
  }

  const profileValue = analytics.most_frequent_profile ? analytics.most_frequent_profile.name : "Sin datos todavía";
  const careerValue = analytics.most_recommended_career ? analytics.most_recommended_career.name : "Sin datos todavía";

  container.innerHTML = `
    <section class="careers-catalog-card admin-card">
      ${renderAdminTabsHtml("analytics")}
      <h1>Analítica</h1>

      <div class="stat-tile-row">
        <div class="stat-tile">
          <p class="stat-tile-label">Tests completados</p>
          <p class="stat-tile-value">${analytics.total_completed_tests}</p>
        </div>
        <div class="stat-tile">
          <p class="stat-tile-label">Perfil más frecuente</p>
          <p class="stat-tile-value stat-tile-value--text">${profileValue}</p>
        </div>
        <div class="stat-tile">
          <p class="stat-tile-label">Carrera más recomendada</p>
          <p class="stat-tile-value stat-tile-value--text">${careerValue}</p>
        </div>
      </div>
    </section>
  `;
  wireAdminTabs(container, profiles);
}

async function renderAdminView(container) {
  container.innerHTML = `<section class="careers-catalog-card admin-card"><p>Cargando administración...</p></section>`;

  let profiles;
  try {
    profiles = await apiGet("/admin/profiles");
  } catch (error) {
    container.innerHTML = `<section class="careers-catalog-card admin-card"><p class="message message--error">${error.message}</p></section>`;
    return;
  }

  renderAdminQuestions(container, profiles);
}

async function renderAdminQuestions(container, profiles) {
  let questions;
  try {
    questions = await apiGet("/admin/questions");
  } catch (error) {
    container.innerHTML = `
      <section class="careers-catalog-card admin-card">
        ${renderAdminTabsHtml("questions")}
        <p class="message message--error">${error.message}</p>
      </section>
    `;
    wireAdminTabs(container, profiles);
    return;
  }

  const profileName = (profileId) => profiles.find((p) => p.id === profileId)?.name ?? "—";

  container.innerHTML = `
    <section class="careers-catalog-card admin-card">
      ${renderAdminTabsHtml("questions")}
      <h1>Administrar preguntas</h1>

      <form id="question-form" class="admin-form">
        <input type="hidden" id="question-id">

        <label for="question-text">Texto</label>
        <textarea id="question-text" required></textarea>

        <label for="question-profile">Perfil vocacional</label>
        <select id="question-profile" required>
          ${profiles.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}
        </select>

        <label for="question-order">Orden (opcional, se autoasigna si se deja vacío)</label>
        <input type="number" id="question-order" min="1">

        <div class="admin-form-actions">
          <button type="submit" id="question-submit">Crear pregunta</button>
          <button type="button" id="question-cancel" class="admin-cancel-btn" hidden>Cancelar edición</button>
        </div>
      </form>
      <p id="question-form-message" class="message"></p>

      <ul class="careers-list">
        ${questions
          .map(
            (question) => `
              <li class="career-item admin-list-item">
                <p class="career-name">#${question.order} · ${profileName(question.profile_id)}</p>
                <p class="career-description">${question.text}</p>
                <div class="admin-item-actions">
                  <button type="button" class="edit-question" data-id="${question.id}">Editar</button>
                  <button type="button" class="delete-question" data-id="${question.id}">Eliminar</button>
                </div>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
  `;

  wireAdminTabs(container, profiles);

  const form = container.querySelector("#question-form");
  const messageEl = container.querySelector("#question-form-message");
  const idField = container.querySelector("#question-id");
  const textField = container.querySelector("#question-text");
  const profileField = container.querySelector("#question-profile");
  const orderField = container.querySelector("#question-order");
  const submitBtn = container.querySelector("#question-submit");
  const cancelBtn = container.querySelector("#question-cancel");

  function resetForm() {
    idField.value = "";
    textField.value = "";
    orderField.value = "";
    profileField.selectedIndex = 0;
    submitBtn.textContent = "Crear pregunta";
    cancelBtn.hidden = true;
  }

  cancelBtn.addEventListener("click", resetForm);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    messageEl.textContent = "";
    messageEl.className = "message";

    const payload = {
      text: textField.value,
      profile_id: Number(profileField.value),
    };
    if (orderField.value) {
      payload.order = Number(orderField.value);
    }

    try {
      if (idField.value) {
        await apiPut(`/admin/questions/${idField.value}`, payload);
      } else {
        await apiPost("/admin/questions", payload);
      }
      renderAdminQuestions(container, profiles);
    } catch (error) {
      messageEl.textContent = error.message;
      messageEl.className = "message message--error";
    }
  });

  container.querySelectorAll(".edit-question").forEach((button) => {
    button.addEventListener("click", () => {
      const question = questions.find((q) => q.id === Number(button.dataset.id));
      idField.value = question.id;
      textField.value = question.text;
      profileField.value = question.profile_id;
      orderField.value = question.order;
      submitBtn.textContent = "Guardar cambios";
      cancelBtn.hidden = false;
      textField.focus();
    });
  });

  container.querySelectorAll(".delete-question").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("¿Eliminar esta pregunta?")) return;

      messageEl.textContent = "";
      messageEl.className = "message";
      try {
        await apiDelete(`/admin/questions/${button.dataset.id}`);
        renderAdminQuestions(container, profiles);
      } catch (error) {
        messageEl.textContent = error.message;
        messageEl.className = "message message--error";
      }
    });
  });
}

async function renderAdminCareers(container, profiles) {
  let careers;
  try {
    careers = await apiGet("/admin/careers");
  } catch (error) {
    container.innerHTML = `
      <section class="careers-catalog-card admin-card">
        ${renderAdminTabsHtml("careers")}
        <p class="message message--error">${error.message}</p>
      </section>
    `;
    wireAdminTabs(container, profiles);
    return;
  }

  container.innerHTML = `
    <section class="careers-catalog-card admin-card">
      ${renderAdminTabsHtml("careers")}
      <h1>Administrar carreras</h1>

      <form id="career-form" class="admin-form">
        <input type="hidden" id="career-id">

        <label for="career-name">Nombre</label>
        <input type="text" id="career-name" required>

        <label for="career-description">Descripción</label>
        <textarea id="career-description" required></textarea>

        <label for="career-profile">Perfil vocacional</label>
        <select id="career-profile" required>
          ${profiles.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}
        </select>

        <div class="admin-form-actions">
          <button type="submit" id="career-submit">Crear carrera</button>
          <button type="button" id="career-cancel" class="admin-cancel-btn" hidden>Cancelar edición</button>
        </div>
      </form>
      <p id="career-form-message" class="message"></p>

      <ul class="careers-list">
        ${careers
          .map(
            (career) => `
              <li class="career-item admin-list-item">
                <p class="career-name">${career.name} <span class="career-profile-tag">${career.profile.name}</span></p>
                <p class="career-description">${career.description}</p>
                <div class="admin-item-actions">
                  <button type="button" class="edit-career" data-id="${career.id}">Editar</button>
                  <button type="button" class="delete-career" data-id="${career.id}">Eliminar</button>
                </div>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
  `;

  wireAdminTabs(container, profiles);

  const form = container.querySelector("#career-form");
  const messageEl = container.querySelector("#career-form-message");
  const idField = container.querySelector("#career-id");
  const nameField = container.querySelector("#career-name");
  const descriptionField = container.querySelector("#career-description");
  const profileField = container.querySelector("#career-profile");
  const submitBtn = container.querySelector("#career-submit");
  const cancelBtn = container.querySelector("#career-cancel");

  function resetForm() {
    idField.value = "";
    nameField.value = "";
    descriptionField.value = "";
    profileField.selectedIndex = 0;
    submitBtn.textContent = "Crear carrera";
    cancelBtn.hidden = true;
  }

  cancelBtn.addEventListener("click", resetForm);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    messageEl.textContent = "";
    messageEl.className = "message";

    const payload = {
      name: nameField.value,
      description: descriptionField.value,
      profile_id: Number(profileField.value),
    };

    try {
      if (idField.value) {
        await apiPut(`/admin/careers/${idField.value}`, payload);
      } else {
        await apiPost("/admin/careers", payload);
      }
      renderAdminCareers(container, profiles);
    } catch (error) {
      messageEl.textContent = error.message;
      messageEl.className = "message message--error";
    }
  });

  container.querySelectorAll(".edit-career").forEach((button) => {
    button.addEventListener("click", () => {
      const career = careers.find((c) => c.id === Number(button.dataset.id));
      idField.value = career.id;
      nameField.value = career.name;
      descriptionField.value = career.description;
      profileField.value = career.profile.id;
      submitBtn.textContent = "Guardar cambios";
      cancelBtn.hidden = false;
      nameField.focus();
    });
  });

  container.querySelectorAll(".delete-career").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("¿Eliminar esta carrera?")) return;

      messageEl.textContent = "";
      messageEl.className = "message";
      try {
        await apiDelete(`/admin/careers/${button.dataset.id}`);
        renderAdminCareers(container, profiles);
      } catch (error) {
        messageEl.textContent = error.message;
        messageEl.className = "message message--error";
      }
    });
  });
}
