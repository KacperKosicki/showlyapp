import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import UserDropdown from "./UserDropdown";
import axios from "axios";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/" }),
  useNavigate: () => mockNavigate,
}), { virtual: true });
jest.mock("../../firebase", () => ({ auth: { currentUser: null } }));
jest.mock("firebase/auth", () => ({ signOut: jest.fn() }));
jest.mock("axios", () => ({ get: jest.fn().mockResolvedValue({ data: [] }) }));

const originalFetch = global.fetch;
beforeEach(() => {
  mockNavigate.mockClear();
  axios.get.mockResolvedValue({ data: [] });
  global.fetch = jest.fn(async (url) => ({
    ok: !url.includes("by-user"),
    status: url.includes("by-user") ? 404 : 200,
    json: async () => ({ role: "user" }),
  }));
});
afterEach(() => { global.fetch = originalFetch; });

const renderMenu = () => render(
  <UserDropdown user={{ uid: "test-user", email: "test@example.com" }}
    loadingUser={false} unreadCount={3} pendingReservationsCount={2} />
);

test("menu focuses its actions, supports arrow keys and returns focus on Escape", async () => {
  renderMenu();
  await waitFor(() => expect(screen.getByRole("menuitem", { name: /Stwórz profil/, hidden: true })).toBeInTheDocument());
  const trigger = screen.getByRole("button", { name: "Otwórz menu użytkownika" });
  fireEvent.click(trigger);
  const menu = screen.getByRole("menu", { name: "Moje konto" });
  expect(screen.getByRole("menuitem", { name: /Stwórz profil/ })).toHaveFocus();
  fireEvent.keyDown(menu, { key: "ArrowDown" });
  expect(screen.getByRole("menuitem", { name: /Ustawienia konta/ })).toHaveFocus();
  fireEvent.keyDown(menu, { key: "End" });
  expect(screen.getByRole("menuitem", { name: /Wyloguj się/ })).toHaveFocus();
  fireEvent.keyDown(menu, { key: "Escape" });
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("notification counts remain visible and navigation closes the menu", async () => {
  renderMenu();
  await waitFor(() => expect(screen.getByRole("menuitem", { name: /Stwórz profil/, hidden: true })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Otwórz menu użytkownika" }));
  expect(screen.getByRole("menuitem", { name: /Rezerwacje 2/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("menuitem", { name: /Powiadomienia 3/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/powiadomienia", { state: { scrollToId: "scrollToId" } });
  expect(screen.getByRole("button", { name: "Otwórz menu użytkownika" })).toHaveAttribute("aria-expanded", "false");
});

test('announcements management is accessible to accounts without a provider profile', async () => {
  renderMenu();
  fireEvent.click(screen.getByRole('button', { name: 'Otwórz menu użytkownika' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Twoje ogłoszenia i zgłoszenia' }));
  expect(mockNavigate).toHaveBeenCalledWith('/twoje-ogloszenia', { state: { scrollToId: 'announcements' } });
});
