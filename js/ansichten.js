const GRUPPEN = {
  'Pylon und Hof': {
    'Vor dem Pylon': [0, 75, 0, 12, 0],
    'Pylonturm, langer Raum': [16.5, 40.5, 90, 0, 0, 4.19],
    'Pylonturm, Treppe': [21.0, 39.3, 180, 20, 0, 13.8],
    'Pylonturm, Plattform': [12, 37, 15, -14, 1, 33.5],
    'Hof': [0, 12, 0, 8, 0],
    'Hof, Blick zum Pylon': [0, 10, 180, 18, 0],
    'Dach des Säulenumgangs': [14.5, 32.4, 125, 10, 1, 9.9],
  },
  'Pronaos und Festsaal': {
    'Pronaos': [0, -17, 0, 5, 0],
    'Bibliothek': [6.1, -15.8, 0, 0, 0],
    'Festsaal': [0, -34, 0, 0, 0],
    'Schatzkammer': [-12.9, -40.5, 0, 5, 0],
  },
  'Treppen und Dach': {
    'Opfertischsaal, Blick zur Westtür': [-6, -50.6, 90, 0, 0],
    'Osttreppe': [15.2, -40, 180, 18, 1],
    'Westtreppe, Eingang': [-12.5, -50.4, 0, 12, 0],
    'Westtreppe, oberer Gang': [-12.5, -46.4, 0, 0, 2],
    'Dach über der Westtreppe': [-15.6, -46.5, -30, -12, 1],
    'Hof des Reinheitsplatzes': [11.7, -55.8, 0, 12, 0],
  },
  'Allerheiligstes': {
    'Mittlerer Saal, Blick ins Allerheiligste': [0.14, -58.5, 0, 0, 0],
    'Allerheiligstes': [0, -63.5, 0, 5, 0],
    'Korridor der Mysterien': [5.7, -65, 0, 0, 0],
    'Kapelle des Götterthrons': [-9.0, -69.5, 90, -12, 0],
  },
};
const ANSICHTEN = Object.assign({}, ...Object.values(GRUPPEN));

export { ANSICHTEN, GRUPPEN };
