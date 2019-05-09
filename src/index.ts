import * as ts from "typescript";
import { readFileSync } from "fs";
import { resolve } from "path";

const src = ts.createSourceFile(
    "test.ts",
    readFileSync(resolve(__dirname, "../samples/test.ts"), { encoding: "utf8" }),
    ts.ScriptTarget.ESNext,
    true,
);

import "./sem";

src.forEachChild(function foo(node) {
    if (ts.isFunctionDeclaration(node)) {
        console.log(`Function declr at position: ${node.pos} to ${node.end}`);
        node.body!.forEachChild(foo);
    } else if (ts.isExpressionStatement(node)) {
        node.expression.forEachChild(foo);
    } else if (ts.isCallExpression(node)) {
        console.log("Call expr");
    } else if (ts.isIdentifier) {

    }
    else {
        console.log(`Node: ${ts.SyntaxKind[node.kind]}`);
    }
});
