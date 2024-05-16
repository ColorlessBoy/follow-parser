import { describe, expect, it } from "vitest";
import { Parser, Scanner, Compiler } from "../src";

describe("Compiler", () => {
  it("#1 Type Block", () => {
    const text = "TYPE Prop ZFSet Class";

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
      TYPE Prop
      TERM Prop imply(Prop p1, Prop p2) {(p1 -> p2)}
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
      TYPE Prop Set
      TERM Prop imp(Prop p0, Prop p1) { (p0 -> p1) }
      TERM Prop forall(Set s0, Prop p0) { (∀ s0, p0) }
      AXIOM ax-5(Set s0, Prop p0) {
        #diff s0 p0
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
      TYPE Prop Set
      TERM Prop imp(Prop p0, Prop p1) { (p0 -> p1) }
      TERM Prop forall(Set s0, Prop p0) { (∀ s0, p0) }
      AXIOM ax-mp(Prop p0, Prop p1) {
        -| p0
        |- imp(p0, p1)
      }
      AXIOM ax-5(Set s0, Prop p0) {
        #diff s0 p0
        |- imp(p0, forall(s0, p0))
      }
      THM thm1(Set s1, Prop p1, Prop p2) {
        #diff s1 p1
        #diff s1 p2
        -| imp(p1, p2)
        |- forall(s1, imp(p1, p2))
      } = {
        ax-mp(imp(p1, p2), forall(s1, imp(p1, p2)))
        ax-5(s1, imp(p1, p2))
      }
    `;

    const scanner = new Scanner();
    const tokens = scanner.scan(text);

    const parser = new Parser();
    const astNodes = parser.parse(tokens);

    const compiler = new Compiler();
    compiler.compile(astNodes);
    expect(compiler.cNodeList.length).toBe(6);
    expect(compiler.errors.length).toBe(0);
  });
});
