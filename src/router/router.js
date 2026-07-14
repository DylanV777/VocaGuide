import { Home, homeEvents } from "../pages/home/home.js";
import { Login, loginEvents } from "../pages/login/login.js";
import { Register, registerEvents } from "../pages/register/register.js";


export function Router(path = window.location.pathname) {

    const app = document.getElementById("app");

    switch (path) {

        case "/":
            app.innerHTML = Home();
            homeEvents();
            break;

        case "/login":
            app.innerHTML = Login();
            loginEvents();
            break;

        case "/register":
            app.innerHTML = Register();
            registerEvents();
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