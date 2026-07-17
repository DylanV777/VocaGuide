function renderResultsView(container, submitResult) {
  const { profile, recommended_careers } = submitResult;

  container.innerHTML = `
    <section class="results-card">
      <p class="results-label">Tu perfil vocacional es</p>
      <h1>${profile.name}</h1>
      <p class="results-description">${profile.description}</p>

      <h2 class="careers-title">Carreras recomendadas para ti</h2>
      <ul class="careers-list">
        ${recommended_careers
          .map(
            (career) => `
              <li class="career-item">
                <p class="career-name">${career.name}</p>
                <p class="career-description">${career.description}</p>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
  `;
}
