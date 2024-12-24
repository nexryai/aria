const browserIsSafari = window ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent) : false;

export function isSafari(): boolean {
    return browserIsSafari;
}
