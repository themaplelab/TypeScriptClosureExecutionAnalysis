import "../src/must_execute";


let foo: Function | null;
if (Math.random() > 0.5) {
    foo = function () {
        console.log(foo);
    }
} else {
    foo = null;
}

function main() {
    function target() {

    }
    (<Function>foo)();

    if (foo) {
        target();
    }

    if (target.mustHaveExecuted()) {
        console.log("YES!");
    } else {
        console.log("NO!");
    }
}


main();