import "./home.css";

export function Home() {
    return `
        <main class="home">

            <section class="hero">

                <div class="hero-content">

                    <h1>your ideal career</h1>

                    <p>
                        Take an intelligent career aptitude test and receive
                        personalized recommendations based on your interests,
                        skills, and goals.
                    </p>

                    <div class="hero-buttons">

                        <button id="startTest" class="btn-primary">
                            Take Test
                        </button>

                        <button id="goLogin" class="btn-secondary">
                            Log In
                        </button>

                    </div>

                </div>

                <div class="hero-image">

                    <img
                        src="https://imagenes2.eltiempo.com/files/image_1200_535/files/fp/uploads/2026/04/21/69e7dbc5c67d8.r_d.84-240.png"
                        alt="Estudiantes universitarios"
                    >

                </div>

            </section>

            <section class="features">

                <h2>Why choose CareerPath?</h2>

                    <p class="features-description">
                        Our platform helps you make a better decision about your academic future
                        through a simple and personalized process.
                    </p>

                <div class="features-grid">

                    <article class="feature-card">

                <div class="feature-icon"></div>

                <h3>Vocational Test</h3>

                    <p>
                        Respond to a questionnaire designed to know your interests and skills.
                    </p>

                    </article>

                    <article class="feature-card">

                <div class="feature-icon"></div>

                <h3>Recommendations</h3>

                    <p>
                        Get personalized career recommendations based on your responses and profile.
                    </p>

                    </article>

                    <article class="feature-card">

                <div class="feature-icon"></div>

                <h3>Clear Results</h3>

                    <p>
                        Visualize your results in a simple way and compare them easily.
                    </p>

                    </article>

                </div>

            </section>
            <section class="steps">

                <h2>¿How it works?</h2>

                <div class="steps-container">

                    <article class="step">

                        <span class="step-number">1</span>

                        <h3>Register</h3>

                        <p>
                            Create an account to save your progress and access all features.
                        </p>

                    </article>

                    <article class="step">

                        <span class="step-number">2</span>

                        <h3>Take the Test</h3>

                        <p>
                            Respond to the questions in the vocational test honestly and without time limit.
                        </p>

                    </article>

                    <article class="step">

                        <span class="step-number">3</span>

                        <h3>Get Your Results</h3>

                        <p>
                            Discover the careers that best adapt to your profile and analyze your results.
                        </p>

                    </article>

                </div>

            </section>
            
            <section class="cta">

                <div class="cta-content">

                    <h2>Start discovering your professional future today.</h2>  

                    <p>
                        Thousands of students are unsure about which career path to choose.
                        Take the first step and discover the options that best suit you.
                    </p>

                    <div class="cta-buttons">

                        <button id="ctaRegister" class="btn-primary">
                            Create an Account
                        </button>

                        <button id="ctaTest" class="btn-secondary">
                            Learn More About the Test
                        </button>

                    </div>

                </div>

            </section>

        </main>
    `;
}

export function homeEvents() {

    const loginBtn = document.getElementById("goLogin");

    if(loginBtn){

        loginBtn.addEventListener("click", ()=>{

            history.pushState({}, "", "/login");

            window.dispatchEvent(new PopStateEvent("popstate"));

        });

    }

    const registerBtn = document.getElementById("ctaRegister");

    if(registerBtn){

        registerBtn.addEventListener("click", ()=>{

            history.pushState({}, "", "/register");

            window.dispatchEvent(new PopStateEvent("popstate"));

        });

    }

    const testBtn = document.getElementById("startTest");

    if(testBtn){

        testBtn.addEventListener("click", ()=>{

            history.pushState({}, "", "/login");

            window.dispatchEvent(new PopStateEvent("popstate"));

        });

    }

}