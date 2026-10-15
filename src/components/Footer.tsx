import { identity } from "../content";

export default function Footer() {
  return (
    <footer className="footer">
      <span className="mono">{identity.name} — Portfolio</span>
      <span className="mono">{identity.location} · 2026</span>
    </footer>
  );
}
