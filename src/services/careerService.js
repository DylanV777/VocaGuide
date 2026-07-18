import { apiRequest } from "./api.js";

// GET /careers -> { success, careers: [{ id, name, duration, skills, workAreas, modality }] }
export async function getCareers() {

    return apiRequest("/careers", {
        method: "GET"
    });

}

// GET /careers/:id
export async function getCareerDetail(careerId) {

    return apiRequest(`/careers/${careerId}`, {
        method: "GET"
    });

}

// POST /careers  (admin)
export async function createCareer(career) {

    return apiRequest("/careers", {
        method: "POST",
        body: JSON.stringify(career)
    });

}

// PUT /careers/:id  (admin)
export async function updateCareer(careerId, career) {

    return apiRequest(`/careers/${careerId}`, {
        method: "PUT",
        body: JSON.stringify(career)
    });

}

// DELETE /careers/:id  (admin)
export async function deleteCareer(careerId) {

    return apiRequest(`/careers/${careerId}`, {
        method: "DELETE"
    });

}