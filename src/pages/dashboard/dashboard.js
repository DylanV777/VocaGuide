import { getCareers, createCareer, deleteCareer } from "../../services/careerService.js";
import { getQuestions, createQuestion, deleteQuestion } from "../../services/questionService.js";
import { isLoggedIn, getUser } from "../../utils/storage.js";
import { navigate } from "../../router/router.js";

export function Dashboard() {

    if (!isLoggedIn()) {

        navigate("/login");

        return `<p>Redirecting to login...</p>`;

    }

    const user = getUser();

    if (!user || user.role !== "admin") {

        navigate("/");

        return `<p>No tienes acceso a esta página.</p>`;

    }

    return `
        <section class="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
            <div class="w-full max-w-4xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">

                <p class="text-sm uppercase tracking-[0.35em] text-slate-400">Administración</p>
                <h1 class="mt-2 text-3xl font-semibold text-slate-900">Panel administrador</h1>

                <div class="mt-6 inline-flex rounded-full bg-slate-100 p-1">
                    <button id="tabCareers" class="tab-btn rounded-full px-5 py-2 text-sm font-semibold bg-slate-900 text-white">
                        Carreras
                    </button>
                    <button id="tabQuestions" class="tab-btn rounded-full px-5 py-2 text-sm font-semibold text-slate-600">
                        Preguntas
                    </button>
                </div>

                <div id="dashboardContent" class="mt-8">
                    <p class="text-slate-500">Cargando...</p>
                </div>

            </div>
        </section>
    `;

}

export async function dashboardEvents() {

    if (!isLoggedIn()) {
        return;
    }

    const user = getUser();

    if (!user || user.role !== "admin") {
        return;
    }

    const tabCareers = document.getElementById("tabCareers");
    const tabQuestions = document.getElementById("tabQuestions");

    function setActiveTab(activeBtn, inactiveBtn) {

        activeBtn.classList.add("bg-slate-900", "text-white");
        activeBtn.classList.remove("text-slate-600");

        inactiveBtn.classList.remove("bg-slate-900", "text-white");
        inactiveBtn.classList.add("text-slate-600");

    }

    tabCareers.addEventListener("click", () => {

        setActiveTab(tabCareers, tabQuestions);
        renderCareersTab();

    });

    tabQuestions.addEventListener("click", () => {

        setActiveTab(tabQuestions, tabCareers);
        renderQuestionsTab();

    });

    renderCareersTab();

}

async function renderCareersTab() {

    const dashboardContent = document.getElementById("dashboardContent");

    dashboardContent.innerHTML = `<p class="text-slate-500">Cargando carreras...</p>`;

    const response = await getCareers();

    if (!response.success) {

        dashboardContent.innerHTML = `<p class="text-slate-500">No se pudieron cargar las carreras.</p>`;

        return;

    }

    const careers = response.careers || [];

    dashboardContent.innerHTML = `
        <form id="newCareerForm" class="flex gap-3">
            <input
                type="text"
                id="newCareerName"
                class="flex-1 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-3 text-slate-700"
                placeholder="Nombre de la nueva carrera"
                required
            >
            <button type="submit" class="rounded-3xl bg-sky-600 px-6 py-3 text-white font-semibold transition hover:bg-sky-700">
                Agregar
            </button>
        </form>

        <ul class="mt-6 space-y-3">
            ${careers.map(career => `
                <li class="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4" data-id="${career.id}">
                    <span class="text-slate-700">${career.name}</span>
                    <button class="delete-item-btn rounded-3xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" data-id="${career.id}">
                        Eliminar
                    </button>
                </li>
            `).join("")}
        </ul>
    `;

    document.getElementById("newCareerForm").addEventListener("submit", async (event) => {

        event.preventDefault();

        const nameInput = document.getElementById("newCareerName");

        const result = await createCareer({ name: nameInput.value.trim() });

        if (result.success) {

            renderCareersTab();

        }

    });

    document.querySelectorAll(".delete-item-btn").forEach(button => {

        button.addEventListener("click", async () => {

            const careerId = button.getAttribute("data-id");

            const result = await deleteCareer(careerId);

            if (result.success) {

                renderCareersTab();

            }

        });

    });

}

async function renderQuestionsTab() {

    const dashboardContent = document.getElementById("dashboardContent");

    dashboardContent.innerHTML = `<p class="text-slate-500">Cargando preguntas...</p>`;

    const response = await getQuestions();

    if (!response.success) {

        dashboardContent.innerHTML = `<p class="text-slate-500">No se pudieron cargar las preguntas.</p>`;

        return;

    }

    const questions = response.questions || [];

    dashboardContent.innerHTML = `
        <form id="newQuestionForm" class="flex gap-3">
            <input
                type="text"
                id="newQuestionText"
                class="flex-1 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-3 text-slate-700"
                placeholder="Texto de la nueva pregunta"
                required
            >
            <button type="submit" class="rounded-3xl bg-sky-600 px-6 py-3 text-white font-semibold transition hover:bg-sky-700">
                Agregar
            </button>
        </form>

        <ul class="mt-6 space-y-3">
            ${questions.map(question => `
                <li class="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4" data-id="${question.id}">
                    <span class="text-slate-700">${question.text}</span>
                    <button class="delete-item-btn rounded-3xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" data-id="${question.id}">
                        Eliminar
                    </button>
                </li>
            `).join("")}
        </ul>
    `;

    document.getElementById("newQuestionForm").addEventListener("submit", async (event) => {

        event.preventDefault();

        const textInput = document.getElementById("newQuestionText");

        const result = await createQuestion({ text: textInput.value.trim(), options: [] });

        if (result.success) {

            renderQuestionsTab();

        }

    });

    document.querySelectorAll(".delete-item-btn").forEach(button => {

        button.addEventListener("click", async () => {

            const questionId = button.getAttribute("data-id");

            const result = await deleteQuestion(questionId);

            if (result.success) {

                renderQuestionsTab();

            }

        });

    });

}