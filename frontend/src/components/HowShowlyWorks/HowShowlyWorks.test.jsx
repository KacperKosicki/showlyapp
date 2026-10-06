import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import HowShowlyWorks from "./HowShowlyWorks";

jest.mock("react-router-dom", () => ({
  Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });

test("steps support keyboard navigation, focus and wrapping", () => {
  render(<HowShowlyWorks />);
  const tabs = screen.getAllByRole("tab");
  expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
  expect(tabs[1]).toHaveFocus();
  expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", tabs[1].id);
  expect(screen.getByRole("heading", { name: "Zobacz więcej niż samą nazwę." })).toBeInTheDocument();
  fireEvent.keyDown(tabs[1], { key: "End" });
  expect(tabs[3]).toHaveFocus();
  fireEvent.keyDown(tabs[3], { key: "ArrowRight" });
  expect(tabs[0]).toHaveFocus();
});

test("next buttons follow the journey and finish with the profile directory", () => {
  render(<HowShowlyWorks />);
  fireEvent.click(screen.getByRole("button", { name: /Dalej: poznaj/ }));
  fireEvent.click(screen.getByRole("button", { name: /Dalej: porozmawiaj/ }));
  expect(screen.getByText("Dobry kontakt to dobry początek.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Dalej: umów się/ }));
  expect(screen.getByRole("link", { name: "Odkrywaj profile" })).toHaveAttribute("href", "/profile");
  expect(screen.getByText(/Jeśli usługodawca udostępnia rezerwacje/)).toBeInTheDocument();
  expect(screen.getByText(/dane ilustracyjne/)).toBeInTheDocument();
});
