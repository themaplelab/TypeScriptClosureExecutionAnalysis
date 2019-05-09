import "../src/must_execute";
import { isFunctionLikeDeclaration } from "../src/sonarts/sonarts-core/src/utils/nodes";

class Foo {
    foo(f: Function) {
        f();
    }
}

function target() {
    const foo = new Foo;
    function closure() { }
    foo.foo(closure);
    if (closure.mustHaveExecuted()) {
        console.log("YES!");
    }
    else {
        console.log("NO!");
    }
}

target();
