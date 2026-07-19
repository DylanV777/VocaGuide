function renderRegisterView(container) {
  container.innerHTML = `
    <section class="card card--sm">
      <h1>Crear cuenta</h1>
      <form id="register-form">
        <label for="first-name">Nombre</label>
        <input type="text" id="first-name" required>

        <label for="last-name">Apellido</label>
        <input type="text" id="last-name" required>

        <label for="country">País</label>
        <input type="text" id="country" required>

        <label for="gender">Género</label>
        <select id="gender" required>
          <option value="" disabled selected>Selecciona una opción</option>
          <option value="hombre">Hombre</option>
          <option value="mujer">Mujer</option>
        </select>

        <label for="email">Correo</label>
        <input type="email" id="email" required>

        <label for="password">Contraseña</label>
        <input type="password" id="password" required minlength="8">

        <button type="submit" class="btn btn-primary">Registrarme</button>
      </form>
      <p id="register-message" class="message"></p>
      <p><a href="#" id="go-to-login">¿Ya tienes cuenta? Inicia sesión</a></p>
    </section>
  `;

  const form = container.querySelector("#register-form");
  const messageEl = container.querySelector("#register-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    messageEl.textContent = "";
    messageEl.className = "message";

    const first_name = form.querySelector("#first-name").value;
    const last_name = form.querySelector("#last-name").value;
    const country = form.querySelector("#country").value;
    const gender = form.querySelector("#gender").value;
    const email = form.querySelector("#email").value;
    const password = form.querySelector("#password").value;

    try {
      await apiPost("/auth/register", { first_name, last_name, country, gender, email, password });
      messageEl.textContent = "Cuenta creada correctamente. Ya puedes iniciar sesión.";
      messageEl.className = "message message--success";
      form.reset();
    } catch (error) {
      messageEl.textContent = error.message;
      messageEl.className = "message message--error";
    }
  });

  container.querySelector("#go-to-login").addEventListener("click", (event) => {
    event.preventDefault();
    renderLoginView(container);
  });
}
