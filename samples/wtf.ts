import "../src/must_execute";

function baz() {

}

function helper(f: Function) {
    f();
}

function main() {
    helper(baz);
    if (baz.mustHaveExecuted()) {
        console.log("YES!");
    } else {
        console.log("NO!");
    }
}

main();


