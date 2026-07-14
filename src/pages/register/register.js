import "./register.css";

export function Register() {
    return `
        <section class="login-container">

            <div class="login-card">

                <h1>create account</h1>

                <p>Sign up to start using Careerpath</p>

                <form id="registerForm">

                    <div class="form-group">
                        <label for="name">Full name</label>

                        <input
                            class="form-input"
                            type="text"
                            id="name"
                            name="name"
                            placeholder="Your name"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="email">Email</label>

                        <input
                            class="form-input"
                            type="email"
                            id="email"
                            name="email"
                            placeholder="ejemplo@correo.com"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="password">Password</label>

                        <input
                            class="form-input"
                            type="password"
                            id="password"
                            name="password"
                            placeholder="********"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="confirmPassword">
                            Confirm password
                        </label>

                        <input
                            class="form-input"
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            placeholder="********"
                            required
                        >
                    </div>

                    <button class="btn-login" type="submit">
                        Create account
                    </button>

                </form>

                <p class="register-link">
                    Already have an account?
                    <a href="#" id="goLogin">Sign in</a>
                </p>

            </div>

        </section>
    `;
}

export function registerEvents() {

    const form = document.getElementById("registerForm");

    if (form) {

    form.addEventListener("submit",(event)=>{

        event.preventDefault();

        console.log("Registro enviado");

    });

    }

    const goLogin = document.getElementById("goLogin");

    if(goLogin){

        goLogin.addEventListener("click",(event)=>{

            event.preventDefault();

            history.pushState({}, "", "/login");

            window.dispatchEvent(new PopStateEvent("popstate"));

    });

}

}