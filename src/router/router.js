import { Home } from "../pages/home/home.js";

export function Router(path = window.location.pathname) {

    const app = document.getElementById("app");

    switch (path) {

        case "/":
            app.innerHTML = Home();
            break;

        case "/login":
            app.innerHTML = "<h1>Login</h1>";
            break;

        case "/register":
            app.innerHTML = "<h1>Register</h1>";
            break;

        default:
            app.innerHTML = "<h1>404 - Page not found</h1>";
            break;
    }
}

export function navigate(path) {

    window.history.pushState({}, "", path);

    Router(path);

}