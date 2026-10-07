export default function BookingSteps({ steps, className }) {
  const current = steps.findIndex(step => !step.done);
  return (
    <ol className={className} aria-label="Etapy rezerwacji">
      {steps.map((step, index) => (
        <li
          key={step.label}
          data-state={step.done ? "complete" : current === index ? "current" : "upcoming"}
          aria-current={current === index ? "step" : undefined}
        >
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <strong>{step.label}</strong>
        </li>
      ))}
    </ol>
  );
}
