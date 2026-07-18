import { getFavorites, toggleFavorite } from "../../services/resultService.js";
import { isLoggedIn } from "../../utils/storage.js";
import { navigate } from "../../router/router.js";

export function Favorites() {

    if (!isLoggedIn()) {

        navigate("/login");

        return `<p>Redirecting to login...</p>`;

    }

    return `
        <section class="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
            <div class="w-full max-w-4xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">

                <p class="text-sm uppercase tracking-[0.35em] text-slate-400">Favoritos</p>
                <h1 class="mt-2 text-3xl font-semibold text-slate-900">Tus carreras guardadas</h1>

                <div id="favoritesList" class="mt-6">
                    <p class="text-slate-500">Cargando tus favoritos...</p>
                </div>

            </div>
        </section>
    `;

}

export async function favoritesEvents() {

    if (!isLoggedIn()) {
        return;
    }

    const favoritesList = document.getElementById("favoritesList");

    const response = await getFavorites();

    if (!response.success) {

        favoritesList.innerHTML = `<p class="text-slate-500">No se pudieron cargar tus favoritos.</p>`;

        return;

    }

    renderFavorites(response.careers || []);

    function renderFavorites(careers) {

        if (careers.length === 0) {

            favoritesList.innerHTML = `<p class="text-slate-500">Todavía no has guardado ninguna carrera.</p>`;

            return;

        }

        favoritesList.innerHTML = `
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                ${careers.map(career => `
                    <article class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm" data-career-id="${career.id}">
                        <h3 class="text-xl font-semibold text-slate-900">${career.name}</h3>
                        <button class="remove-favorite-btn mt-5 rounded-3xl border border-slate-300 bg-white px-5 py-3 text-slate-700 font-semibold transition hover:bg-slate-100" data-id="${career.id}">
                            Quitar
                        </button>
                    </article>
                `).join("")}
            </div>
        `;

        const removeButtons = favoritesList.querySelectorAll(".remove-favorite-btn");

        removeButtons.forEach(button => {

            button.addEventListener("click", async () => {

                button.disabled = true;

                const careerId = button.getAttribute("data-id");

                const result = await toggleFavorite(careerId);

                if (result.success) {

                    const updated = careers.filter(career => String(career.id) !== String(careerId));

                    renderFavorites(updated);

                } else {

                    button.disabled = false;

                }

            });

        });

    }

}