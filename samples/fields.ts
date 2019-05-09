import "../src/must_execute";


class Foo {
    private x: number;
    constructor() {
        this.initializers();
    }
    initializers() {
        this.x = 42;
    }
}



declare function bar(): void;
function foo(baz: () => void): void {
    function enclosed() {
        baz();
    }
    const local = enclosed;
    local();
}
foo(() => bar());
