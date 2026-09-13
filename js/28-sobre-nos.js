// Toggle Tema Dark/Light (mesmo padrão da Homepage)
const themeButton = document.querySelector("#theme-toggle");

themeButton.addEventListener("click", () =>
{
    document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === "light"
        ? "dark"
        : "light";
});
