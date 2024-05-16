import { describe, expect, it } from "vitest";
import { Parser, Scanner, astnodeToString } from "../src";

describe("Parser", () => {
  it("#1 Type Block", () => {
    const text = "TYPE Prop ZFSet Class";
    const scanner = new Scanner();
    const parser = new Parser();
    const tokens = scanner.scan(text);
    const astNodes = parser.parse(tokens);
    astNodes.forEach((t) => {
      console.log(astnodeToString(t));
    });
    expect(astNodes.length).toBe(1);
    expect(parser.unknownTokens.length).toBe(0);
    expect(parser.commentTokens.length).toBe(0);
    expect(parser.errors.length).toBe(0);
  });
  it("#2 Term Block", () => {
    const text = "TERM Prop imply(Prop p1, Prop p2) { p1 -> p2 } TERM Prop true() {T}";
    const scanner = new Scanner();
    const parser = new Parser();
    const tokens = scanner.scan(text);
    const astNodes = parser.parse(tokens);
    astNodes.forEach((t) => {
      console.log(astnodeToString(t));
    });
    expect(astNodes.length).toBe(2);
    expect(parser.unknownTokens.length).toBe(0);
    expect(parser.commentTokens.length).toBe(0);
    expect(parser.errors.length).toBe(0);
  });
  it("#3 Axiom Block", () => {
    const text = `AXIOM ax-1(Prop p1, Prop p2) { |- imply(p1, imply(p2, p1))}
    AXIOM ax-mp(Prop p1, Prop p2) { #diff p1 p2 -| p1 imply(p1, p2) |- p2}
    `;
    const scanner = new Scanner();
    const parser = new Parser();
    const tokens = scanner.scan(text);
    const astNodes = parser.parse(tokens);
    astNodes.forEach((t) => {
      console.log(astnodeToString(t));
    });
    expect(astNodes.length).toBe(2);
    expect(parser.unknownTokens.length).toBe(0);
    expect(parser.commentTokens.length).toBe(0);
    expect(parser.errors.length).toBe(0);
  });
  it("#4 Thm Block", () => {
    const text = `THM a1i(Prop p1, Prop p2) { #diff p1 p2 -| p1 |- imply(p2, p1) } = {ax-mp(p1, imply(p1, p2)) ax-1(p1, p2)}`;
    const scanner = new Scanner();
    const parser = new Parser();
    const tokens = scanner.scan(text);
    const astNodes = parser.parse(tokens);
    astNodes.forEach((t) => {
      console.log(astnodeToString(t));
    });
    expect(astNodes.length).toBe(1);
    expect(parser.unknownTokens.length).toBe(0);
    expect(parser.commentTokens.length).toBe(0);
    expect(parser.errors.length).toBe(0);
  });
});
