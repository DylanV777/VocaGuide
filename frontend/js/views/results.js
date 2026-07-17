function renderResultsView(container, submitResult) {
  const { profile } = submitResult;

  container.innerHTML = `
    <section class="results-card">
      <p class="results-label">Tu perfil vocacional es</p>
      <h1>${profile.name}</h1>
      <p class="results-description">${profile.description}</p>
    </section>
  `;
}
