import { getRndInteger } from "./get-random-in";

export function generateCode(): string {
    const numbersPart = getRndInteger(0, 9999).toString().padStart(4, '0');
    let lettersPart = '';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < 2; i++) {
        lettersPart += letters.charAt(getRndInteger(0, letters.length));
    }

    return numbersPart + lettersPart;
}
