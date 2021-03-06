import "../src/must_execute";

function main() {
    let x;
    function enclosed() {
        x = 42;// Initialize x here
    }
    if (Math.random() === 0.004378439) {
        enclosed();
    } else {
        while (1) {
            enclosed();
            break;
        }
    }
    if (enclosed.mustHaveExecuted()) {
        // x has been initialized, we can use it!
        console.log(x);
    } else {
        throw "up";// x has not been initialized
    }
}

main();