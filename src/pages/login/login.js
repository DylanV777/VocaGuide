import { login } from "../../services/authService.js";
import { navigate } from "../../router/router.js";
import { saveSession } from "../../utils/storage.js";
export function Login() {
    return `
        <section class="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
            <div class="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
                <div class="mb-8 text-center">
                    <p class="text-sm uppercase tracking-[0.4em] text-slate-400">Test vocacional</p>
                    <h1 class="mt-4 text-4xl font-semibold text-slate-900">Ingresar</h1>
                    <p class="mt-3 text-slate-500">Accede para ver tus recomendaciones de carrera.</p>
                </div>

                <form id="loginForm" class="space-y-6">
                    <label class="block text-slate-700 font-medium">
                        Correo electrónico
                        <input
                            class="mt-3 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            type="email"
                            id="email"
                            name="email"
                            placeholder="ejemplo@correo.com"
                            required
                            autocomplete="email"
                        >
                    </label>

                    <label class="block text-slate-700 font-medium">
                        Contraseña
                        <input
                            class="mt-3 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            type="password"
                            id="password"
                            name="password"
                            placeholder="********"
                            required
                            autocomplete="current-password"
                        >
                    </label>

                    <button type="submit" class="w-full rounded-[24px] bg-slate-900 px-5 py-3 text-white text-base font-semibold transition hover:bg-slate-800">
                        Entrar
                    </button>

                    <p id="loginError" class="min-h-[1.25rem] text-sm text-red-600"></p>
                </form>

                <div class="mt-8 text-center text-slate-500">
                    ¿Aún no tienes cuenta?
                    <a href="#/register" id="goRegister" class="font-semibold text-sky-600 hover:text-sky-700">Regístrate</a>
                </div>
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

            if (response.success) {

                saveSession(response.token, response.user);
                navigate("/");

                return;

            }

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