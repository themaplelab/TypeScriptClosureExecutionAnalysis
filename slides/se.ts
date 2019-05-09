function f(y: boolean, x: Function) {
    if (y) {
        x();
    }
}

declare const q: Function;
function y() {
    [1, 2, 3].map(q);
    // q should be always executed at this point
}