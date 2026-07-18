import { navigate } from "../../router/router.js";
import { register } from "../../services/authService.js";
import { saveSession } from "../../utils/storage.js";

export function Register() {
    return `
        <section class="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
            <div class="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
                <div class="mb-8 text-center">
                    <p class="text-sm uppercase tracking-[0.4em] text-slate-400">Registro</p>
                    <h1 class="mt-4 text-4xl font-semibold text-slate-900">Crear cuenta</h1>
                    <p class="mt-3 text-slate-500">Crea tu cuenta para guardar tus resultados y favoritos.</p>
                </div>

                <form id="registerForm" class="space-y-4">
                    <label class="block text-slate-700 font-medium">
                        Nombre completo
                        <input id="name" type="text" required class="mt-3 w-full rounded-[12px] border border-slate-200 px-3 py-2 outline-none" placeholder="Tu nombre completo">
                    </label>

                    <label class="block text-slate-700 font-medium">
                        Correo electrónico
                        <input id="email" type="email" required class="mt-3 w-full rounded-[12px] border border-slate-200 px-3 py-2 outline-none" placeholder="ejemplo@correo.com">
                    </label>

                    <label class="block text-slate-700 font-medium">
                        Contraseña
                        <input id="password" type="password" required minlength="6" class="mt-3 w-full rounded-[12px] border border-slate-200 px-3 py-2 outline-none" placeholder="Mínimo 6 caracteres">
                    </label>

                    <label class="block text-slate-700 font-medium">
                        Confirmar contraseña
                        <input id="confirmPassword" type="password" required class="mt-3 w-full rounded-[12px] border border-slate-200 px-3 py-2 outline-none" placeholder="Repite la contraseña">
                    </label>

                    <p id="registerError" class="min-h-[1.25rem] text-sm text-red-600"></p>

                    <button id="submitRegister" type="submit" class="w-full rounded-[12px] bg-sky-600 px-4 py-2 text-white font-semibold">Crear cuenta</button>
                </form>

                <div class="mt-6 text-center text-slate-500">
                    ¿Ya tienes cuenta? <a href="#/login" id="goLogin" class="font-semibold text-sky-600">Entrar</a>
                </div>
            </div>
        </section>
    `;
}

export function registerEvents() {
    const form = document.getElementById("registerForm");

    if (!form) return;

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmInput = document.getElementById("confirmPassword");
    const errorEl = document.getElementById("registerError");
    const submitBtn = document.getElementById("submitRegister");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorEl.textContent = "";

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirm = confirmInput.value;

        if (!name) {
            errorEl.textContent = "Ingresa tu nombre completo.";
            return;
        }

        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(email)) {
            errorEl.textContent = "Ingresa un correo válido.";
            return;
        }

        if (password.length < 6) {
            errorEl.textContent = "La contraseña debe tener al menos 6 caracteres.";
            return;
        }

        if (password !== confirm) {
            errorEl.textContent = "Las contraseñas no coinciden.";
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Registrando...";

        try {
            const resp = await register(name, email, password);

            if (resp && resp.success) {
                if (resp.token && resp.user) {
                    saveSession(resp.token, resp.user);
                    navigate("/");
                    return;
                }
                navigate("/login");
                return;
            }

            errorEl.textContent = (resp && resp.message) ? resp.message : "Error en el registro.";

        } catch (err) {
            console.error(err);
            errorEl.textContent = "Error del servidor. Intenta más tarde.";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Crear cuenta";
        }
    });

    const goLogin = document.getElementById("goLogin");
    if (goLogin) {
        goLogin.addEventListener("click", (event) => {
            event.preventDefault();
            navigate("/login");
        });
    }
}
