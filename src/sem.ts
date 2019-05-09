/**
 * Use symbolic execution
 * Used noGratuitousExpressionsRule.ts for reference
 */

import * as ts from "typescript";


import { execute as symExec } from "./sonarts/sonarts-core/src/se/SymbolicExecution";
import { build as buildCFG } from "./sonarts/sonarts-core/src/cfg/builder";
import { ProgramState, createInitialState } from "./sonarts/sonarts-core/src/se/programStates";
import { SymbolicValueType } from "./sonarts/sonarts-core/src/se/symbolicValues";
import { isTruthy, Constraint, isFalsy, ConstraintKind } from "./sonarts/sonarts-core/src/se/constraints";
import { SymbolTableBuilder } from "./sonarts/sonarts-core/src/symbols/builder";
import { SymbolTable, UsageFlag } from "./sonarts/sonarts-core/src/symbols/table";
import { firstLocalAncestor, FUNCTION_LIKE } from "./sonarts/sonarts-core/src/utils/navigation";
import { TypedSonarRuleVisitor } from "./sonarts/sonarts-core/src/utils/sonarAnalysis";
import { isArrowFunction, isBlock } from "./sonarts/sonarts-core/src/utils/nodes";


const truthy = isTruthy;

class Visitor extends TypedSonarRuleVisitor {
    public constructor(program: ts.Program, private readonly symbols: SymbolTable) {
        super("CEA", program);
    }

    public visitFunctionLikeDeclaration(node: ts.FunctionLikeDeclaration) {
        const statements = Visitor.getStatements(node);
        if (statements) {
            const initialState = createInitialState(node, this.program);
            const shouldTrackSymbol = (symbol: ts.Symbol) => true
            /*this.symbols
                .allUsages(symbol)
                .filter(usage => usage.is(UsageFlag.WRITE))
                .every(usage => firstLocalAncestor(usage.node, ...FUNCTION_LIKE) === node);*/
            this.runForStatements(Array.from(statements), initialState, shouldTrackSymbol);
        }

        super.visitFunctionLikeDeclaration(node);
    }

    private static getStatements(functionLike: ts.FunctionLikeDeclaration) {
        if (isArrowFunction(functionLike)) {
            // `body` can be a block or an expression
            if (isBlock(functionLike.body)) {
                return functionLike.body.statements;
            }
        } else {
            return functionLike.body && functionLike.body.statements;
        }
        return undefined;
    }

    private runForStatements(statements: ts.Statement[], initialState: ProgramState, shouldTrackSymbol: (symbol: ts.Symbol) => boolean) {
        const cfg = buildCFG(statements);
        if (cfg === undefined) {
            console.error("No CFG generated");
            return;
        }
        const result = symExec(cfg, this.symbols, initialState, shouldTrackSymbol);
        if (result === undefined) {
            console.error("Symbolic execution no result");
            return;
        }
        const tyc = SymbolicValueType;
        const cyc = ConstraintKind;
        const lastBlock = cfg.end.predecessors[0].getElements();
        const consoleLog = lastBlock[lastBlock.length - 1];
        const statesAtConsoleLog = result.programNodes.get(consoleLog)!;
        const foo = this.symbols.getSymbols().filter(symbol => symbol.name == "foo")[0];
        for (const state of statesAtConsoleLog) {
            const fooSV = state.sv(foo)!;
            const fooConstraints = state.getConstraints(fooSV);
            debugger;
        }

        result.branchingProgramNodes.forEach((states, branchingProgramPoint) => {
            console.log((branchingProgramPoint as any).text);
            if (Visitor.ifAllProgramStateConstraints(states, truthy)) {
                debugger;
            } else if (Visitor.ifAllProgramStateConstraints(states, isFalsy)) {
                debugger;
            }
            cfg;
        });
    }

    private static ifAllProgramStateConstraints(programStates: ProgramState[], checker: (constraints: Constraint[]) => boolean) {
        return programStates.every(programState => {
            const [sv] = programState.popSV();
            return sv !== undefined && checker(programState.getConstraints(sv));
        });
    }
}

function analyze(sourceFile: ts.SourceFile, program: ts.Program) {
    const symbols = SymbolTableBuilder.build(sourceFile, program);
    const visitor = new Visitor(program, symbols);
    visitor.visit(sourceFile);
}


const { compilerOptions } = require("../tsconfig.json");
compilerOptions.lib = [];

import { resolve } from "path";

const target = resolve(__dirname, "../samples/test.ts");
const prog = ts.createProgram([target], compilerOptions);
const src = prog.getSourceFile(target)!;

analyze(src, prog);
