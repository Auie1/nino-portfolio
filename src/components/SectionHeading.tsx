export default function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="section-head reveal">
      <span className="mono mono--accent">{index}</span>
      <span className="section-head__rule" />
      <h2 className="section-head__title">{title}</h2>
    </div>
  );
}
