// Confirmed by the operator. Do not invent an address or backdate publication.
export const regulationsMeta = {
  version: "beta-2026-10-09",
  preparedOn: "9 października 2026 r.",
  status: "Projekt do zatwierdzenia",
  effectiveFrom: null,
  operator: "Kacper Kosicki",
  address: null,
  email: "kontakt@showly.me",
  minimumAge: 16,
};

export const regulationSections = [
  {
    id: "operator", title: "Serwis i operator", icon: "document",
    lead: "Kto udostępnia Showly i czego dotyczy ten dokument.",
    points: [
      "Showly.me („Serwis”, „Showly”) jest aplikacją internetową do prezentowania profili i ofert usług, wyszukiwania usługodawców, publikowania ogłoszeń o poszukiwanej współpracy oraz komunikacji i zarządzania rezerwacjami.",
      "Operatorem Serwisu jest Kacper Kosicki, prowadzący obecnie projekt jako osoba fizyczna, bez zarejestrowanej firmy. Kontakt elektroniczny: kontakt@showly.me. Nazwa Showly jest nazwą projektu, a nie odrębnym podmiotem prawnym. Brak wpisu firmy nie wyłącza obowiązków, które przepisy nakładają na Operatora ze względu na rzeczywisty charakter jego działalności.",
      "Regulamin dotyczy relacji z Operatorem w zakresie usług Showly. Warunki usług świadczonych przez użytkowników na rzecz ich klientów są odrębne. Showly nie wykonuje usług oferowanych na profilach, nie zatrudnia usługodawców i nie jest stroną ich umów z klientami.",
      "Dokument można bezpłatnie przeczytać, pobrać w formacie tekstowym oraz wydrukować lub zapisać do PDF przez funkcję drukowania przeglądarki. Podsumowania na stronie ułatwiają orientację; pełne zasady zawierają poniższe paragrafy.",
      "Ta wersja jest projektem do zatwierdzenia, nie ogłoszeniem zmiany dotychczasowych umów. Nie wskazano daty wejścia w życie. Przed nadaniem jej statusu obowiązującego wymagane jest uzupełnienie danych usługodawcy i wdrożenie zasad informowania użytkowników o regulaminie.",
    ],
  },
  {
    id: "definicje", title: "Najważniejsze pojęcia", icon: "users",
    lead: "Konto, profil, ogłoszenie i współpraca to różne rzeczy.",
    points: [
      "Użytkownik to osoba przeglądająca Serwis lub korzystająca z jego funkcji. Konto to przypisany do użytkownika dostęp do panelu po zalogowaniu. Profil lub wizytówka to publiczna prezentacja oferty powiązana z kontem twórcy.",
      "Twórca profilu lub usługodawca publikuje własną ofertę. Klient lub odwiedzający szuka informacji, kontaktuje się z twórcą albo składa prośbę o rezerwację. Użytkownik biznesowy korzysta z Showly w ramach swojej działalności gospodarczej lub zawodowej.",
      "Ogłoszenie jest wpisem użytkownika o poszukiwanej usłudze lub współpracy. Zgłoszenie jest odpowiedzią twórcy profilu na ogłoszenie. Oznaczenie zgłoszenia jako wybranego lub odrzuconego jest funkcją organizacyjną, a nie samoistną umową o wykonanie usługi.",
      "Treści użytkownika obejmują m.in. opisy, zdjęcia, dane oferty, galerie, cenniki, linki, ogłoszenia, opinie i wiadomości. Rezerwacja jest zapisem terminu lub prośbą o jego potwierdzenie zgodnie z ustawieniami usługodawcy.",
      "Konsument oraz przedsiębiorca, któremu przysługują odpowiednie prawa konsumenta, są rozumiani zgodnie z obowiązującymi przepisami. Samo zaznaczenie opcji „firma” w profilu nie przesądza o statusie prawnym konkretnej umowy.",
    ],
  },
  {
    id: "beta", title: "Bezpłatna wersja beta i zakres usług", icon: "spark",
    lead: "Testujemy platformę. Nie obiecujemy funkcji, których jeszcze nie udostępniliśmy.",
    points: [
      "W obecnej fazie testowej beta Operator nie pobiera opłat za korzystanie z Showly. Utworzenie konta ani używanie funkcji beta nie stanowi zgody na przyszłą płatność lub automatyczną subskrypcję.",
      "Dostępne funkcje obejmują przeglądanie i wyszukiwanie publicznych wizytówek oraz ogłoszeń, rejestrację i ustawienia konta, tworzenie profilu, zdjęcia, usługi i cenniki, opinie, ulubione, wiadomości, powiadomienia, ogłoszenia i odpowiedzi na nie. Rezerwacje, kalendarz, zespół, dodatkowe motywy i inne rozszerzenia zależą od uprawnień przypisanych do profilu.",
      "Nazwy poziomów Starter, Standard i Premium określają zestawy funkcji i limity w aplikacji. Obecność nazwy planu lub informacji o projektowanym cenniku nie oznacza powstania obowiązku zapłaty w bezpłatnej becie. O zakresie dostępnych funkcji i limitach użytkownik otrzymuje informacje w panelu przed ich użyciem.",
      "Wersja beta może zawierać błędy i czasowe przerwy. Operator przyjmuje zgłoszenia i wprowadza poprawki. Oznaczenie beta nie wyłącza ustawowej odpowiedzialności Operatora ani praw użytkownika.",
      "Wprowadzenie odpłatności wymaga osobnego przedstawienia pełnych danych usługodawcy, ceny, okresu rozliczeń, zasad zakończenia usługi, reklamacji i odstąpienia, a następnie wyraźnego zamówienia użytkownika. Bezpłatne konto nie zostanie automatycznie zamienione na odpłatne. Informacje o przyszłych płatnościach nie są ofertą sprzedaży w ramach tego regulaminu beta.",
    ],
  },
  {
    id: "techniczne", title: "Wymagania techniczne i dostępność", icon: "settings",
    lead: "Co jest potrzebne do korzystania ze strony na komputerze i telefonie.",
    points: [
      "Do korzystania z Showly potrzebne są połączenie z internetem oraz aktualna przeglądarka obsługująca JavaScript, HTTPS i pamięć lokalną. Do rejestracji i komunikacji z Operatorem potrzebny jest dostęp do skrzynki e-mail. Koszty internetu użytkownik rozlicza ze swoim dostawcą.",
      "Serwis jest dostępny przez przeglądarkę na komputerze i urządzeniu mobilnym. Blokowanie skryptów lub niezbędnej pamięci przeglądarki może uniemożliwić logowanie, zapamiętanie ustawień i korzystanie z części funkcji. Zgoda na opcjonalne narzędzia analityczne nie jest warunkiem założenia konta.",
      "Powiadomienia push wymagają obsługi przez urządzenie oraz udzielonego w przeglądarce zezwolenia. Można je wyłączyć. Push i e-mail są kanałami pomocniczymi; aktualny stan wiadomości i rezerwacji należy sprawdzać w panelu. Nie stanowią gwarancji dostarczenia w określonej sekundzie.",
      "Operator może prowadzić niezbędne prace techniczne i aktualizacje bezpieczeństwa. Planowane istotne przerwy komunikuje z wyprzedzeniem, jeżeli jest to możliwe; awarie usuwa bez nieuzasadnionej zwłoki. Nie gwarantuje nieprzerwanej dostępności, lecz nie wyłącza odpowiedzialności przewidzianej prawem.",
      "Zaleca się zachowanie własnych kopii opublikowanych materiałów i istotnych ustaleń. Showly nie jest usługą przechowywania jedynej kopii dokumentacji przedsiębiorstwa. Nie ogranicza to prawa do uzyskania danych lub treści, gdy wynika ono z przepisów.",
    ],
  },
  {
    id: "konto", title: "Konto, wiek i bezpieczeństwo", icon: "lock",
    lead: "Konta od 16 lat. Wiek nie zastępuje zdolności do zawierania umów.",
    points: [
      "Konto może utworzyć osoba, która ukończyła 16 lat. Osoba działająca w imieniu firmy lub innego podmiotu powinna być do tego uprawniona. Nie należy tworzyć konta na dane innej osoby bez upoważnienia.",
      "Użytkownik w wieku 16–17 lat powinien korzystać z konta za wiedzą przedstawiciela ustawowego i uzyskać jego zgodę na czynności, dla których przepisy wymagają takiej zgody. Nie może samodzielnie zaciągać zobowiązań wykraczających poza jego zdolność do czynności prawnych. Próg 16 lat nie nadaje pełnoletności ani pełnej zdolności prawnej. Dotyczy to także współprac ustalanych z innymi użytkownikami.",
      "Rejestracja odbywa się przez adres e-mail i hasło albo konto Google. Dla rejestracji e-mail przewidziana jest weryfikacja adresu. Użytkownik powinien podawać dane aktualne, zabezpieczyć skrzynkę i konto Google, używać silnego hasła oraz nie udostępniać danych logowania.",
      "Umowa dotycząca konta ma być zawierana po udostępnieniu regulaminu i wyraźnej akceptacji jego obowiązującej wersji w procesie rejestracji. Samo przeglądanie strony nie oznacza udzielenia zgody marketingowej ani akceptacji odpłatnej usługi. Ta wersja projektowa nie zastępuje wymaganej procedury akceptacji.",
      "Podejrzenie przejęcia konta lub nieuprawnionego użycia należy zgłosić na kontakt@showly.me. Operator może zabezpieczyć konto do czasu wyjaśnienia incydentu. Użytkownik nie ponosi automatycznie odpowiedzialności za każdą czynność wykonaną przez osobę, która bezprawnie uzyskała dostęp do jego konta.",
    ],
  },
  {
    id: "profile", title: "Profile, oferty i widoczność", icon: "briefcase",
    lead: "Publiczna wizytówka powinna odpowiadać rzeczywistej ofercie.",
    points: [
      "Twórca odpowiada za rzetelność publikowanych informacji, w tym nazwy, opisu działalności, kwalifikacji, usług, cen, terminów, galerii i danych kontaktowych. Powinien mieć wymagane prawem uprawnienia do oferowania swoich usług oraz aktualizować informacje, gdy oferta się zmienia.",
      "Publikowane pola profilu są dostępne publicznie i mogą być indeksowane przez wyszukiwarki lub kopiowane przez odwiedzających. Nie należy wpisywać danych poufnych w publiczny opis. Usunięcie materiału z Showly nie oznacza natychmiastowego usunięcia jego kopii z niezależnych wyszukiwarek.",
      "Twórca powinien zgodnie z prawdą określić, czy działa jako przedsiębiorca, i udostępnić wymagane dla jego oferty informacje. Podanie NIP jest obecnie opcjonalną funkcją formularza, a nie procedurą potwierdzenia statusu przedsiębiorcy. Jeżeli usługę oferuje osoba prywatna, przepisy o prawach konsumenta właściwe dla umów z przedsiębiorcami mogą nie mieć zastosowania do tej konkretnej relacji.",
      "Profil ma termin widoczności wskazany w panelu. W aktualnym mechanizmie nowy profil otrzymuje początkowy okres 30 dni. Wygaśnięcie, ręczne ukrycie lub blokada mogą usunąć go z publicznego katalogu i ograniczyć kontakt oraz rezerwacje. Samo wygaśnięcie nie jest usunięciem konta ani wszystkich danych profilu.",
      "Przy utracie widoczności istniejące rozmowy mogą być niedostępne do czasu przywrócenia profilu; ich historia jest w tym mechanizmie zachowana. Beta nie wymaga zakupu w celu odzyskania dostępu. Problemy z widocznością lub testowymi uprawnieniami należy zgłaszać Operatorowi.",
      "Nie wolno sugerować zatwierdzenia kwalifikacji, jakości lub legalności oferty przez Showly tylko dlatego, że profil jest widoczny, ma plan Premium lub oznaczenie partnera.",
    ],
  },
  {
    id: "ogloszenia", title: "Ogłoszenia i zgłoszenia współpracy", icon: "message",
    lead: "Jeden aktywny wpis, jasno opisany pomysł i świadome usuwanie.",
    points: [
      "Zalogowany użytkownik może opisać poszukiwaną współpracę, kategorię, miejsce lub tryb pracy, termin i budżet. Kwoty prezentowane są w PLN i mogą mieć formę kwoty stałej, przedziału lub wartości do ustalenia. Ogłoszenie nie jest automatycznie zamówieniem usługi.",
      "Jedno konto może mieć jedną aktywną publikację oraz do 50 nieusuniętych wpisów łącznie ze szkicami i archiwum. Publikacja trwa 30 razy 24 godziny od opublikowania. Edycja treści nie przedłuża tego okresu. Zastąpienie aktywnego ogłoszenia nowym wymaga świadomego wyboru autora.",
      "Na aktywne ogłoszenie może odpowiedzieć użytkownik posiadający własny profil usługodawcy. Nie można odpowiadać na własny wpis. Na jedno ogłoszenie przypada najwyżej jedno zgłoszenie z danego konta; wycofane zgłoszenie można ponowić. Zgłoszenie może zawierać wiadomość i propozycję budżetu.",
      "Wysłanie zgłoszenia tworzy powiązany wątek rozmowy. Autor ogłoszenia może oznaczać odpowiedzi jako wybrane, odrzucone lub oczekujące. Strony powinny samodzielnie uzgodnić zakres, cenę, terminy, rozliczenia i warunki współpracy.",
      "Ukrycie, zakończenie i wygaśnięcie ogłoszenia wstrzymują publiczną ekspozycję, ale nie usuwają jego istniejących rozmów. Usunięcie ogłoszenia usuwa również związane z nim rozmowy — także dostęp do nich po stronie odpowiadających. Przed usunięciem należy zachować istotne ustalenia. Inne, niezależne zapytania do profilu nie są tym samym wątkiem.",
      "Zakazane są pozorne ogłoszenia, podszywanie się pod zleceniodawców, wyłudzanie pieniędzy lub danych, oferty nielegalnych usług, spam oraz treści naruszające prawa innych osób. Ogłoszenia służą poszukiwaniu legalnej współpracy, a nie obchodzeniu przepisów prawa pracy lub zasad świadczenia usług regulowanych.",
    ],
  },
  {
    id: "wiadomosci", title: "Wiadomości i powiadomienia", icon: "mail",
    lead: "Kontakt między ludźmi, bez spamu i bez pozornej gwarancji poufności.",
    points: [
      "Showly udostępnia rozmowy związane z kontaktem z profilem, odpowiedzią na ogłoszenie i komunikaty systemowe. Dostępność wątku zależy m.in. od istnienia i stanu kont oraz profilu. Konto zablokowane, usunięte lub czasowa awaria usługi uwierzytelniania mogą ograniczyć dostęp.",
      "Nie wolno wysyłać spamu, phishingu, gróźb, złośliwych plików ani wiadomości służących wyłudzeniu. Należy sprawdzać tożsamość rozmówcy i adresy linków. Operator nie prosi o hasło do konta ani kod autoryzacji płatności w zwykłej rozmowie.",
      "Wiadomości są przechowywane w systemie Serwisu. Nie jest to komunikator z deklarowanym szyfrowaniem end-to-end. Dostęp techniczny do danych może być potrzebny do obsługi awarii, uzasadnionego zgłoszenia naruszenia lub obowiązku prawnego, z poszanowaniem zasad ochrony danych. Nie należy przesyłać danych kart płatniczych, haseł, kopii dokumentów tożsamości ani szczegółowej dokumentacji medycznej.",
      "Oznaczenie wiadomości jako przeczytanej lub wysłanie powiadomienia nie przesądza o akceptacji oferty. Użytkownicy sami odpowiadają za treść swoich oświadczeń i skutki ustaleń, z zachowaniem odpowiedzialności Operatora za jego własne działania.",
    ],
  },
  {
    id: "rezerwacje", title: "Rezerwacje, kalendarz i zespół", icon: "calendar",
    lead: "Potwierdzenie terminu i umowa o usługę nie zawsze oznaczają to samo.",
    points: [
      "Rezerwacje są udostępniane na profilach z odpowiednimi uprawnieniami. Mogą dotyczyć godzin lub całego dnia. Usługodawca określa dostępność, blokady terminów, usługi oraz ustawienia ręcznego albo automatycznego przyjmowania zgłoszeń.",
      "W trybie ręcznym rezerwacja ma status oczekujący do czasu decyzji lub wygaśnięcia czasu na potwierdzenie. W trybie automatycznym dostępny termin może być od razu zaakceptowany. Status widoczny w panelu należy sprawdzić przed wizytą; sama prośba o termin nie zawsze oznacza jego potwierdzenie.",
      "Skutki potwierdzenia zależą od treści oferty i oświadczeń stron. Rezerwacja, wiadomość lub akceptacja mogą prowadzić do umowy między użytkownikami, jeżeli spełniają wymagania prawa; ten regulamin nie wyłącza takiej możliwości. Showly nie jest stroną tej umowy.",
      "Usługodawca odpowiada za opis usługi, cenę, podatki, wymagane informacje dla klienta, wykonanie, zasady odwołania wizyty i ewentualną reklamację dotyczącą jego usługi. Klient powinien terminowo potwierdzać lub odwoływać wizyty. Nie można narzucać opłat za nieobecność, o których klient nie został skutecznie poinformowany i których nie zaakceptował zgodnie z prawem.",
      "W obecnej becie Showly nie pobiera należności za usługi użytkowników, nie prowadzi rachunku powierniczego i nie gwarantuje rozliczenia. Strony ustalają płatność między sobą. Spory o wykonanie usługi należy kierować do usługodawcy; błędy działania rezerwacji do Operatora.",
      "Funkcje zespołu i ręcznych wpisów offline nie uprawniają do wprowadzania danych innych osób bez podstawy prawnej. Twórca powinien spełnić obowiązki wobec pracowników i klientów, ograniczać dane do niezbędnych oraz określić role w ich przetwarzaniu. Nie wolno traktować samego regulaminu jako zastępstwa wymaganej umowy powierzenia danych.",
    ],
  },
  {
    id: "opinie", title: "Opinie i oceny", icon: "star",
    lead: "Ocena konta nie jest potwierdzeniem zakupu.",
    points: [
      "Zalogowany użytkownik może wystawić ocenę profilu w skali 1–5 i komentarz o długości 10–200 znaków. System nie pozwala ocenić własnego profilu ani dodać kolejnej opinii z tego samego konta do tego samego profilu.",
      "Showly obecnie nie sprawdza, czy autor opinii rzeczywiście kupił usługę, odbył wizytę lub zrealizował współpracę. Wymóg logowania i ograniczenie liczby opinii nie są weryfikacją transakcji. Opinie nie mają statusu „potwierdzony zakup”.",
      "Opinia powinna opisywać prawdziwe doświadczenie. Zabronione są fikcyjne recenzje, kupowanie ocen, wzajemne pozorne ocenianie, szantaż opinią, obraźliwe ataki i ujawnianie cudzych danych bez podstawy prawnej. Krytyczna, rzeczowa i legalna opinia nie jest usuwana tylko dlatego, że twórca profilu się z nią nie zgadza.",
      "Średnia ocena jest wyliczana z ocen pozostających na profilu. Po usunięciu opinii naruszającej zasady liczba ocen i średnia mogą się zmienić. Użytkownik może zgłosić opinię w aplikacji lub mailowo. Operator powinien rozpatrywać zgłoszenia bez faworyzowania opinii pozytywnych.",
    ],
  },
  {
    id: "kolejnosc", title: "Kolejność profili i oznaczenia", icon: "award",
    lead: "Wyjaśniamy, co wpływa na widoczność, zamiast obiecywać „najlepszych”.",
    points: [
      "Katalog umożliwia wyszukiwanie po nazwie, roli, lokalizacji, kategorii i tagach oraz sortowanie według oceny, liczby opinii albo nazwy. W domyślnym widoku wszystkich profili prezentowana jest kolejność danych otrzymana z katalogu, a nie indywidualne polecenie jakości.",
      "Sekcja wysoko ocenianych profili wybiera do 10 pozycji według średniej oceny malejąco. Przy tej samej ocenie pierwszeństwo ma większa liczba opinii, a następnie większa liczba odwiedzin. Wynik zależy od dostępnych i widocznych profili, nie od gwarancji ich kwalifikacji.",
      "Sekcja promowanych profili i partnerów obejmuje profile z uprawnieniem Standard lub Premium oraz partnerów oznaczonych przez administrację. Najpierw uwzględnia priorytet partnerstwa nadany przez administrację, następnie łączną wagę poziomu planu i rodzaju partnerstwa, a przy remisie ocenę, liczbę opinii i odwiedzin. Premium ma większą wagę niż Standard; typ partnerstwa również wpływa na wynik. W beta takie uprawnienia mogą być przypisane testowo, bez opłaty.",
      "W wyszukiwaniu serwerowym istotne są zgodność zapytania z nazwą, usługami, opisami, kategorią, tagami i lokalizacją; dokładne dopasowania mają większe znaczenie niż częściowe. Oceny, liczba opinii i odwiedziny mogą uzupełniać wynik dopasowania. Filtry i wybrany sposób sortowania zmieniają prezentowany zestaw.",
      "Oznaczenia partnerstwa, w tym etykiety partnera, ambasadora czy „verified”, są oznaczeniami nadawanymi przez administrację. Nie stanowią urzędowego potwierdzenia tożsamości, kwalifikacji lub jakości. Profile Operatora lub osób współpracujących mogą występować w tych sekcjach i mieć priorytet partnerstwa; nie należy utożsamiać tej ekspozycji z niezależnym rankingiem.",
      "Jeżeli w przyszłości ekspozycja będzie sprzedawana, jej odpłatny charakter musi być ujawniony przy prezentacji oraz w warunkach zakupu. Serwis nie wymaga wyłączności i nie zakazuje oferowania usług w innych miejscach na innych warunkach.",
    ],
  },
  {
    id: "tresci", title: "Treści i prawa do materiałów", icon: "image",
    lead: "Materiały pozostają Twoje; Showly potrzebuje ograniczonego prawa do ich wyświetlania.",
    points: [
      "Użytkownik powinien mieć prawa do publikowanych zdjęć, tekstów, znaków i innych materiałów oraz odpowiednią podstawę do wykorzystania wizerunku i danych innych osób. Nie wolno kopiować cudzej wizytówki ani podszywać się pod markę lub osobę.",
      "Publikacja nie przenosi praw autorskich na Operatora. Użytkownik udziela niewyłącznego, nieodpłatnego uprawnienia do przechowywania, technicznego przetwarzania, skalowania i udostępniania materiału w Showly w zakresie potrzebnym do realizacji wybranej funkcji, w tym wyświetlania profilu w katalogu. Nie obejmuje to sprzedaży treści ani używania ich w zewnętrznych kampaniach bez odrębnej podstawy.",
      "To uprawnienie trwa podczas udostępniania treści w Serwisie. Po ich usunięciu nie służy dalszej publicznej prezentacji; techniczne kopie lub dowody naruszeń mogą być zachowane tylko w zakresie uzasadnionym prawem i zasadami retencji. Prawa użytkownika do danych osobowych pozostają niezależne.",
      "Zabronione są treści nielegalne, oszustwa, groźby, nawoływanie do przemocy i nienawiści, naruszanie prywatności, seksualne wykorzystywanie małoletnich, handel zakazanymi towarami, pornografia, nękanie, spam i naruszenia własności intelektualnej. Sformułowania ocenne nie mogą służyć zakazywaniu dozwolonej krytyki.",
      "Nie wolno obchodzić kontroli dostępu, wykorzystywać błędów do pozyskiwania cudzych danych, automatycznie masowo pobierać treści z naruszeniem prawa lub zakłócać działania systemu. Zwykłe legalne korzystanie z przeglądarki i narzędzi dostępności pozostaje dozwolone.",
    ],
  },
  {
    id: "zgloszenia", title: "Zgłaszanie naruszeń i moderacja", icon: "shield",
    lead: "Dokładne zgłoszenie, proporcjonalna decyzja i możliwość jej zakwestionowania.",
    points: [
      "Naruszenie można zgłosić na kontakt@showly.me bez posiadania konta. Dla profili i opinii dostępna jest także funkcja zgłoszenia w aplikacji. Ogłoszenia i pozostałe treści można wskazać w zgłoszeniu mailowym.",
      "Zgłoszenie treści nielegalnej powinno zawierać dokładny adres URL lub identyfikator treści, wyjaśnienie podstaw uznania jej za nielegalną, istotne okoliczności i oświadczenie, że podane informacje są zgodne z najlepszą wiedzą zgłaszającego. Należy podać imię i nazwisko oraz e-mail, z wyjątkiem sytuacji, w których przepisy dopuszczają pominięcie tych danych, w szczególności odpowiednich zgłoszeń dotyczących seksualnego wykorzystywania dzieci. Brak pełnych danych nie uzasadnia ignorowania oczywistego zagrożenia.",
      "Operator powinien potwierdzić otrzymanie zgłoszenia, gdy ma dane kontaktowe zgłaszającego, ocenić je bez nieuzasadnionej zwłoki, rzetelnie i bez arbitralności oraz przekazać decyzję i dostępne możliwości jej zakwestionowania. Nie ma obowiązku uwzględnienia każdego żądania usunięcia treści.",
      "Możliwe środki obejmują wezwanie do poprawy, usunięcie lub ukrycie konkretnej treści, ograniczenie funkcji, czasowe zabezpieczenie konta oraz rozwiązanie umowy przy odpowiednio poważnych lub powtarzających się naruszeniach. Przy wyborze środka uwzględnia się wagę, powtarzalność, skutki, bezpieczeństwo i prawa zainteresowanych, w tym wolność wypowiedzi.",
      "Użytkownik objęty ograniczeniem powinien otrzymać uzasadnienie obejmujące zastosowany środek, czas i zakres, okoliczności, podstawę regulaminową lub prawną oraz informację, czy użyto automatyzacji. Wyjątki wynikają z przepisów, w tym ochrony dochodzenia lub bezpieczeństwa. Wygaśnięcie okresu widoczności jest zdarzeniem technicznym, odrębnym od sankcji moderacyjnej.",
      "Od decyzji można odwołać się bezpłatnie na kontakt@showly.me, podając treść decyzji, profil lub wpis i powód sprzeciwu. Operator ponownie bada sprawę; odwołanie nie ogranicza prawa do sądu ani innych ustawowych środków. Jeżeli dla Serwisu znajdują zastosowanie obowiązki wewnętrznego systemu skarg z DSA, zapewniane są także wynikające z nich gwarancje, w tym co najmniej sześciomiesięczny termin na skargę. Nie deklaruje się automatycznej oceny wszystkich treści przez AI.",
    ],
  },
  {
    id: "prywatnosc", title: "Dane, prywatność i pamięć przeglądarki", icon: "lock",
    lead: "Regulamin nie zastępuje pełnej informacji o przetwarzaniu danych.",
    points: [
      "Za przetwarzanie danych na potrzeby konta i działania Showly odpowiada Operator: Kacper Kosicki; kontakt w sprawach danych: kontakt@showly.me. Dane obejmują m.in. identyfikator konta, e-mail, dane profilu, treści, relacje ulubionych, wiadomości, zgłoszenia, rezerwacje i dane techniczne niezbędne do obsługi funkcji.",
      "Dane są wykorzystywane do wykonania usług wybranych przez użytkownika, obsługi kontaktu i zgłoszeń, zapewnienia bezpieczeństwa oraz realizacji obowiązków prawnych, na podstawach właściwych dla danego celu. Opcjonalne zgody, jeśli są potrzebne, powinny być zbierane odrębnie; akceptacja regulaminu nie jest uniwersalną zgodą na dowolne używanie danych lub marketing.",
      "Do uwierzytelniania i powiadomień używane są usługi Firebase/Google; do zdjęć infrastruktura Cloudinary, a do danych aplikacji MongoDB. Formularz kontaktowy przesyła wiadomość do skrzynki Operatora. Google może otrzymywać dane przy wybranej metodzie logowania. Pełna informacja o odbiorcach, lokalizacjach, transferach i retencji wymaga odrębnej, aktualnej informacji o prywatności odpowiadającej faktycznej konfiguracji usług.",
      "Twórcy otrzymują dostęp do danych związanych z własnym profilem, rezerwacjami, otrzymanymi zgłoszeniami i rozmowami; nie uzyskują przez sam regulamin prawa do danych wszystkich użytkowników. Operator ma techniczny dostęp w zakresie potrzebnym do obsługi Serwisu i swoich obowiązków. Przetwarzanie danych klientów na potrzeby własnej działalności twórcy wymaga osobnej oceny podstaw i ról.",
      "W sprawach danych można żądać dostępu, sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych i wnieść sprzeciw w zakresie przewidzianym prawem. Zgodę można wycofać bez podważania wcześniejszego zgodnego z prawem przetwarzania. Przysługuje skarga do Prezesa UODO. Na żądania odpowiada się co do zasady w ciągu miesiąca, z możliwością uzasadnionego przedłużenia zgodnie z RODO.",
      "Niezbędna pamięć przeglądarki służy m.in. sesji logowania, ustawieniom motywu i zapamiętaniu wyboru cookies. Opcjonalne narzędzia wymagające zgody nie mogą działać przed jej uzyskaniem. Szczegóły dotyczące cookies i localStorage opisuje polityka cookies; samo zapisanie przycisku „Akceptuję” nie zastępuje rzeczywistego sterowania narzędziami.",
      "Danych nie należy przechowywać bezterminowo tylko dlatego, że konto kiedyś istniało. Okresy lub konkretne kryteria retencji i sposób realizacji praw powinny być ujawnione w informacji o prywatności przed zbieraniem danych. Ten projekt nie jest deklaracją zakończonego audytu RODO.",
    ],
  },
  {
    id: "reklamacje", title: "Reklamacje i prawa użytkownika", icon: "mail",
    lead: "Zgłoszenie problemu nie wymaga płatnego planu.",
    points: [
      "Reklamację dotyczącą działania Showly można przesłać na kontakt@showly.me lub przez formularz kontaktowy. Warto podać kontakt zwrotny, opis problemu, datę zdarzenia, oczekiwane rozwiązanie oraz identyfikator profilu, rozmowy lub rezerwacji. Nie należy przesyłać hasła. Nie jest wymagany określony formularz.",
      "Operator odpowiada na reklamacje w ciągu 14 dni od ich otrzymania, na e-mail lub innym odpowiednim trwałym nośniku. Prośba o dodatkowe informacje nie uruchamia terminu od nowa. Gdy zastosowanie ma ustawowy obowiązek odpowiedzi konsumentowi i odpowiedź nie zostanie przekazana w terminie, skutki ocenia się zgodnie z przepisami, w tym zasadą uznania reklamacji.",
      "Jeżeli przepisy dotyczące usług cyfrowych znajdują zastosowanie, użytkownik ma przewidziane nimi prawa przy niedostarczeniu usługi lub jej niezgodności z umową, w tym żądanie doprowadzenia do zgodności oraz, w ustawowych przypadkach, odstąpienie od umowy lub obniżenie ceny. Bezpłatność beta nie stanowi sama w sobie wyłączenia ustawowych uprawnień.",
      "Gdy użytkownikowi przysługuje ustawowe prawo odstąpienia od umowy zawartej na odległość, może je wykonać co do zasady w ciągu 14 dni od zawarcia umowy o usługę. Dla usług bez ceny przepisów nie stosuje się automatycznie w każdej sytuacji; znaczenie ma także sposób wykorzystywania danych i status Operatora. Niniejszy regulamin nie ogranicza prawa, które wynika z ustawy.",
      "Oświadczenie o odstąpieniu można wysłać na kontakt@showly.me. Wystarczy jednoznaczna informacja o odstąpieniu i możliwość zidentyfikowania umowy lub konta. Wzór poniżej jest dobrowolny. Żądanie usunięcia konta lub danych osobowych to odrębne uprawnienia, niezależne od terminu odstąpienia.",
      "Spory można próbować rozwiązać z Operatorem, a w odpowiednich sprawach skorzystać z rzecznika konsumentów, Inspekcji Handlowej lub uprawnionego podmiotu ADR. Informacje o pomocy udostępnia UOKiK. Właściwość sądu określają przepisy; nie narzuca się konsumentowi sądu właściwego tylko dla Operatora.",
    ],
  },
  {
    id: "zakonczenie", title: "Zakończenie korzystania i konta biznesowe", icon: "users",
    lead: "Możesz odejść. Usunięcie konta wymaga objęcia wszystkich powiązanych systemów.",
    points: [
      "Użytkownik może w każdej chwili przestać korzystać z Serwisu i wypowiedzieć umowę dotyczącą bezpłatnego konta, przesyłając żądanie na kontakt@showly.me z adresem pozwalającym zidentyfikować konto. Operator może zweryfikować uprawnienie do żądania w sposób proporcjonalny; nie powinien rutynowo żądać kopii dowodu osobistego.",
      "W obecnym interfejsie nie ma pełnej samodzielnej procedury likwidacji konta. Wylogowanie, usunięcie awatara, wygaśnięcie profilu i usunięcie samego rekordu z bazy nie są równoznaczne z usunięciem konta we wszystkich usługach. Żądanie powinno obejmować zakończenie dostępu, profil i powiązane dane, z uwzględnieniem ustawowych wyjątków od usunięcia.",
      "Operator może zakończyć umowę z ważnego powodu, w szczególności przy poważnym lub powtarzającym się naruszeniu, braku możliwości legalnego świadczenia usługi lub zakończeniu projektu. Co do zasady komunikuje powód i termin z co najmniej 30-dniowym wyprzedzeniem oraz umożliwia zachowanie własnych treści. Natychmiastowe zabezpieczenie lub zakończenie jest możliwe tylko w uzasadnionych przypadkach, np. obowiązku prawnego lub poważnego zagrożenia.",
      "Wobec użytkowników biznesowych, gdy zastosowanie ma rozporządzenie P2B, przestrzega się jego szczególnych wymagań dotyczących uzasadnienia ograniczeń na trwałym nośniku, zakończenia całej usługi z co najmniej 30-dniowym wyprzedzeniem i ustawowych wyjątków. Sam napis „beta” ani status prywatnego projektu nie przesądzają o braku zastosowania tych przepisów.",
      "Przed zakończeniem konta można zwrócić się o własne treści i dane w zakresie przewidzianym prawem. Nie obiecuje się obecnie automatycznego eksportu jednym przyciskiem. Po zakończeniu nie ma dostępu do panelu; dalsze przechowywanie danych wymaga konkretnego uzasadnienia i ograniczonego okresu. Dane innych uczestników rozmów i prawa do dowodów sporów wymagają odrębnej oceny.",
    ],
  },
  {
    id: "odpowiedzialnosc", title: "Odpowiedzialność i zmiany zasad", icon: "document",
    lead: "Beta i cudze oferty nie wyłączają odpowiedzialności Showly za własne działania.",
    points: [
      "Operator odpowiada za własne działania i zaniechania na zasadach określonych prawem. Regulamin nie wyłącza odpowiedzialności za umyślnie wyrządzoną szkodę, nie odbiera konsumentom ustawowej ochrony i nie przerzuca na użytkownika każdego ryzyka technicznego.",
      "Za ofertę i wykonanie usług między użytkownikami odpowiadają ich strony. Showly nie gwarantuje liczby klientów, przychodu, skuteczności ogłoszenia, jakości cudzej usługi ani prawdziwości każdej opinii. Operator reaguje na należycie zgłoszone treści nielegalne zgodnie z obowiązującymi zasadami usług pośrednich; nie jest zwolniony z odpowiedzialności wyłącznie na podstawie tego regulaminu.",
      "Zmiany zasad mogą wynikać z nowych obowiązków prawnych, konieczności poprawy bezpieczeństwa, uzasadnionych zmian technicznych lub zmiany zakresu usług. Nie są podstawą do dowolnego pogarszania już przyjętych zobowiązań ani retroaktywnego nakładania opłat.",
      "Istotne zmiany dotyczące trwających umów są przekazywane na trwałym nośniku, np. e-mailem wraz z tekstem nowej wersji, co najmniej 15 dni przed wejściem w życie, a jeśli dostosowanie wymaga więcej czasu — odpowiednio wcześniej. Użytkownik otrzymuje informację o prawie zakończenia umowy. Krótszy termin może wynikać z obowiązku prawnego lub nieprzewidzianego, bezpośredniego zagrożenia, w granicach dopuszczonych prawem.",
      "Jeżeli zastosowanie mają szczególne przepisy o zmianach usług cyfrowych i zmiana negatywnie wpływa na dostęp lub korzystanie bardziej niż nieznacznie, użytkownik otrzymuje wymagane informacje i ustawowe prawo zakończenia umowy, w tym odpowiedni termin 30 dni. Obowiązujące przepisy mają pierwszeństwo przed mniej korzystnym postanowieniem.",
      "Do regulaminu stosuje się prawo polskie z poszanowaniem bezwzględnie obowiązujących przepisów ochronnych, w tym ochrony właściwej dla konsumenta z innego państwa, gdy ma ona zastosowanie. Nieskuteczność pojedynczego postanowienia nie pozbawia użytkownika praw z pozostałych postanowień i przepisów.",
      "Data przygotowania projektu: 9 października 2026 r. Data obowiązywania wymaga odrębnego ustalenia i komunikacji. Nie zastępuje się poprzedniej daty obowiązywania fikcyjnym, wstecznym terminem.",
    ],
  },
];

export const withdrawalTemplate = "Do: Kacper Kosicki, kontakt@showly.me\n\nOświadczam, że odstępuję od umowy dotyczącej: …\nData zawarcia umowy: …\nImię i nazwisko: …\nE-mail powiązany z kontem: …\nData oświadczenia: …\n\nPodpis wymagany tylko przy składaniu oświadczenia na papierze.";

export const legalSources = [
  { label: "Usługi drogą elektroniczną", url: "https://eli.gov.pl/eli/DU/2002/1204/ogl" },
  { label: "Prawa konsumenta", url: "https://eli.gov.pl/eli/DU/2014/827/ogl" },
  { label: "Kodeks cywilny", url: "https://eli.gov.pl/eli/DU/1964/93/ogl" },
  { label: "Akt o usługach cyfrowych (DSA)", url: "https://eur-lex.europa.eu/eli/reg/2022/2065/oj?locale=pl" },
  { label: "Relacje platforma–biznes (P2B)", url: "https://eur-lex.europa.eu/eli/reg/2019/1150/oj?locale=pl" },
  { label: "RODO", url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=pl" },
  { label: "Pomoc dla konsumentów — UOKiK", url: "https://uokik.gov.pl/pomoc-dla-konsumentow" },
];

export function buildRegulationsText() {
  return [
    "REGULAMIN SHOWLY.ME — BEZPŁATNA WERSJA BETA",
    `Wersja: ${regulationsMeta.version}. Status: ${regulationsMeta.status}.`,
    "PROJEKT: brak opublikowanego adresu usługodawcy i ustalonej daty wejścia w życie. Nie stanowi potwierdzenia zgodności prawnej całej aplikacji.",
    ...regulationSections.map((section, index) => `§ ${index + 1}. ${section.title}\n\n${section.points.map((point, pointIndex) => `${pointIndex + 1}. ${point}`).join("\n\n")}`),
    `DOBROWOLNY WZÓR ODSTĄPIENIA\n\n${withdrawalTemplate}`,
    `ŹRÓDŁA\n${legalSources.map(source => `${source.label}: ${source.url}`).join("\n")}`,
  ].join("\n\n");
}
