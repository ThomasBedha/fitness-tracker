import { render } from "preact";
import { App } from "./app.jsx";
import "./styles/global.css";

render(<App />, document.getElementById("root"));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
