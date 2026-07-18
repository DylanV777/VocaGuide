import { Login, loginEvents } from "../pages/login/login.js";
import { Register, registerEvents } from "../pages/register/register.js";
import { Test, testEvents } from "../pages/test/test.js";
import { Results, resultsEvents } from "../pages/results/results.js";
import { Compare, compareEvents } from "../pages/compare/compare.js";
import { Favorites, favoritesEvents } from "../pages/favorites/favorites.js";
import { Dashboard, dashboardEvents } from "../pages/dashboard/dashboard.js";


export function Router(path = window.location.hash.replace("#", "") || window.location.pathname || "/") {

    const app = document.getElementById("app");

    switch (path) {

        case "/":
        case "/login":
            app.innerHTML = Login();
            loginEvents();
            break;

        case "/register":
            app.innerHTML = Register();
            registerEvents();
            break;

        case "/test":
            app.innerHTML = Test();
            testEvents();
            break;

        case "/results":
            app.innerHTML = Results();
            resultsEvents();
            break;

        case "/compare":
            app.innerHTML = Compare();
            compareEvents();
            break;

        case "/favorites":
            app.innerHTML = Favorites();
            favoritesEvents();
            break;

        case "/admin":
            app.innerHTML = Dashboard();
            dashboardEvents();
            break;

        default:
            app.innerHTML = "<h1>404 - Page not found</h1>";
            break;
    }
}

export function navigate(path) {

    const hashPath = path.startsWith("#") ? path : `#${path}`;
    window.location.hash = hashPath;
    Router(hashPath.replace("#", ""));

}