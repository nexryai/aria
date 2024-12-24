const browserIsSafari =　typeof window !== "undefined" ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent) : false;

export function isSafari(): boolean {
    return browserIsSafari;
}
