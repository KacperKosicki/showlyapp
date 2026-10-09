# Premium na czas testów

W Panelu admina → Podgląd platformy znajduje się karta „Premium dla wszystkich”. Domyślnie tryb jest wyłączony; brak dokumentu ustawień również oznacza wyłączenie. Kliknięcie „Włącz testowe Premium” zapisuje ustawienie w MongoDB. Zmianę może wykonać wyłącznie administrator sprawdzany po stronie serwera.

Po włączeniu istniejące i nowe profile korzystają z Premium, pełnych limitów i widoczności przez cały czas trwania testów. Profile wygasłe wracają do katalogu i rozmów. Blokady administracyjne pozostają aktywne. Zakupy planów i przedłużeń przez Stripe są zablokowane po stronie API. Informacja o bezpłatnym dostępie jest widoczna w tworzeniu i edycji profilu oraz w menu konta.

Tryb nie tworzy subskrypcji i nie zmienia zapisanych planów ani dat widoczności. Po wyłączeniu wracają dotychczasowe zasady, w tym wcześniej zapisane terminy wygaśnięcia. Nadmiarowych zdjęć, usług ani innych zapisanych danych system nie usuwa. Edycja po zakończeniu testów musi jednak mieścić się w limitach aktualnego planu. Zmiany są stosowane przy kolejnym żądaniu do API; już otwarty widok należy odświeżyć.

Przed zakończeniem testów poinformuj użytkowników i skonfiguruj rzeczywiste klucze Stripe, ceny oraz webhook. Samo wyłączenie testów nie przełącza Stripe na płatności rzeczywiste ani nikogo automatycznie nie obciąża. Istniejące subskrypcje Stripe nadal wymagają osobnego zarządzania — przełącznik ich nie anuluje.

Nowe zdarzenia Stripe zapisują rozróżnienie test/live. Przy włączaniu trybu z testowym kluczem Stripe starsze subskrypcje bez oznaczenia są oznaczane jako testowe. Po przejściu na klucz live nie dają płatnego planu. Przy pierwszym nowym zakupie tworzony jest klient właściwy dla live. Jeśli klucze zmieniono na live jeszcze przed oznaczeniem starych subskrypcji, należy osobno zweryfikować te historyczne rekordy — ich środowiska nie można wiarygodnie rozpoznać z samego identyfikatora.

Wdrożenie wymaga aktualizacji backendu i frontendu. Nie wymaga restartu dla kolejnych zmian przełącznika; ustawienie jest odczytywane z bazy przy żądaniach API, bez lokalnego cache. Niedostępność bazy ustawień zwraca 503, zamiast przypadkowo dopuścić zakup podczas testów.

Nad nawigacją podczas testów pojawia się limonkowy pasek z przesuwającym się komunikatem i linkiem do rejestracji (dla zalogowanych: do panelu profilu). Pasek można zamknąć na bieżącą sesję przeglądarki oraz zatrzymać jego ruch. Nowa tura testów ma nowy identyfikator, więc wcześniejsze zamknięcie jej nie ukryje. Stan jest odświeżany co minutę, po powrocie na stronę i po zmianie przełącznika w panelu admina. Przy braku potwierdzenia statusu pasek jest ukrywany. Dla osób z ograniczeniem animacji komunikat pozostaje nieruchomy.
