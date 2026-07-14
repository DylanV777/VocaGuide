const API_URL = "http://localhost:8000";

export async function login(email, password) {

    try {

        const response = await fetch(`${API_URL}/login`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                password
            })

        });

        const data = await response.json();

        return data;

    } catch (error) {

        console.error(error);

        return {
            success: false,
            message: "Error de conexión con el servidor."
        };

    }

}