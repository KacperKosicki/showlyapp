import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Regulations from "./Regulations";
import { buildRegulationsText, regulationsMeta } from "./regulationsContent";

jest.mock("react-router-dom", () => ({
  useLocation: () => ({ state: null, pathname: "/regulamin" }),
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });

test("every table-of-contents link has a visible document target and choosing a chapter closes the mobile menu", () => {
  render(<Regulations />);
  const navigation = screen.getByRole("navigation", { name: "Spis treści regulaminu" });
  const toggle = within(navigation).getByRole("button", { name: /Spis treści/ });
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  within(navigation).getAllByRole("link").forEach(link => {
    const target = document.getElementById(link.getAttribute("href").slice(1));
    expect(target).toBeInTheDocument();
    expect(within(target).getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
  fireEvent.click(within(navigation).getByRole("link", { name: /Opinie i oceny/ }));
  expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("the downloadable version preserves the draft warning, beta terms and withdrawal template", () => {
  const text = buildRegulationsText();
  expect(text).toContain("Kacper Kosicki");
  expect(text).toContain("Operator nie pobiera opłat");
  expect(text).toContain("nie sprawdza, czy autor opinii rzeczywiście kupił usługę");
  expect(text).toContain("PROJEKT: brak opublikowanego adresu");
  expect(text).toContain("DOBROWOLNY WZÓR ODSTĄPIENIA");
  expect(regulationsMeta.effectiveFrom).toBeNull();
  expect(regulationsMeta.address).toBeNull();
});

test("download creates a local versioned document and releases its URL", () => {
  jest.useFakeTimers();
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => "blob:regulations");
  URL.revokeObjectURL = jest.fn();
  let downloadedName;
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { downloadedName = this.download; });
  try {
    render(<Regulations />);
    fireEvent.click(screen.getByRole("button", { name: "Pobierz regulamin" }));
    expect(downloadedName).toBe(`showly-regulamin-${regulationsMeta.version}.txt`);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    jest.runOnlyPendingTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:regulations");
  } finally {
    click.mockRestore();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    jest.useRealTimers();
  }
});
