import "../src/must_execute";

namespace R {
    export class Foo {
        private x: number = -1;
        constructor() {
            Foo.readify();
            if (R.Foo.readify.mustHaveExecuted()) {
                console.log("YES!");
            }
            else {
                console.log("NO!");
            }
        }
        static readify() {
        }
    }
}

const f = new R.Foo;
