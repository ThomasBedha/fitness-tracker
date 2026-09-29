import { IconHome, IconDumbbell, IconChart, IconFood, IconUser } from "./icons.jsx";

const TABS = [
  { id: "home", label: "Home", Icon: IconHome },
  { id: "workout", label: "Workout", Icon: IconDumbbell },
  { id: "progress", label: "Progress", Icon: IconChart },
  { id: "nutrition", label: "Nutrisi", Icon: IconFood },
  { id: "profile", label: "Profil", Icon: IconUser },
];

export function BottomNav({ active, onNav }) {
  return (
    <nav class="tabbar">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} class={`tab-btn ${active === id ? "active" : ""}`} onClick={() => onNav(id)} aria-label={label}>
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
