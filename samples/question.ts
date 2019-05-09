import "../src/must_execute";

function main() {
    function closure() {}
    let foo = function () {
        closure();
    }
    foo();
    if (closure.mustHaveExecuted()) {
        console.log("YES!");
    } else {
        console.log("NO!");
    }
}


main();