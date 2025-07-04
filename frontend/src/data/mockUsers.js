const mockUsers = [
  {
    name: 'Anna Nowak',
    avatar: 'https://i.pravatar.cc/150?img=12',
    role: 'Programistka front-end',
    rating: 4.9,
    reviews: 23,
    location: 'Warszawa',
    tags: ['React', 'JavaScript', 'UI/UX'],
    available: true,
    price: '250 zł',
    availabilityDate: 'od 10 czerwca',
    availableDates: ['2025-10-10', '2024-06-12', '2024-06-18']
  },
  {
    name: 'Jan Kowalski',
    avatar: 'https://i.pravatar.cc/150?img=1',
    role: 'Grafik',
    rating: 4.7,
    reviews: 18,
    location: 'Kraków',
    tags: ['Photoshop', 'Illustrator', 'Figma'],
    available: true,
    price: '250 zł',
    availabilityDate: 'od 10 czerwca',
    availableDates: ['2024-06-10', '2024-06-12', '2024-06-18']
  },
  {
    name: 'Maria Wiśniewska',
    avatar: 'https://i.pravatar.cc/150?img=5',
    role: 'DJ',
    rating: 5.0,
    reviews: 45,
    location: 'Gdańsk',
    tags: ['Imprezy', 'Muzyka', 'Mix'],
    available: false,
    price: '250 zł',
    availabilityDate: 'od 10 czerwca'
  },
  {
    name: 'Tomasz Malinowski',
    avatar: 'https://i.pravatar.cc/150?img=15',
    role: 'Elektryk',
    rating: 4.6,
    reviews: 31,
    location: 'Poznań',
    tags: ['Instalacje', 'Prąd', 'Naprawy'],
    available: true,
    price: '150 zł',
    availabilityDate: 'od 5 czerwca'
  },
  {
    name: 'Katarzyna Zielińska',
    avatar: 'https://i.pravatar.cc/150?img=18',
    role: 'Nauczycielka angielskiego',
    rating: 4.8,
    reviews: 27,
    location: 'Łódź',
    tags: ['Język angielski', 'Edukacja', 'Korepetycje'],
    available: false,
    price: '120 zł',
    availabilityDate: 'od 20 czerwca'
  },
  {
    name: 'Marek Nowicki',
    avatar: 'https://i.pravatar.cc/150?img=22',
    role: 'Fotograf',
    rating: 4.5,
    reviews: 39,
    location: 'Wrocław',
    tags: ['Sesje zdjęciowe', 'Śluby', 'Studio'],
    available: true,
    price: '300 zł',
    availabilityDate: 'od 12 czerwca'
  },
  {
    name: 'Natalia Kamińska',
    avatar: 'https://i.pravatar.cc/150?img=32',
    role: 'Copywriterka',
    rating: 4.9,
    reviews: 22,
    location: 'Szczecin',
    tags: ['Content', 'SEO', 'Marketing'],
    available: true,
    price: '200 zł',
    availabilityDate: 'od 8 czerwca'
  },
  {
    name: 'Piotr Wójcik',
    avatar: 'https://i.pravatar.cc/150?img=35',
    role: 'Programista back-end',
    rating: 4.6,
    reviews: 16,
    location: 'Białystok',
    tags: ['Node.js', 'MongoDB', 'API'],
    available: false,
    price: '300 zł',
    availabilityDate: 'od 18 czerwca'
  },
  {
    name: 'Magdalena Sobczak',
    avatar: 'https://i.pravatar.cc/150?img=45',
    role: 'Fryzjerka',
    rating: 5.0,
    reviews: 50,
    location: 'Katowice',
    tags: ['Strzyżenie', 'Stylizacja', 'Koloryzacja'],
    available: true,
    price: '180 zł',
    availabilityDate: 'od 9 czerwca'
  }
];

export default mockUsers;
