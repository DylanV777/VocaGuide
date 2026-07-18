import { getCareers } from "../../services/careerService.js";
import { compareCareers } from "../../services/resultService.js";
import { isLoggedIn } from "../../utils/storage.js";
import { navigate } from "../../router/router.js";

let careers = [];

export function Compare() {

    if (!isLoggedIn()) {

        navigate("/login");

        return `<p>Redirecting to login...</p>`;

    }

    return `
        <section class="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
            <div class="w-full max-w-4xl space-y-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">

                <div>
                    <p class="text-sm uppercase tracking-[0.35em] text-slate-400">Comparador</p>
                    <h1 class="mt-2 text-3xl font-semibold text-slate-900">Compara dos carreras</h1>
                    <p class="mt-2 text-slate-500">Elige dos carreras para ver cómo se comparan lado a lado.</p>
                </div>

                <div class="grid gap-4 sm:grid-cols-2 sm:items-center">

                    <select id="careerA" class="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-3 text-slate-700">
                        <option value="">Selecciona una carrera...</option>
                    </select>

                    <select id="careerB" class="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-3 text-slate-700">
                        <option value="">Selecciona una carrera...</option>
                    </select>

                </div>

                <button id="compareBtn" class="rounded-3xl bg-sky-600 px-6 py-3 text-white font-semibold transition hover:bg-sky-700 disabled:opacity-50" disabled>
                    Comparar
                </button>

                <p id="compareError" class="min-h-[1.25rem] text-sm text-red-600"></p>

                <div id="compareResult"></div>

            </div>
        </section>
    `;

}

export async function compareEvents() {

    if (!isLoggedIn()) {
        return;
    }

    const careerA = document.getElementById("careerA");
    const careerB = document.getElementById("careerB");
    const compareBtn = document.getElementById("compareBtn");
    const compareError = document.getElementById("compareError");
    const compareResult = document.getElementById("compareResult");

    const response = await getCareers();

    if (!response.success) {

        compareError.textContent = "No se pudo cargar el listado de carreras.";

        return;

    }

    careers = response.careers || [];

    const options = careers.map(career =>
        `<option value="${career.id}">${career.name}</option>`
    ).join("");

    careerA.innerHTML += options;
    careerB.innerHTML += options;

    function updateButtonState() {

        compareBtn.disabled = !careerA.value || !careerB.value || careerA.value === careerB.value;

    }

    careerA.addEventListener("change", updateButtonState);
    careerB.addEventListener("change", updateButtonState);

    compareBtn.addEventListener("click", async () => {

        compareError.textContent = "";
        compareBtn.disabled = true;

        const result = await compareCareers(careerA.value, careerB.value);

        compareBtn.disabled = false;

        if (!result.success) {

            compareError.textContent = result.message || "Error al comparar las carreras.";

            return;

        }

        const { careerA: dataA, careerB: dataB } = result;

        compareResult.innerHTML = `
            <div class="mt-4 overflow-hidden rounded-[28px] border border-slate-200">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-100">
                        <tr>
                            <th class="px-5 py-3 font-semibold text-slate-600"></th>
                            <th class="px-5 py-3 font-semibold text-slate-900">${dataA.name}</th>
                            <th class="px-5 py-3 font-semibold text-slate-900">${dataB.name}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white">
                        <tr>
                            <td class="px-5 py-3 font-medium text-slate-500">Duración</td>
                            <td class="px-5 py-3 text-slate-700">${dataA.duration ?? "-"}</td>
                            <td class="px-5 py-3 text-slate-700">${dataB.duration ?? "-"}</td>
                        </tr>
                        <tr>
                            <td class="px-5 py-3 font-medium text-slate-500">Habilidades</td>
                            <td class="px-5 py-3 text-slate-700">${(dataA.skills || []).join(", ") || "-"}</td>
                            <td class="px-5 py-3 text-slate-700">${(dataB.skills || []).join(", ") || "-"}</td>
                        </tr>
                        <tr>
                            <td class="px-5 py-3 font-medium text-slate-500">Áreas de trabajo</td>
                            <td class="px-5 py-3 text-slate-700">${(dataA.workAreas || []).join(", ") || "-"}</td>
                            <td class="px-5 py-3 text-slate-700">${(dataB.workAreas || []).join(", ") || "-"}</td>
                        </tr>
                        <tr>
                            <td class="px-5 py-3 font-medium text-slate-500">Modalidad</td>
                            <td class="px-5 py-3 text-slate-700">${dataA.modality ?? "-"}</td>
                            <td class="px-5 py-3 text-slate-700">${dataB.modality ?? "-"}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

    });

}