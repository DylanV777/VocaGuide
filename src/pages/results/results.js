import { getLatestResult, toggleFavorite } from "../../services/resultService.js";
import { isLoggedIn } from "../../utils/storage.js";
import { navigate } from "../../router/router.js";

export function Results() {

    if (!isLoggedIn()) {

        navigate("/login");

        return `<p>Redirecting to login...</p>`;

    }

    return `
        <section class="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
            <div id="resultsContent" class="w-full max-w-4xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
                <p class="text-slate-500">Cargando tu resultado...</p>
            </div>
        </section>
    `;
}

export async function resultsEvents() {

    if (!isLoggedIn()) {
        return;
    }

    const resultsContent = document.getElementById("resultsContent");

    const response = await getLatestResult();

    if (!response.success || !response.profile) {

        resultsContent.innerHTML = `
            <div class="text-center">
                <p class="text-slate-600 mb-6">Aún no has realizado el test vocacional.</p>
                <button id="goTest" class="rounded-3xl bg-sky-600 px-6 py-3 text-white font-semibold transition hover:bg-sky-700">Realizar test</button>
            </div>
        `;

        document.getElementById("goTest").addEventListener("click", () => {
            navigate("/test");
        });

        return;

    }

    const { profile, explanation, careers } = response;

    resultsContent.innerHTML = `
        <div class="space-y-8">
            <div class="rounded-[32px] border border-slate-200 bg-sky-50 p-8 shadow-sm">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 class="text-3xl font-semibold text-slate-900">Perfil: ${profile}</h1>
                        <p class="mt-2 text-slate-600">Basado en tus respuestas, este perfil describe tus fortalezas y opciones profesionales.</p>
                    </div>
                    <span class="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm">${careers.length} carreras recomendadas</span>
                </div>
                <p class="mt-4 text-slate-700">${explanation}</p>
            </div>

            <div>
                <h2 class="text-2xl font-semibold text-slate-900 mb-4">Carreras recomendadas</h2>
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    ${careers.map(career => `
                        <article class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm" data-career-id="${career.id}">
                            <h3 class="text-xl font-semibold text-slate-900">${career.name}</h3>
                            <p class="mt-3 text-sky-600 font-semibold">${career.affinity}% afinidad</p>
                            <div class="mt-5">
                                <button class="favorite-btn rounded-3xl bg-sky-600 px-5 py-3 text-white font-semibold transition hover:bg-sky-700" data-id="${career.id}">
                                    Guardar favorito
                                </button>
                            </div>
                        </article>
                    `).join("")}
                </div>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
                <button id="goCompare" class="rounded-3xl border border-slate-300 bg-white px-6 py-3 text-slate-700 font-semibold transition hover:bg-slate-100">
                    Comparar carreras
                </button>
                <button id="goFavorites" class="rounded-3xl border border-slate-300 bg-white px-6 py-3 text-slate-700 font-semibold transition hover:bg-slate-100">
                    Mis favoritos
                </button>
            </div>
        </div>
    `;

    document.getElementById("goCompare").addEventListener("click", () => {
        navigate("/compare");
    });

    document.getElementById("goFavorites").addEventListener("click", () => {
        navigate("/favorites");
    });

    const favoriteButtons = resultsContent.querySelectorAll(".favorite-btn");

    favoriteButtons.forEach(button => {

        button.addEventListener("click", async () => {

            button.disabled = true;

            const careerId = button.getAttribute("data-id");

            const result = await toggleFavorite(careerId);

            if (result.success) {

                button.textContent = "Saved ✓";

            } else {

                button.disabled = false;

            }

        });

    });

}