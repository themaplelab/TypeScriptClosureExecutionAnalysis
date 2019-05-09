import { resolve } from "path";

import * as ts from "typescript";
import stackTrace from "stack-trace";

import { execute as symExec, ExecutionResult } from "./sonarts/sonarts-core/src/se/SymbolicExecution";
import { build as buildCFG } from "./sonarts/sonarts-core/src/cfg/builder";
import { ProgramState, createInitialState } from "./sonarts/sonarts-core/src/se/programStates";
import { SymbolicValueType } from "./sonarts/sonarts-core/src/se/symbolicValues";
import { isTruthy, Constraint, isFalsy, ConstraintKind, isExecuted } from "./sonarts/sonarts-core/src/se/constraints";
import { SymbolTableBuilder } from "./sonarts/sonarts-core/src/symbols/builder";
import { SymbolTable, UsageFlag, Usage } from "./sonarts/sonarts-core/src/symbols/table";
import { firstLocalAncestor, FUNCTION_LIKE } from "./sonarts/sonarts-core/src/utils/navigation";
import { TypedSonarRuleVisitor } from "./sonarts/sonarts-core/src/utils/sonarAnalysis";
import { isArrowFunction, isBlock, isIdentifier, isPropertyAccessExpression, isFunctionDeclaration, isFunctionLikeDeclaration, isCallExpression } from "./sonarts/sonarts-core/src/utils/nodes";
import { TreeVisitor } from "./sonarts/sonarts-core/src/utils/visitor";
import { InterProcedural } from "./sonarts/sonarts-core/src/se/stateTransitions";


const { compilerOptions } = require("../tsconfig.json");

// From SonarTS
function getStatements(functionLike: ts.FunctionLikeDeclaration): ts.Statement[] {
    if (isArrowFunction(functionLike)) {
        // `body` can be a block or an expression
        if (isBlock(functionLike.body)) {
            return Array.from(functionLike.body.statements);
        }
    } else {
        return (functionLike.body && Array.from(functionLike.body.statements))!;
    }
    return (undefined)!;
}

class FunctionCallFinder extends TreeVisitor {
    private result: ts.CallExpression | null = null;
    private line: number = -1;
    constructor(private src: ts.SourceFile) {
        super();
    }
    protected visitCallExpression(node: ts.CallExpression) {
        nope: if (isPropertyAccessExpression(node.expression)) {

            const methodName = node.expression.name.getText();
            if (methodName !== "mustHaveExecuted") {
                break nope;
            }
            //const line = this.src.getLineAndCharacterOfPosition(node.expression.getStart()).line + 1;
            //if (this.line - line < 2) {
            this.result = node;
            // Line numbers don't work, fuck it
            //    return;
            //}
        }
        super.visitCallExpression(node);
    }
    public find(line: number): ts.FunctionLikeDeclaration | null {
        this.line = line;
        this.result = null;
        this.visit(this.src);
        return this.result as any;
    }
}

declare global {
    interface Function {
        mustHaveExecuted(): boolean;
    }
}


const results: any = {}
const programs: any = {};

function symbolicAnalysis(fileName: string, enclosingFunc: ts.FunctionLikeDeclaration): ExecutionResult {
    const [prog, src, symbols] = programs[fileName];
    const stmts = getStatements(enclosingFunc);
    const cfg = buildCFG(stmts)!;
    const ps = createInitialState(enclosingFunc, prog);

    const result = symExec(cfg, symbols, ps, () => true, interproceduralExecutionCheck(fileName));
    return result!;
}

const analyzedProcedures = new Map<ts.FunctionLikeDeclaration, InterProcedural>();

function analyzeFunctionDeclaration(fileName: string, func: ts.FunctionLikeDeclaration): InterProcedural {
    const [prog, , symbols]: [ts.Program, ts.SourceFile, SymbolTable] = programs[fileName];
    const stmts = getStatements(func);
    const cfg = buildCFG(stmts)!;
    const ps = createInitialState(func, prog);

    const result = symExec(cfg, symbols, ps, () => true, interproceduralExecutionCheck(fileName))!;

    const answers = (new Array(func.parameters.length)).fill(true);
    const pss = result.programNodes.get(cfg.end) || [];
    func.parameters.forEach((param, i) => {
        const symbol = (param as any).symbol;
        answers[i] = answers[i] && alwaysExecuted(pss, symbol);
    });

    const closure = symbols.getSymbols()
        .filter(symbol => alwaysExecuted(pss, symbol));


    return { parameters: answers, closure };
}

function interproceduralExecutionCheck(fileName: string, ) {
    const [prog, src, symbols] = programs[fileName];
    function check(callExpression: ts.CallExpression): InterProcedural {
        const usage = symbols.getUsage(callExpression.expression);
        if (usage && usage.symbol.declarations.length > 0) {
            const declaration = usage.symbol.declarations[0];
            if (isFunctionLikeDeclaration(declaration)) {
                if (analyzedProcedures.has(declaration)) {
                    return analyzedProcedures.get(declaration)!;
                } else {
                    const result = analyzeFunctionDeclaration(fileName, declaration);
                    analyzedProcedures.set(declaration, result);
                    return result;
                }
            }
        }
        return InterProcedural.Default;
    }
    return check;
}


function alwaysExecuted(pss: ProgramState[], func: ts.Symbol) {
    return pss.every(ps => isExecuted(ps.getConstraints(ps.sv(func)!)));
}

function getTargetFunctionSymbol(callSite: ts.Node, symbols: SymbolTable): ts.Symbol {
    const kinder = ts.SyntaxKind;
    const k = kinder[callSite.kind];
    let id: ts.Identifier;
    if (isCallExpression(callSite)) {
        if (isPropertyAccessExpression(callSite.expression)) {
            if (isPropertyAccessExpression(callSite.expression.expression)) {
                id = callSite.expression.expression.name;
            } else if (isIdentifier(callSite.expression.expression)) {
                id = callSite.expression.expression;
            } else {
                throw "up";
            }
        } else {
            throw "up";
        }
    } else {
        throw "up";
    }
    const targetFuncSymbol = symbols.getUsage(id)!.symbol;
    return targetFuncSymbol;
}

Function.prototype.mustHaveExecuted = function (): boolean {
    const err = new Error();
    const trace = stackTrace.parse(err)[1];
    const fileName = trace.getFileName().replace(/\.js$/, ".ts");
    const funcName = trace.getFunctionName();
    const lineNumber = trace.getLineNumber();
    const prog = ts.createProgram([fileName], compilerOptions);
    const src = prog.getSourceFile(fileName)!;


    const symbols = SymbolTableBuilder.build(src, prog);
    programs[fileName] = [prog, src, symbols];
    const key = fileName + funcName;
    let result;

    const callFinder = new FunctionCallFinder(src);
    const callSite = callFinder.find(lineNumber)!;
    const enclosingFunc = firstLocalAncestor(callSite, ...FUNCTION_LIKE)!;
    if (isFunctionLikeDeclaration(enclosingFunc)) {
        if (key in results) {
            result = results[key];
        } else {
            result = results[key] = symbolicAnalysis(fileName, enclosingFunc);
        }
    } else {
        throw "up";
    }
    let foo: ts.Identifier;

    const targetFuncSymbol = getTargetFunctionSymbol(callSite, symbols);


    const ps = result.programNodes.get(callSite);

    return alwaysExecuted(result.programNodes.get(callSite), targetFuncSymbol);

}
