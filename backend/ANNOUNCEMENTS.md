# Ogłoszenia Showly

Konto wystawia ogłoszenie, profil usługodawcy wysyła zgłoszenie. Nie są wymagane nowe pakiety ani dodatkowe zmienne środowiskowe. API korzysta z obecnego MongoDB i tokenów Firebase.

## Uruchomienie

Po wdrożeniu zmian uruchom ponownie backend. Przy połączeniu z MongoDB serwer tworzy indeksy kolekcji `Announcement`, `AnnouncementPublication` i `AnnouncementApplication`. Nie usuwa istniejących indeksów ani danych. Brak dodatkowego zadania cron: katalog zawsze filtruje publikacje po `expiresAt > teraz`.

Weryfikacja bez zapisu do bazy produkcyjnej:

```sh
node --test tests/announcements.test.js tests/announcementRoutes.test.js tests/announcementConversations.test.js tests/conversationAvailability.test.js tests/requireAuth.test.js
```

Testy obejmują walidację, własność wpisu, uprawnienia do zgłoszeń i rozmów, schematy indeksów i atomową politykę publikacji z modelem testowym. Testy nie stanowią testu integracyjnego z działającą bazą MongoDB. Przed wdrożeniem produkcyjnym warto przejść cały przepływ na bazie staging: dwa konta, profil usługodawcy, publikacja, odpowiedź, rozmowa, wycofanie i ponowna publikacja.

## Zasady

- Jedno konto ma dokładnie jeden slot publikacji. Unikalny indeks `ownerUid` i atomowy upsert zabezpieczają limit także przy równoczesnych żądaniach. Samo zapisanie szkicu nie zajmuje slotu.
- Widoczność wynosi 30 × 24 godziny od publikacji. Edycja treści nie przedłuża tego czasu.
- Publikowanie nowego wpisu nie zastępuje poprzedniego bez `replace: true`. Poprzedni wpis i jego zgłoszenia pozostają w panelu. Wygasły lub ukryty wpis można opublikować ponownie.
- Ukrycie usuwa slot, zakończenie dodatkowo ustawia stan `closed`. Usunięcie ogłoszenia oznacza `deletedAt` i fizycznie usuwa wszystkie rozmowy o ID odpowiadających jego zgłoszeniom. Zwykłe zapytania do profilu pozostają niezależne. Stary link nie może odtworzyć rozmowy. Ponowienie usunięcia po częściowym błędzie jest bezpieczne.
- Rozmowy wcześniej usuniętych ogłoszeń są sprzątane podczas odczytu Powiadomień lub próby dostępu do ich ID. Wygaśnięcie, ukrycie lub zamknięcie ogłoszenia nie usuwa rozmów.
- Historia rozmowy z wygasłym, niewidocznym, zablokowanym lub usuniętym profilem pozostaje w bazie. Powiadomienia pokazują przyczynę niedostępności bez linku do rozmowy. Po odnowieniu lub przywróceniu profilu ten sam wątek odblokowuje się. Dostęp i wysyłanie są też weryfikowane na serwerze.
- Stan konta sprawdzany jest w MongoDB i Firebase Auth (brak konta lub `disabled`). Autoryzacja odrzuca także unieważnione tokeny. Błąd usługi Firebase oznacza chwilową niedostępność, a nie usunięcie konta. Wiadomości systemowe są niezależne od profilu usługodawcy. Niedostępne wątki nie zwiększają licznika nieprzeczytanych wiadomości; po przywróceniu dostępności zachowane nieprzeczytane wiadomości wracają do licznika.
- Własne ogłoszenia i zgłoszenia dostępne są po autoryzacji. Autor widzi otrzymane zgłoszenia, usługodawca tylko swoje wysłane. Publiczne DTO nie zawiera UID właściciela ani jego e-maila.
- Zgłoszenia wymagają istniejącego profilu należącego do zalogowanej osoby. Nie można zgłosić się do własnego, ukrytego ani wygasłego ogłoszenia. Każde konto ma najwyżej jedno zgłoszenie do danego wpisu; wycofane można ponowić.
- Zgłoszenie tworzy osobny wątek `profile_to_account`, widoczny w istniejących Notifications. ID wątku jest deterministycznie związane ze zgłoszeniem, aby powtórzone żądania nie tworzyły kilku rozmów.
- Budżet w PLN: kwota, przedział lub do ustalenia. Termin: dzień, przedział dat lub elastyczny. Współpraca: lokalna, zdalna lub mieszana; jednorazowa, projektowa albo stała.
- Konto może przechowywać do 50 nieusuniętych ogłoszeń (szkice i archiwum). To ograniczenie nie zmienia limitu jednej aktywnej publikacji.

## Endpointy

Publiczne: `GET /api/announcements` (q, location, category, workMode, dateFrom, budgetMin, budgetMax, page, limit), `GET /api/announcements/:id` (opcjonalny token dla informacji o własnym zgłoszeniu).

Autoryzowane: `GET /mine`, `POST /`, `PATCH /:id`, `DELETE /:id`, `POST /:id/publish`, `POST /:id/pause`, `POST /:id/close`, `GET /:id/applications`, `POST /:id/applications`, `PATCH /:id/applications/:applicationId`, `POST /:id/applications/:applicationId/conversation` — wszystkie pod prefiksem `/api/announcements`.

Frontend: `/ogloszenia`, `/ogloszenia/:id`, `/twoje-ogloszenia`. `?nowe=1` otwiera formularz, `?zakladka=zgloszenia` pokazuje wysłane zgłoszenia. Sekcja pod AboutApp prezentuje trzy jednoznacznie oznaczone przykłady w formie pochylonych kartek. Kliknięcie karty lub przycisku wyboru przenosi pomysł na pierwszy plan. Na komputerze kompozycja reaguje na kursor; efekty respektują `prefers-reduced-motion`. Aktualne wpisy są dostępne w katalogu ogłoszeń.
