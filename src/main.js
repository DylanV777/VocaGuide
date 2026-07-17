import { Navbar } from "./components/layout/navbar.js";
import { Footer } from "./components/layout/footer.js";
import { Router, navigate } from "./router/router.js";

document.getElementById("navbar").innerHTML = Navbar();
document.getElementById("footer").innerHTML = Footer();

Router();
window.addEventListener("popstate", () => {
    Router();
});

document.getElementById("homeBtn").addEventListener("click", () => {
    navigate("/");
});

document.getElementById("loginBtn").addEventListener("click", () => {
    navigate("/login");
});

document.getElementById("registerBtn").addEventListener("click", () => {
    navigate("/register");
});