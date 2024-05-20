import { describe, expect, it } from "vitest";
import { Parser, Scanner, Compiler, ThmASTNode, ThmCNode } from "../src";

describe("Compiler", () => {
  it("#1 Type Block", () => {
    const text = "type Prop ZFSet Class";

    const scanner = new Scanner();
    const tokens = scanner.scan(text);

    const parser = new Parser();
    const astNodes = parser.parse(tokens);

    const compiler = new Compiler();
    compiler.compile(astNodes);
    expect(compiler.cNodeList.length).toBe(3);
    expect(compiler.errors.length).toBe(0);
  });
  it("#2 Term Block", () => {
    const text = `
      type Prop
      term Prop imply(Prop p1, Prop p2) {(p1 -> p2)}
    `;

    const scanner = new Scanner();
    const tokens = scanner.scan(text);

    const parser = new Parser();
    const astNodes = parser.parse(tokens);

    const compiler = new Compiler();
    compiler.compile(astNodes);
    expect(compiler.cNodeList.length).toBe(2);
    expect(compiler.errors.length).toBe(0);
  });
  it("#3 Axiom Block", () => {
    const text = `
      type Prop Set
      term Prop imp(Prop p0, Prop p1) { (p0 -> p1) }
      term Prop forall(Set s0, Prop p0) { (∀ s0, p0) }
      axiom ax-5(Set s0, Prop p0) {
        diff s0 p0
        |- imp(p0, forall(s0, p0))
      }
    `;

    const scanner = new Scanner();
    const tokens = scanner.scan(text);

    const parser = new Parser();
    const astNodes = parser.parse(tokens);

    const compiler = new Compiler();
    compiler.compile(astNodes);
    expect(compiler.cNodeList.length).toBe(5);
    expect(compiler.errors.length).toBe(0);
  });
  it("#4 Proof Block", () => {
    const text = `
      type Prop Set
      term Prop imp(Prop p0, Prop p1) { (p0 -> p1) }
      term Prop forall(Set s0, Prop p0) { (∀ s0, p0) }
      axiom ax-mp(Prop p0, Prop p1) {
        |- p0
        -| p1
        -| imp(p1, p0)
      }
      axiom ax-5(Set s0, Prop p0) {
        |- imp(p0, forall(s0, p0))
        diff s0 p0
      }
      thm thm1(Set s1, Prop p1, Prop p2) {
        |- forall(s1, imp(p1, p2))
        -| imp(p1, p2)
        diff s1 p1
        diff s1 p2
      } = {
        ax-mp(forall(s1, imp(p1, p2)), imp(p1, p2))
        ax-5(s1, imp(p1, p2))
      }
    `;

    const scanner = new Scanner();
    const tokens = scanner.scan(text);

    const parser = new Parser();
    const astNodes = parser.parse(tokens);

    const compiler = new Compiler();
    compiler.compile(astNodes);
    expect(compiler.cNodeList.length).toBe(7);
    expect(compiler.errors.length).toBe(0);
  });
  it("#5 Proof Block Suggestion", () => {
    const text = `
      type Prop Set
      term Prop imp(Prop p0, Prop p1) { (p0 -> p1) }
      term Prop forall(Set s0, Prop p0) { (∀ s0, p0) }
      axiom ax-mp(Prop p0, Prop p1) {
        |- p0
        -| p1
        -| imp(p1, p0)
      }
      axiom ax-5(Set s0, Prop p0) {
        |- imp(p0, forall(s0, p0))
        diff s0 p0
      }
      thm thm1(Set s1, Prop p1, Prop p2) {
        |- forall(s1, imp(p1, p2))
        -| imp(p1, p2)
        diff s1 p1
        diff s1 p2
      } = {
        ax-mp
      }
    `;

    const scanner = new Scanner();
    const tokens = scanner.scan(text);

    const parser = new Parser();
    const astNodes = parser.parse(tokens);

    const compiler = new Compiler();
    compiler.compile(astNodes);
    expect(compiler.cNodeList.length).toBe(7);
    expect(compiler.errors.length).toBe(3);
    expect((compiler.cNodeList[6] as ThmCNode).suggestions.length).toBe(1);
    expect((compiler.cNodeList[6] as ThmCNode).suggestions[0].length).toBe(1);
  });
  it("#6 Proof Block Suggestion", () => {
    const text = `
type prop
term prop imp(prop p1, prop p2) {(p1 -> p2)}
axiom ax-2(prop p1, prop p2, prop p3) {
  |- imp(imp(p1, imp(p2, p3)), imp(imp(p1, p2), imp(p1, p3)))
}
axiom ax-mp(prop p1, prop p2) {
  -| p2
  -| imp(p2, p1)
  |- p1
}
thm a2i(prop p1, prop p2, prop p3) {
  |- imp(imp(p1, p2), imp(p1, p3))
  -| imp(p1, imp(p2, p3))
} = {
  ax-mp(imp(imp(p1,p2),imp(p1,p3)), imp(p1, imp(p2, p3)))
  ax-2
}
    `;

    const scanner = new Scanner();
    const tokens = scanner.scan(text);

    const parser = new Parser();
    const astNodes = parser.parse(tokens);

    const compiler = new Compiler();
    compiler.compile(astNodes);
    expect(compiler.cNodeList.length).toBe(5);
    expect(compiler.errors.length).toBe(1);
    expect((compiler.cNodeList[4] as ThmCNode).suggestions.length).toBe(2);
    expect((compiler.cNodeList[4] as ThmCNode).suggestions[1].length).toBe(1);
  });
});
