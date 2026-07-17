import "./register.css";
import { register } from "../../services/authService.js";
import { navigate } from "../../utils/navegations.js";

export function Register() {
    return `
        <section class="login-container">

            <div class="login-card">

                <h1>create account</h1>

                <p>Sign up to start using Careerpath</p>

                <form id="registerForm">

                    <div class="form-group">
                        <label for="name">Full name</label>

                        <input
                            class="form-input"
                            type="text"
                            id="name"
                            name="name"
                            placeholder="Your name"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="email">Email</label>

                        <input
                            class="form-input"
                            type="email"
                            id="email"
                            name="email"
                            placeholder="ejemplo@correo.com"
                            required
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
                        >
                    </div>

                    <div class="form-group">
                        <label for="confirmPassword">
                            Confirm password
                        </label>

                        <input
                            class="form-input"
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            placeholder="********"
                            required
                        >
                        <p id="passwordError" class="error-message"></p>
                    </div>

                    <button class="btn-login" type="submit">
                        Create account
                    </button>

                </form>

                <p class="register-link">
                    Already have an account?
                    <a href="#" id="goLogin">Sign in</a>
                </p>

            </div>

        </section>
    `;
}

export function registerEvents() {

    const form = document.getElementById("registerForm");

    if (form) {

        form.addEventListener("submit", async (event) => {

            event.preventDefault();

            const name = document.getElementById("name").value.trim();

            const email = document.getElementById("email").value.trim();

            const password = document.getElementById("password").value.trim();

            const confirmPassword = document.getElementById("confirmPassword").value.trim();

            const passwordError = document.getElementById("passwordError");

                passwordError.textContent = "";

                if (password !== confirmPassword) {

                    passwordError.textContent = "The passwords don't match.";

                    return;

                }
            

            const user = {

                name,
                email,
                password

            };

            const response = await register(user);

                if (response.success) {

                    form.reset();

                }
                else {

                    passwordError.textContent = response.message;}

            console.log(response);
        });

    }

    const goLogin = document.getElementById("goLogin");

        if (goLogin) {

            goLogin.addEventListener("click", (event) => {

                event.preventDefault();

                navigate("/login");

            });

        }

}