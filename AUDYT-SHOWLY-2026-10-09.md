# Showly — audyt funkcji i gotowości regulaminu beta

Stan analizy: 9 października 2026 r. Zakres: przegląd kodu frontend/backend, przepływów konta, profili, rozliczeń, ogłoszeń, wiadomości, rezerwacji, opinii, moderacji oraz dokumentów. To audyt statyczny i kontrola widoku dokumentu; nie jest testem penetracyjnym, certyfikacją RODO ani opinią adwokata. Nie badano bazy produkcyjnej, umów z dostawcami, logów, konfiguracji infrastruktury, regionalizacji danych ani ustawień panelu Stripe.

## Dane potwierdzone przez właściciela

- Operator: Kacper Kosicki, osoba fizyczna, bez zarejestrowanej firmy. Nie wpisano fikcyjnego NIP/REGON/KRS.
- Obecny model: bezpłatna wersja testowa beta. Brak pobierania opłat został zadeklarowany przez właściciela; sam kod zawiera gotowe ścieżki Stripe i nie potwierdza wyłączenia sprzedaży.
- Minimalny wiek konta: proponowane i potwierdzone 16 lat. Dla 16–17 lat uwzględniono ograniczoną zdolność do czynności prawnych i wymagane zgody przedstawiciela ustawowego. Wiek 16 lat nie oznacza pełnoletności.
- Kontakt: kontakt@showly.me, już stosowany w aplikacji.
- Operator wyraźnie odmówił publikacji adresu i telefonu. Nie dodano ich ani nie zastąpiono fikcyjnymi danymi. Brak adresu pozostaje przeszkodą dla uznania dokumentu za kompletną informację o usługodawcy.
- Nie ustalono daty wejścia w życie. Dokument ma oznaczenie „Projekt do zatwierdzenia”, a nie fikcyjną aktualizację skuteczną wobec istniejących kont.

## Wynik

Przygotowano rozbudowany, wersjonowany regulamin beta w komponencie Regulations, spis treści, pobieranie TXT, wydruk/PDF, wzór odstąpienia i linki do przepisów. Treść opisuje sprawdzone funkcje i ujawnia ważne ograniczenia. Nie można uczciwie oznaczyć całej aplikacji jako prawnie gotowej do publicznego działania: brakuje danych i procedur, a kod wymaga zmian wskazanych niżej. Sam nowy regulamin nie naprawia API, consentu, likwidacji konta ani organizacji pracy Operatora.

## Mapa funkcji → treść regulaminu

| Obszar | Ustalenie z kodu | Ujęcie w dokumencie |
| --- | --- | --- |
| Konta | Firebase e-mail/hasło i Google, synchronizacja MongoDB; potwierdzenie e-mail | § 5: konto, wiek, bezpieczeństwo, konieczność skutecznej akceptacji |
| Profile | Jedna wizytówka na konto; nowy profil otrzymuje 30 dni widoczności | § 6: publiczna prezentacja, utrata widoczności, brak automatycznego usunięcia |
| Plany | Starter/Standard/Premium, funkcje i limity w backend/config/plans.js | § 3: beta bez opłat; poziomy funkcji nie tworzą zobowiązania do zapłaty |
| Rozliczenia | Stripe checkout payment i subscription, portal, webhook, odzyskiwanie statusu | § 3: przyszłe opłaty wymagają odrębnego zamówienia; obecna beta nie jest regulaminem sprzedaży |
| Ogłoszenia | 1 aktywna publikacja, 30 × 24 h, do 50 wpisów, odpowiedź wymaga profilu, 1 zgłoszenie na konto | § 7: limity, wycofanie, zastąpienie, budżet, brak automatycznej umowy |
| Usuwanie ogłoszeń | DELETE oznacza wpis i usuwa powiązane rozmowy; zamknięcie/ukrycie ich nie usuwa | § 7: rzeczywiste skutki i potrzeba zachowania ustaleń |
| Wiadomości | Rozmowy profil–konto i komunikaty systemowe; kontrola dostępności; treść w MongoDB | § 8: ograniczenia kontaktu, bezpieczeństwo, brak deklaracji end-to-end |
| Rezerwacje | Godziny/cały dzień, przyjmowanie ręczne/automatyczne, oczekujące i wygasające, offline, pracownicy | § 9: status terminu, możliwe skutki umowne, obowiązki usługodawcy i role danych |
| Opinie | 1–5, komentarz 10–200 znaków; logowanie, zakaz własnej oceny i drugiej opinii; brak potwierdzenia zakupu | § 10: jawny brak weryfikacji transakcji |
| Rankingi | Ocena → liczba opinii → odwiedziny; promowanie przez priorytet/plan/partnerstwo | § 11: główne parametry, związki Operatora, brak gwarancji kwalifikacji |
| Zgłoszenia | Formularz profili/opinii wymaga konta; e-mail i Contact dostępne bez konta | § 13: zgłoszenia mailowe także ogłoszeń, uzasadnienia, proporcjonalność, odwołanie |
| Dane i cookies | Firebase, Google, Cloudinary, MongoDB, poczta; consent zapisuje tylko wybór | § 14: prawa, podstawowe kategorie, potrzeba pełnej informacji o prywatności |
| Zakończenie | Brak pełnej ścieżki własnego usunięcia konta; admin usuwa wyłącznie Mongo User | § 16: mailowe żądanie, brak obietnicy nieistniejącego przycisku, P2B warunkowo |

## Ustalenia wymagające działania

### P0 — przed publicznym uruchomieniem

1. **Publiczne API profili zwraca zbyt szeroki obiekt.** W [profiles.js](C:/Projekty/showlyapp/backend/routes/profiles.js) GET katalogu, by-user i slug rozpowszechniają `...profile` i dokładają `billingPublic`; oryginalny `billing` pozostaje w odpowiedzi. Schemat billing zawiera identyfikatory Stripe i status rozliczeń. `by-user` nie stosuje takiego samego sprawdzenia widoczności jak slug. Należy wprowadzić listę jawnie dozwolonych pól publicznych, oddzielić odpowiedź właściciela oraz sprawdzić wszystkie endpointy katalogu, wyszukiwania i profilu. Nie stwierdzono ujawnienia numerów kart ani prywatnych wiadomości tą konkretną drogą; nie należy nadinterpretować tego ustalenia. Weryfikacja: testy negatywne DTO z kontem bez tokena i bez ujawniania prawdziwych rekordów.

2. **Nadawanie planu/partnerstwa nie jest wszędzie oddzielone od edycji właściciela.** POST tworzenia w [profiles.js](C:/Projekty/showlyapp/backend/routes/profiles.js) używa szerokiego `safeBody`; PATCH aktualizacji dopuszcza `partnership` i nie ma w tym bloku odrębnej kontroli roli moderatora. Użytkownik może próbować przekazać pola planu, partnerstwa lub priorytetu nieprzeznaczone dla niego. To ryzyko manipulacji rankingiem i uprawnieniami, wynikające ze statycznej analizy; nie wykonywano ataku. Wymagane: jawna lista pól tworzenia, odmowa pól administracyjnych i planu dla właściciela, niezależne endpointy admina, testy odmowy. Opis reguły w regulaminie nie zabezpiecza jej technicznie.

3. **Brak kompletnej informacji RODO i retencji.** Nie znaleziono odrębnej polityki prywatności ani pełnej informacji przed rejestracją. CookiesPolicy nie spełnia tego celu. Potrzebne: kompletna tożsamość/adres administratora, cele i właściwe podstawy prawne, odbiorcy, regiony i transfery/SCC, okresy lub precyzyjne kryteria retencji, prawa i rzeczywista procedura ich realizacji, informacja o profilowaniu/automatycznych decyzjach adekwatna do działania, umowy z dostawcami, ocena ról wobec usługodawców. Nie wpisano niepotwierdzonych regionów, gwarancji „wyłącznie UE”, terminów kasowania kopii ani zgód marketingowych.

### P1 — przed uznaniem regulaminu za obowiązujący

4. **Dane usługodawcy są niekompletne.** Art. 5 i 8 ustawy o świadczeniu usług drogą elektroniczną wymagają odpowiedniej informacji o usługodawcy i warunkach usług. Samo imię i e-mail nie zastępują wymaganego adresu. Publiczny adres należy ustalić zgodnie z prawem i decyzją Operatora; brak zgody na jego publikację pozostawiono jako brak, nie jako zwolnienie. Przy przyszłym zawieraniu umów z konsumentami dochodzą obowiązki informacyjne właściwe dla modelu, w tym dane kontaktowe. Nie publikować niezaakceptowanych danych osobistych.

5. **Brak skutecznej, wersjonowanej akceptacji.** [Register.jsx](C:/Projekty/showlyapp/frontend/src/components/Register/Register.jsx), [Login.jsx](C:/Projekty/showlyapp/frontend/src/components/Login/Login.jsx), [User.js](C:/Projekty/showlyapp/backend/models/User.js) i synchronizacja użytkownika nie zawierają mechanizmu przyjęcia obowiązującej wersji regulaminu i nowych zasad wieku. Należy udostępnić dokument przed utworzeniem konta zarówno dla e-mail, jak i Google, zapisać wersję i czas przyjęcia na serwerze, rozdzielić opcjonalne zgody i przygotować informowanie obecnych kont na trwałym nośniku. Nie stosować retroaktywnej daty z czerwca 2026. Sprawdzenie linku do regulaminu nie jest dowodem akceptacji.

6. **Wiek 16+ nie jest wdrożony w przepływie konta.** Nie znaleziono deklaracji wieku/odpowiedniej obsługi przedstawiciela ustawowego w rejestracji. Potrzebna proporcjonalna procedura, także dla Google i istniejących kont. Nie należy zbierać skanów dowodów „na wszelki wypadek”. Zgoda na przetwarzanie danych na podstawie art. 8 RODO, zdolność do czynności prawnych i zgoda na konkretne zobowiązanie to różne zagadnienia.

7. **Bezpłatna beta jest sprzeczna z dostępną ścieżką sprzedaży.** [billing.js](C:/Projekty/showlyapp/backend/routes/billing.js) tworzy sesje Stripe dla subskrypcji i przedłużeń, a [BillingSection.jsx](C:/Projekty/showlyapp/frontend/src/components/YourProfile/sections/BillingSection.jsx) prezentuje ceny 14,99 / 29,99 / 59,99 zł i przyciski wyboru. Audyt nie potwierdza, czy produkcyjne klucze i ceny są aktywne. Przed publikacją beta należy zablokować sprzedaż nowych usług po stronie serwera i jasno zmienić komunikaty UI na beta; pozostawić dostęp do anulowania wcześniej istniejących subskrypcji, jeśli takie są. Nie wystarcza ukrycie przycisku. Nie tworzono checkoutu i nie wykonano płatności podczas audytu. Zakup wymaga osobnej informacji, zamówienia z obowiązkiem zapłaty, potwierdzenia na trwałym nośniku i właściwej obsługi praw konsumenta. „Natychmiastowy dostęp” nie oznacza automatycznej utraty prawa odstąpienia.

8. **Likwidacja konta jest niepełna.** [AccountSettings.jsx](C:/Projekty/showlyapp/frontend/src/components/AccountSettings/AccountSettings.jsx) usuwa awatar, nie całe konto. [admin.js](C:/Projekty/showlyapp/backend/routes/admin.js) usuwa Mongo User bez pełnego sprzątania Firebase/profilu/mediów/wiadomości/rezerwacji/zgłoszeń/tokenów. Żądania mailowe wymagają realnego procesu obejmującego powiązane usługi, chroniącego prawa pozostałych uczestników i dowody sporów. Ustalić retencję, możliwość udostępnienia treści oraz sposób potwierdzenia wykonania; nie deklarować natychmiastowego fizycznego usunięcia wszystkiego. Nie usuwano żadnych danych w audycie.

9. **Moderacja wymaga procesu zgodnego z rzeczywistymi obowiązkami.** [reports.js](C:/Projekty/showlyapp/backend/routes/reports.js) obsługuje wyłącznie profile/opinie i wymaga logowania. [admin.js](C:/Projekty/showlyapp/backend/routes/admin.js) ma częściowe komunikaty systemowe, ale nie pełny rejestr uzasadnień i odwołań. Udostępnić skuteczny kanał dla osób bez konta, także dla ogłoszeń; określić dane zgłoszenia, potwierdzenia, decyzje/uzasadnienia, odwołania, osobę obsługującą, punkt kontaktowy DSA dla organów i odbiorców. E-mail może być kanałem, lecz musi być rzeczywiście obsługiwany. Ocenić kwalifikację usługi hostingu/platformy i zastosowanie DSA. Zwolnienia mikro/małych przedsiębiorców z części obowiązków platform nie znoszą automatycznie podstawowych obowiązków hostingu. Dobrowolne procedury z projektu wymagają wdrożenia przed jego akceptacją.

10. **Potencjalne P2B i marketplace.** Publiczne oferty profesjonalistów i umożliwianie kontaktu/rezerwacji przemawiają za potrzebą oceny P2B — finalizacja współpracy poza stroną nie wyklucza go automatycznie. Prywatny operator i beta nie rozstrzygają kwalifikacji. Oceniono i opisano warunkowo: uzasadnienia ograniczeń, terminy zakończenia, zmiany regulaminu, parametry rankingu, dostęp do danych i brak wyłączności. Ustalić faktyczny rozmiar/operatora i wyjątki od obowiązków systemu skarg/mediatorów. Jeżeli model spełnia definicję platformy handlowej lub umożliwia zawieranie umów na odległość, ustalić dodatkowe obowiązki identyfikacji profesjonalistów i informowania przed rezerwacją. Sam opcjonalny NIP i boolean `hasBusiness` nie są wystarczającą weryfikacją.

11. **Dane pracowników i klientów offline — role/powierzenie.** Rezerwacje offline i pracownicy wprowadzają dane osób niekorzystających z konta. Ustalić, w jakich operacjach Operator jest administratorem, a w jakich podmiotem przetwarzającym na rzecz usługodawcy. Jeżeli występuje powierzenie, przygotować warunki z art. 28 RODO: zakres, bezpieczeństwo, podwykonawcy, wsparcie praw, naruszenia, zwrot/usunięcie danych. Sam obowiązek „mieć zgodę” nie jest właściwą uniwersalną podstawą, a regulamin nie zastępuje umowy powierzenia.

### P2 — przejrzystość i bezpieczna obsługa

12. **Opinie: informacja ma być także przy ocenach.** Kod ogranicza duplikaty/własne oceny, ale nie wiąże recenzji z wykonaną usługą. Regulamin ujawnia brak weryfikacji zakupów. Ten sam komunikat trzeba pokazać przy opiniach i formularzu oceny, a nie tylko głęboko w regulaminie. Nie opisywać opinii jako „zweryfikowane”.

13. **Partnerzy, promowanie i ranking.** Parametry opisano na podstawie komponentów PromotedPartners, UserCardList, AllUsersList i wyszukiwania serwerowego. Różnią się one między widokami. Oznaczenia partnera i „verified” potrzebują jasnego znaczenia przy karcie; priorytet administracyjny lub własny profil nie może sugerować niezależnego audytu kwalifikacji. Po wprowadzeniu odpłatnych promocji ujawnić wpływ wynagrodzenia i reklamowy charakter przy prezentacji. Najpierw naprawić P0/2.

14. **Cookies: zapis wyboru nie kontroluje integracji.** [CookieBanner.jsx](C:/Projekty/showlyapp/frontend/src/components/CookieBanner/CookieBanner.jsx) zapisuje accepted/rejected i datę, nie blokuje SDK. Nie znaleziono aktywnego `getAnalytics`/`gtag`/piksela w badanym frontendzie; samo `measurementId` w konfiguracji Firebase nie dowodzi uruchomienia Analytics. Zweryfikować sieć/hosting i tagi produkcyjne, wdrożyć osobne sterowanie narzędziami opcjonalnymi, prostą zmianę wyboru i konkretny wykaz magazynowanych danych/cookies. Zweryfikować także Firebase persistence i push.

15. **Kontakt i zabezpieczenia techniczne.** [contactRoutes.js](C:/Projekty/showlyapp/backend/routes/contactRoutes.js) interpoluje dane użytkownika do HTML e-maila; sprawdza obecność, ale nie pełne limity/sanitację. [server.js](C:/Projekty/showlyapp/backend/server.js) ma ogólne CORS i zaufanie proxy. W kodzie aplikacji nie znaleziono skonfigurowanego rate limitera; infrastruktura może go dostarczać, czego nie badano. Sprawdzić escaping HTML, limity, antyspam, ograniczenia żądań, nagłówki, poprawną konfigurację proxy i politykę dostępu. Nie traktować tych uwag jako wykonanego pentestu ani dowodu obejścia uwierzytelniania.

16. **Rezerwacje i strefa czasowa.** Backend zawiera przeliczanie `date + time` na UTC na sztywno oraz parametry wygaśnięcia. Przed obsługą rzeczywistych wizyt sprawdzić Europe/Warsaw, zmianę czasu, terminy całodniowe, równoległe zgłoszenia i statusy. Błąd godzin nie zostaje naprawiony zapisem regulaminu.

17. **Usunięcie ogłoszenia wpływa na cudzą historię.** Funkcja fizycznie usuwa wątki powiązane ze zgłoszeniami. Regulamin to ujawnia; należy nadal ocenić retencję, dowody ustaleń, możliwość eksportu i potrzeby drugiej strony. Potwierdzenie usunięcia powinno wprost mówić o rozmowach. Nie obiecywać odzyskania danych, którego implementacja nie zapewnia.

## Co zmieniono w tym zadaniu

- Regulations: nowy widok z limonką/fioletowym akcentem, poświatą, obrysowanym napisem; desktop i mobile, dwa motywy, respektowanie ograniczenia animacji.
- Treść: 17 rozdziałów dopasowanych do bezpłatnej beta, z rozróżnieniem usług Showly i usług użytkowników; brak ogólnych klauzul „za nic nie odpowiadamy”.
- Status: projekt, brak adresu i daty wejścia w życie ujawniony w UI i pobieranym dokumencie; brak fikcyjnej firmy.
- Pobieranie TXT lokalnie, wydruk/PDF, wzór odstąpienia, źródła, odnośniki do Contact i CookiesPolicy.
- Samodzielna kopia dokumentu: [REGULAMIN-SHOWLY-BETA-2026-10-09.txt](C:/Projekty/showlyapp/REGULAMIN-SHOWLY-BETA-2026-10-09.txt), wygenerowana z tej samej treści co strona.
- Nie zmieniano checkoutów, rejestracji ani danych produkcyjnych. Punkty audytu pozostają zadaniami do wdrożenia i nie są przedstawiane jako naprawione przez regulamin.

## Weryfikacja wykonanej zmiany

- Produkcyjne budowanie frontend: zakończone powodzeniem.
- 3 testy Regulations: spis treści/cele nawigacji i zamykanie menu, zachowanie statusu projektu w eksporcie, pobranie wersjonowanego dokumentu i zwolnienie lokalnego URL.
- Przeglądarka: desktop oraz szerokości 390 i 320 px, oba motywy. Bez przewijania poziomego. Nawigacja rozdziałów pozostawia około 100 px od góry; spis desktopowy pozostaje pod nawigacją, a mobilny rozwija się na żądanie.
- Nie wysyłano wiadomości, nie tworzono kont, nie kupowano planów ani nie zmieniano danych w bazie. Kontrola techniczna dokumentu nie potwierdza zgodności prawnej całego Serwisu.

## Kolejność przed publikacją

1. Naprawić publiczne DTO i oddzielić pola administracyjne od edycji właściciela.
2. Ustalić legalnie kompletne dane usługodawcy i rzeczywisty model/kwalifikację prawną; przygotować prywatność, retencję i ewentualne powierzenie.
3. Wyłączyć nową sprzedaż beta w backendzie i skorygować komunikaty cennika; skontrolować istniejące sesje/subskrypcje bez naruszania praw użytkowników.
4. Wdrożyć akceptację regulaminu, zasady 16+ i przedstawiciela ustawowego, procedury reklamacji/usuwania/zgłoszeń/odwołań oraz dowody ich wykonywania.
5. Zweryfikować cookies i przepływy danych w faktycznym środowisku, umowy i zabezpieczenia z dostawcami.
6. Przekazać regulamin i wynik audytu prawnikowi do weryfikacji modelu. Ustalić datę, wersję i sposób poinformowania dotychczasowych użytkowników; dopiero potem oznaczyć dokument jako obowiązujący. Odbiór wizualny nie jest publikacją prawną.

## Źródła prawne sprawdzone podczas przygotowania

- [Ustawa o świadczeniu usług drogą elektroniczną](https://eli.gov.pl/eli/DU/2002/1204/ogl), w szczególności informacja o usługodawcy, wymagania, zawieranie/rozwiązywanie usług i reklamacje (art. 5–8).
- [Ustawa o prawach konsumenta — tekst jednolity z września 2026](https://eli.gov.pl/api/acts/DU/2026/1244/text/T/D20261244L.pdf): informowanie, reklamacje, odstąpienie i usługi cyfrowe. Po niedostępności HTML odczytano oficjalny PDF, Dz.U. 2026 poz. 1244, ze stanem prawnym na 2 września 2026. Analiza dotyczy wskazanych zagadnień, nie każdej normy i wszystkich możliwych modeli biznesowych.
- [Kodeks cywilny](https://eli.gov.pl/eli/DU/1964/93/ogl): ograniczona zdolność do czynności prawnych, przedstawiciel ustawowy i skutki oświadczeń.
- [DSA — rozporządzenie 2022/2065](https://eur-lex.europa.eu/eli/reg/2022/2065/oj?locale=pl): warunki usług, punkty kontaktowe, zgłoszenia, uzasadnienia i obowiązki platform zależne od kwalifikacji/wyjątków. Oficjalne źródło opisuje zwolnienia mikro/małych; nie założono z góry ich zastosowania do Showly.
- [P2B — rozporządzenie 2019/1150](https://eur-lex.europa.eu/eli/reg/2019/1150/oj?locale=pl): warunki, rankingi, dane, ograniczenie/zakończenie relacji biznesowych i granice wyjątków małych podmiotów.
- [RODO — rozporządzenie 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=pl), [informacja UODO](https://uodo.gov.pl/pl/493/2254): przejrzystość, prawa i informacja o okresach przechowywania.
- [UOKiK — autentyczność opinii](https://uokik.gov.pl/falszywe-opinie-stop): informowanie o sposobie/braku weryfikacji opinii.
- [UOKiK — odstąpienie](https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/), [umowy szczególne](https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/umowy-szczegolne/): rozróżnienie usług i treści cyfrowych; nie kopiowano automatycznej klauzuli utraty prawa.
- [Komisja Europejska — zakończenie ODR](https://consumer-redress.ec.europa.eu/site-relocation_en): platforma ODR zakończona 20 lipca 2025; nie dodano nieaktualnego linku jako drogi do złożenia skargi.

To zakres analizy i projekt zapisany w repozytorium. Każda obietnica organizacyjna w regulaminie wymaga realnej możliwości jej wykonywania; należy zachować dowody doręczeń i wersje dokumentów.
