const LIKERT_LABELS = [
  "Muy en desacuerdo",
  "En desacuerdo",
  "Neutral",
  "De acuerdo",
  "Muy de acuerdo",
];

async function renderTestView(container) {
  container.innerHTML = `<section class="card"><p>Cargando preguntas...</p></section>`;

  let questions;
  try {
    questions = await apiGet("/test/questions");
  } catch (error) {
    localStorage.removeItem("access_token");
    renderLoginView(container);
    return;
  }

  const answers = {};
  let currentIndex = 0;

  function renderQuestion() {
    const question = questions[currentIndex];
    const total = questions.length;
    const answeredCount = Object.keys(answers).length;
    const isLast = currentIndex === total - 1;
    const currentAnswer = answers[question.id];

    container.innerHTML = `
      <section class="card">
        <p class="test-progress">Pregunta ${currentIndex + 1} de ${total} · Respondidas: ${answeredCount}/${total}</p>
        <h1>${question.text}</h1>
        <div class="likert" role="radiogroup">
          ${LIKERT_LABELS.map((label, index) => {
            const value = index + 1;
            const checked = currentAnswer === value ? "checked" : "";
            return `
              <label class="likert-option">
                <input type="radio" name="answer" value="${value}" ${checked}>
                <span>${label}</span>
              </label>
            `;
          }).join("")}
        </div>
        <div class="test-nav">
          <button type="button" id="prev-btn" class="btn btn-secondary" ${currentIndex === 0 ? "disabled" : ""}>Anterior</button>
          <button type="button" id="next-btn" class="btn btn-primary" disabled>${isLast ? "Enviar" : "Siguiente"}</button>
        </div>
        <p id="test-message" class="message"></p>
      </section>
    `;

    const nextBtn = container.querySelector("#next-btn");
    nextBtn.disabled = currentAnswer === undefined;

    container.querySelectorAll('input[name="answer"]').forEach((input) => {
      input.addEventListener("change", () => {
        answers[question.id] = Number(input.value);
        nextBtn.disabled = false;
      });
    });

    container.querySelector("#prev-btn").addEventListener("click", () => {
      currentIndex -= 1;
      renderQuestion();
    });

    nextBtn.addEventListener("click", async () => {
      if (!isLast) {
        currentIndex += 1;
        renderQuestion();
        return;
      }

      const messageEl = container.querySelector("#test-message");
      try {
        const payload = {
          answers: Object.entries(answers).map(([question_id, value]) => ({
            question_id: Number(question_id),
            value,
          })),
        };
        const result = await apiPost("/test/submit", payload);
        renderResultsView(container, result);
      } catch (error) {
        messageEl.textContent = error.message;
        messageEl.className = "message message--error";
      }
    });
  }

  renderQuestion();
}
