function renderLoginView(container) {
  container.innerHTML = `
    <section class="card card--sm">
      <h1>Iniciar sesión</h1>
      <form id="login-form">
        <label for="email">Correo</label>
        <input type="email" id="email" required>

        <label for="password">Contraseña</label>
        <input type="password" id="password" required>

        <button type="submit" class="btn btn-primary">Entrar</button>
      </form>
      <p id="login-message" class="message"></p>
      <p><a href="#" id="go-to-register">¿No tienes cuenta? Regístrate</a></p>
    </section>
  `;

  const form = container.querySelector("#login-form");
  const messageEl = container.querySelector("#login-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    messageEl.textContent = "";
    messageEl.className = "message";

    const email = form.querySelector("#email").value;
    const password = form.querySelector("#password").value;

    try {
      const { access_token } = await apiPost("/auth/login", { email, password });
      localStorage.setItem("access_token", access_token);

      const me = await apiGet("/auth/me");
      localStorage.setItem("user_role", me.role);

      renderNav();
      renderTestView(container);
    } catch (error) {
      messageEl.textContent = error.message;
      messageEl.className = "message message--error";
    }
  });

  container.querySelector("#go-to-register").addEventListener("click", (event) => {
    event.preventDefault();
    renderRegisterView(container);
  });
}
