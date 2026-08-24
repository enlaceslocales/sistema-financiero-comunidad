// Comprobar si existe una sesión activa
async function verificarSesion() {

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "login.html";
        return;
    }

    console.log("Usuario autenticado:", session.user.email);
}


// Ejecutar al cargar la página
verificarSesion();


// Cerrar sesión
const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Error al cerrar sesión:", error);
            return;
        }

        window.location.href = "login.html";
    });
}