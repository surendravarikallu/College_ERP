export function numberToWords(num: number): string {
    if (num < 0 || num > 100) return "";
    
    const words: Record<string, string> = {
        '0': 'ZERO', '1': 'ONE', '2': 'TWO', '3': 'THREE', '4': 'FOUR',
        '5': 'FIVE', '6': 'SIX', '7': 'SEVEN', '8': 'EIGHT', '9': 'NINE',
        '.': 'POINT'
    };

    const str = num.toString();
    const result = [];
    for (const char of str) {
        if (words[char]) {
            result.push(words[char]);
        }
    }
    
    return result.join(" ");
}
