const appContainer = document.getElementById("app");
const navContainer = document.getElementById("nav");

function renderNav() {
  if (!localStorage.getItem("access_token")) {
    navContainer.innerHTML = "";
    return;
  }

  const isAdmin = localStorage.getItem("user_role") === "admin";

  navContainer.innerHTML = `
    <div class="nav-bar">
      <button type="button" id="nav-test">Test vocacional</button>
      <button type="button" id="nav-careers">Catálogo de carreras</button>
      <button type="button" id="nav-history">Mi historial</button>
      ${isAdmin ? '<button type="button" id="nav-admin">Administración</button>' : ""}
    </div>
  `;

  navContainer.querySelector("#nav-test").addEventListener("click", () => renderTestView(appContainer));
  navContainer.querySelector("#nav-careers").addEventListener("click", () => renderCareersView(appContainer));
  navContainer.querySelector("#nav-history").addEventListener("click", () => renderHistoryView(appContainer));

  if (isAdmin) {
    navContainer.querySelector("#nav-admin").addEventListener("click", () => renderAdminView(appContainer));
  }
}

async function initApp() {
  if (!localStorage.getItem("access_token")) {
    renderLoginView(appContainer);
    return;
  }

  try {
    const me = await apiGet("/auth/me");
    localStorage.setItem("user_role", me.role);
  } catch (error) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    renderLoginView(appContainer);
    return;
  }

  renderNav();
  renderTestView(appContainer);
}

initApp();
