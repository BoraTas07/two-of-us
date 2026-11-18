// İsimlere Türkçe hal ekleri (ünlü uyumu ile): Ece'ye / Deniz'e, Ece'den / Deniz'den, Ece'nin / Deniz'in

const VOWELS = "aeıioöuüâîû";
const BACK = "aıouâû";
const HARD = "fstkçşhp";

function lastVowel(w: string): string {
  const s = w.toLocaleLowerCase("tr");
  for (let i = s.length - 1; i >= 0; i--) if (VOWELS.includes(s[i])) return s[i];
  return "e";
}

function endsWithVowel(w: string) {
  return VOWELS.includes(w.toLocaleLowerCase("tr").slice(-1));
}

/** Yönelme: Ece'ye, Deniz'e, Ali'ye, Ayşe'ye, Can'a */
export function dative(name: string): string {
  const v = BACK.includes(lastVowel(name)) ? "a" : "e";
  return `${name}'${endsWithVowel(name) ? "y" : ""}${v}`;
}

/** Ayrılma: Ece'den, Deniz'den, Burak'tan */
export function ablative(name: string): string {
  const v = BACK.includes(lastVowel(name)) ? "a" : "e";
  const d = HARD.includes(name.toLocaleLowerCase("tr").slice(-1)) ? "t" : "d";
  return `${name}'${d}${v}n`;
}

/** İlgi: Ece'nin, Deniz'in, Burak'ın, Onur'un */
export function genitive(name: string): string {
  const lv = lastVowel(name);
  const v = "aıâ".includes(lv) ? "ı" : "eiî".includes(lv) ? "i" : "ouû".includes(lv) ? "u" : "ü";
  return `${name}'${endsWithVowel(name) ? "n" : ""}${v}n`;
}
