function renderRegisterView(container) {
  container.innerHTML = `
    <section class="auth-card">
      <h1>Crear cuenta</h1>
      <form id="register-form">
        <label for="email">Correo</label>
        <input type="email" id="email" required>

        <label for="password">Contraseña</label>
        <input type="password" id="password" required minlength="8">

        <button type="submit">Registrarme</button>
      </form>
      <p id="register-message" class="message"></p>
    </section>
  `;

  const form = container.querySelector("#register-form");
  const messageEl = container.querySelector("#register-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    messageEl.textContent = "";
    messageEl.className = "message";

    const email = form.querySelector("#email").value;
    const password = form.querySelector("#password").value;

    try {
      await apiPost("/auth/register", { email, password });
      messageEl.textContent = "Cuenta creada correctamente. Ya puedes iniciar sesión.";
      messageEl.className = "message message--success";
      form.reset();
    } catch (error) {
      messageEl.textContent = error.message;
      messageEl.className = "message message--error";
    }
  });
}
