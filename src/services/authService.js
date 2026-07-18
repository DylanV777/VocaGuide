import { apiRequest } from "./api.js";

export async function login(email, password) {
    if (!email || !password) {
        return {
            success: false,
            message: "Email and password are required."
        };
    }

    return await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
}

export async function register(name, email, password) {
    if (!name || !email || !password) {
        return {
            success: false,
            message: "Name, email and password are required."
        };
    }

    return await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
    });
}
