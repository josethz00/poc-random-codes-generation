import { getRndInteger } from "./get-random-in";

export function generateRandomCode(): string {
    const numbersPart = getRndInteger(0, 9999).toString().padStart(4, '0');
    let lettersPart = '';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < 2; i++) {
        lettersPart += letters.charAt(getRndInteger(0, letters.length));
    }

    return numbersPart + lettersPart;
}

export function generateSequentialCodes(nOfCodes: number = 100): string[] {
    const codes: string[] = [];
    let nextNumber = 0;
    const nextLetters = ['A'.charCodeAt(0), 'A'.charCodeAt(0), 'A'.charCodeAt(0)]
    let nextNumberPart = '0000';
    let nextLettersPart = 'AAA';
    
    for (let i = 0; i < nOfCodes; i++) {
        codes.push(`${nextNumberPart}${nextLettersPart}`);
        nextNumberPart = (nextNumber + 1).toString().padStart(4, '0');
        
        nextLetters[2]++;  // increment the last letter

        // check if the last letter is bigger than 'Z' in the ASCII table
        if (nextLetters[2] > 90) {
            nextLetters[2] = 65;  // reset to 'A'
            nextLetters[1]++;  // increment the 2nd letter

            // check if the second letter is bigger than 'Z' in the ASCII table
            if (nextLetters[1] > 90) {
                nextLetters[1] = 65;  // reset to 'A'
                nextLetters[0]++;    // increment the 1st letter

                // if all letters are 'Z', then reset them all to 'A'
                if (nextLetters[0] > 90) {
                    nextLetters[0] = 65;
                    nextLetters[1] = 65;
                    nextLetters[2] = 65;
                }
            }
        }

        nextLettersPart = String.fromCharCode(...nextLetters);
    }

    return codes;
}

console.log(generateSequentialCodes())