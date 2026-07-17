import './login.css';
import { login } from "../../services/authService.js";
import { navigate } from "../../utils/navegations.js";
export function Login() {
    return `
        <section class="login-container">

            <div class="login-card">

                <h1>Welcome</h1>

                <p>Sign in to continue in Careerpath</p>

                <form id="loginForm">

                    <div class="form-group">
                        <label for="email">Email</label>

                        <input
                            class="form-input"
                            type="email"
                            id="email"
                            name="email"
                            placeholder="ejemplo@correo.com"
                            required
                            autocomplete="email"
                        >
                    </div>

                    <div class="form-group">
                        <label for="password">Password</label>

                        <input
                            class="form-input"
                            type="password"
                            id="password"
                            name="password"
                            placeholder="********"
                            required
                            autocomplete="current-password"
                        >
                    </div>

                    <button type="submit" class="btn-login">
                        Sign in
                    </button>
                    <p id="loginError" class="error-message"></p>

                </form>

                <p class="register-link">
                    Don't have an account?
                    <a href="#" id="goRegister">Sign up</a>
                </p>

            </div>

        </section>
    `;
}

export function loginEvents() {

    const form = document.getElementById("loginForm");

    if (form) {

        form.addEventListener("submit", async (event) => {

            event.preventDefault();

            const email = document.getElementById("email").value.trim();

            const password = document.getElementById("password").value.trim();

            const response = await login(email, password);

            if (!response.success) {

                const loginError = document.getElementById("loginError");

                loginError.textContent =
                "Error in logging in. Please check your credentials and try again.";

                form.reset();

    return;
}

        });

    }

    const goRegister = document.getElementById("goRegister");

    if (goRegister) {

        goRegister.addEventListener("click", (event) => {

            event.preventDefault();

            navigate("/register");

        });

    }

}