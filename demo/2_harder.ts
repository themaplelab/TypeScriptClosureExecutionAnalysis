import "../src/must_execute";

function main() {
    let x;
    function enclosed() {
        x = 42;
    }
    if (enclosed.mustHaveExecuted()) {
        // x has been initialized, we can use it!
        console.log(x);
    } else {
        throw "up";// x has not been initialized
    }
}

main();