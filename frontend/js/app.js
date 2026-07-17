const appContainer = document.getElementById("app");

if (localStorage.getItem("access_token")) {
  renderTestView(appContainer);
} else {
  renderLoginView(appContainer);
}
