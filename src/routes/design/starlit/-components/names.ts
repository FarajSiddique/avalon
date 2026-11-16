/** "Wren", "Wren and Mira", "Wren, Mira and Bram". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** The letter shown inside a player's star. */
export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five"] as const;

/** Small counts read better as words: "three stars". */
export function numberWord(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}
