import { apiRequest } from "./api.js";

// GET /questions -> { success, questions: [{ id, text, options: [{id, text, profileWeights}] }] }
export async function getQuestions() {

    return apiRequest("/questions", {
        method: "GET"
    });

}

// POST /questions  (admin)
export async function createQuestion(question) {

    return apiRequest("/questions", {
        method: "POST",
        body: JSON.stringify(question)
    });

}

// PUT /questions/:id  (admin)
export async function updateQuestion(questionId, question) {

    return apiRequest(`/questions/${questionId}`, {
        method: "PUT",
        body: JSON.stringify(question)
    });

}

// DELETE /questions/:id  (admin)
export async function deleteQuestion(questionId) {

    return apiRequest(`/questions/${questionId}`, {
        method: "DELETE"
    });

}