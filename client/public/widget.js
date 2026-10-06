(() => {
  const currentScript = document.currentScript;
  const scriptUrl = currentScript?.src || window.location.href;
  const widgetOrigin = new URL(scriptUrl, window.location.href).origin;
  const iframePath = currentScript?.dataset.path || "/widget";
  const position = "right";
  const title = currentScript?.dataset.title || "Abrir Upi";
  const iconUrl = `${widgetOrigin}/manus-storage/up-one-bot-transparent_f1fc341d.png`;

  if (document.querySelector("[data-up-one-widget]")) return;

  const host = document.createElement("div");
  host.dataset.upOneWidget = "true";
  host.setAttribute("data-up-one-widget", "true");
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .up-one-widget { position: fixed; z-index: 2147483000; right: 20px; bottom: 20px; font-family: Inter, Arial, sans-serif; }
    .up-one-button { width: 52px; height: 52px; border: 0; border-radius: 999px; background: #122b50 url("${iconUrl}") center / 82% no-repeat; color: white; box-shadow: 0 7px 20px rgba(18, 43, 80, .28); cursor: pointer; font-size: 23px; line-height: 1; transition: transform .18s ease, background-color .18s ease; }
    .up-one-button:hover { background-color: #0d1f38; transform: translateY(-2px); }
    .up-one-button:focus-visible { outline: 3px solid #19cfd1; outline-offset: 3px; }
    .up-one-button[data-open="true"] { background-image: none; background-color: #122b50; }
    .up-one-panel { position: absolute; right: 0; bottom: 60px; width: min(420px, calc(100vw - 32px)); height: min(680px, calc(100vh - 92px)); overflow: hidden; border: 1px solid #d7e2e8; border-radius: 16px; background: white; box-shadow: 0 18px 60px rgba(0, 54, 80, .22); opacity: 0; pointer-events: none; transform: translateY(10px) scale(.98); transform-origin: bottom right; transition: opacity .18s ease, transform .18s ease; }
    .up-one-panel[data-open="true"] { opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }
    .up-one-iframe { display: block; width: 100%; height: 100%; border: 0; background: white; }
    @media (max-width: 520px) { .up-one-widget { right: 12px; bottom: 12px; } .up-one-panel { right: 0; width: min(420px, calc(100vw - 24px)); height: calc(100vh - 84px); } .up-one-button { display: block; } }
    @media (prefers-reduced-motion: reduce) { .up-one-panel, .up-one-button { transition: none; } }
  `;

  const container = document.createElement("div");
  container.className = "up-one-widget";
  const panel = document.createElement("div");
  panel.className = "up-one-panel";
  panel.dataset.open = "false";
  panel.setAttribute("aria-hidden", "true");

  const iframe = document.createElement("iframe");
  iframe.className = "up-one-iframe";
  iframe.title = "Upi - Assistente do sistema acad\u00eamico";
  iframe.src = `${widgetOrigin}${iframePath}`;
  iframe.setAttribute("allow", "clipboard-read; clipboard-write");
  iframe.setAttribute("loading", "lazy");
  panel.appendChild(iframe);

  const button = document.createElement("button");
  button.className = "up-one-button";
  button.type = "button";
  button.title = title;
  button.setAttribute("aria-label", title);
  button.setAttribute("aria-expanded", "false");
  button.dataset.open = "false";
  button.textContent = "";

  const setOpen = (open) => {
    panel.dataset.open = String(open);
    panel.setAttribute("aria-hidden", String(!open));
    button.setAttribute("aria-expanded", String(open));
    button.dataset.open = String(open);
    button.textContent = open ? "\u00d7" : "";
  };

  button.addEventListener("click", () => setOpen(panel.dataset.open !== "true"));
  window.addEventListener("message", (event) => {
    if (event.source === iframe.contentWindow && event.data?.type === "up-one-close") setOpen(false);
  });

  container.append(panel, button);
  shadow.append(style, container);
  document.body.appendChild(host);
})();
