import { describe, expect, it } from "vitest";
import { Scanner, TokenTypes, Token } from "../src";

interface ExpectToken {
  type: TokenTypes;
  content: string;
}

function compareToken(token: Token, expectToken: ExpectToken): boolean {
  if (
    token.type === expectToken.type &&
    token.content === expectToken.content
  ) {
    return true;
  }
  return false;
}

describe("Scanner", () => {
  it("should return desire tokens", () => {
    const text: string = `
    TYPE Prop Set
    TERM Prop imp(Prop p0, Prop p1) { (p0 -> p1) }
    TERM Prop forall(Set s0, Prop p0) { (∀ s0, p0) }
/*
* This is block comment.
*/
    AXIOM ax-5(Set s0, Prop p0) {
      #diff s0 p0 // line comment
      |- imp(p0, forall(s0, p0))
    }
  `;
    const scanner = new Scanner();
    const tokens = scanner.scan(text);
    tokens.forEach((t) => {
      console.log(t.toString());
    });

    const expectTokens: ExpectToken[] = [
      { type: TokenTypes.KEY, content: "TYPE" },
      { type: TokenTypes.WORD, content: "Prop" },
      { type: TokenTypes.WORD, content: "Set" },

      { type: TokenTypes.KEY, content: "TERM" },
      { type: TokenTypes.WORD, content: "Prop" },
      { type: TokenTypes.WORD, content: "imp" },
      { type: TokenTypes.SEP, content: "(" },
      { type: TokenTypes.WORD, content: "Prop" },
      { type: TokenTypes.WORD, content: "p0" },
      { type: TokenTypes.SEP, content: "," },
      { type: TokenTypes.WORD, content: "Prop" },
      { type: TokenTypes.WORD, content: "p1" },
      { type: TokenTypes.SEP, content: ")" },
      { type: TokenTypes.SEP, content: "{" },
      { type: TokenTypes.SEP, content: "(" },
      { type: TokenTypes.WORD, content: "p0" },
      { type: TokenTypes.WORD, content: "->" },
      { type: TokenTypes.WORD, content: "p1" },
      { type: TokenTypes.SEP, content: ")" },
      { type: TokenTypes.SEP, content: "}" },

      { type: TokenTypes.KEY, content: "TERM" },
      { type: TokenTypes.WORD, content: "Prop" },
      { type: TokenTypes.WORD, content: "forall" },
      { type: TokenTypes.SEP, content: "(" },
      { type: TokenTypes.WORD, content: "Set" },
      { type: TokenTypes.WORD, content: "s0" },
      { type: TokenTypes.SEP, content: "," },
      { type: TokenTypes.WORD, content: "Prop" },
      { type: TokenTypes.WORD, content: "p0" },
      { type: TokenTypes.SEP, content: ")" },
      { type: TokenTypes.SEP, content: "{" },
      { type: TokenTypes.SEP, content: "(" },
      { type: TokenTypes.WORD, content: "∀" },
      { type: TokenTypes.WORD, content: "s0" },
      { type: TokenTypes.SEP, content: "," },
      { type: TokenTypes.WORD, content: "p0" },
      { type: TokenTypes.SEP, content: ")" },
      { type: TokenTypes.SEP, content: "}" },

      { type: TokenTypes.COMMENT, content: "/*\n* This is block comment.\n*/"},

      { type: TokenTypes.KEY, content: "AXIOM" },
      { type: TokenTypes.WORD, content: "ax-5" },
      { type: TokenTypes.SEP, content: "(" },
      { type: TokenTypes.WORD, content: "Set" },
      { type: TokenTypes.WORD, content: "s0" },
      { type: TokenTypes.SEP, content: "," },
      { type: TokenTypes.WORD, content: "Prop" },
      { type: TokenTypes.WORD, content: "p0" },
      { type: TokenTypes.SEP, content: ")" },

      { type: TokenTypes.SEP, content: "{" },
      { type: TokenTypes.KEY, content: "#diff" },
      { type: TokenTypes.WORD, content: "s0" },
      { type: TokenTypes.WORD, content: "p0" },

      { type: TokenTypes.COMMENT, content: "// line comment" },
      { type: TokenTypes.KEY, content: "|-" },
      { type: TokenTypes.WORD, content: "imp" },
      { type: TokenTypes.SEP, content: "(" },
      { type: TokenTypes.WORD, content: "p0" },
      { type: TokenTypes.SEP, content: "," },
      { type: TokenTypes.WORD, content: "forall" },
      { type: TokenTypes.SEP, content: "(" },
      { type: TokenTypes.WORD, content: "s0" },
      { type: TokenTypes.SEP, content: "," },
      { type: TokenTypes.WORD, content: "p0" },
      { type: TokenTypes.SEP, content: ")" },
      { type: TokenTypes.SEP, content: ")" },
      { type: TokenTypes.SEP, content: "}" },
    ];
    expect(tokens.length).toBe(expectTokens.length);

    for (let i = 0; i < tokens.length; i++) {
      expect(compareToken(tokens[i], expectTokens[i])).toBe(true);
    }
  });
});
