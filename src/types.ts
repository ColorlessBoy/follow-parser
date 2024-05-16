export interface Position {
  /**
   * Line position in a document (zero-based).
   *
   * If a line number is greater than the number of lines in a document, it defaults back to the number of lines in the document.
   * If a line number is negative, it defaults to 0.
   */
  line: number;
  /**
   * Character offset on a line in a document (zero-based).
   *
   * The meaning of this offset is determined by the negotiated
   * `PositionEncodingKind`.
   *
   * If the character value is greater than the line length it defaults back to the
   * line length.
   */
  character: number;
}
export interface Range {
  /**
   * The range's start position.
   */
  start: Position;
  /**
   * The range's end position.
   */
  end: Position;
}

export enum Keywords {
  TYPE = "TYPE",
  TERM = "TERM",
  AXIOM = "AXIOM",
  THM = "THM",
  TARGET = "|-",
  ASSUME = "-|",
  DIFF = "#diff",
}

export enum TokenTypes {
  KEY,
  WORD,
  COMMENT,
  SEP,
}

export interface Token {
  type: TokenTypes;
  content: string;
  range: Range;
}

export enum NodeTypes {
  TYPE,
  TERM,
  AXIOM,
  THM,
}

export type ASTNode = TypeASTNode | TermASTNode | AxiomASTNode | ThmASTNode;

export function astnodeToString(node: Node): string {
  switch (node.nodetype) {
    case NodeTypes.TYPE:
      const typeNode = node as TypeASTNode;
      return "TYPE " + typeNode.types.map((e) => e.content).join(" ");
    case NodeTypes.TERM:
      const termNode = node as TermASTNode;
      let s1 =
        "TERM " +
        termNode.type.content +
        " " +
        termNode.name.content +
        "(" +
        termNode.params
          .map((e) => e.type.content + " " + e.name.content)
          .join(", ") +
        ")";
      if (termNode.content.length > 0) {
        s1 += " {" + termNode.content.map((e) => e.content).join(" ") + "}";
      }
      return s1;
    case NodeTypes.AXIOM:
      const axiomNode = node as AxiomASTNode;
      let s2 =
        "AXIOM " +
        axiomNode.name.content +
        "(" +
        axiomNode.params
          .map((e) => e.type.content + " " + e.name.content)
          .join(", ") +
        ")" +
        "{";
      if (axiomNode.diffs.length > 0) {
        s2 +=
          "\n" +
          axiomNode.diffs
            .map((e) => "  #diff " + e.map((t) => t.content).join(" "))
            .join("\n");
      }
      if (axiomNode.assumptions.length > 0) {
        s2 +=
          "\n" +
          axiomNode.assumptions
            .map((e) => "  -| " + opAstNodeToString(e))
            .join("\n");
      }
      s2 +=
        "\n" +
        axiomNode.targets
          .map((e) => "  |- " + opAstNodeToString(e))
          .join("\n") +
        "\n}";
      return s2;
    case NodeTypes.THM:
      const thmNode = node as ThmASTNode;
      let s3 =
        "THM " +
        thmNode.name.content +
        "(" +
        thmNode.params
          .map((e) => e.type.content + " " + e.name.content)
          .join(", ") +
        ")" +
        "{";
      if (thmNode.diffs.length > 0) {
        s3 +=
          "\n" +
          thmNode.diffs
            .map((e) => "  #diff " + e.map((t) => t.content).join(" "))
            .join("\n");
      }
      if (thmNode.assumptions.length > 0) {
        s3 +=
          "\n" +
          thmNode.assumptions
            .map((e) => "  -| " + opAstNodeToString(e))
            .join("\n");
      }
      s3 +=
        "\n" +
        thmNode.targets.map((e) => "  |- " + opAstNodeToString(e)).join("\n") +
        "\n}" +
        " = {\n";
      s3 +=
        thmNode.proof.map((e) => "  " + opAstNodeToString(e)).join("\n") +
        "\n}";
      return s3;
    default:
      return "";
  }
}

function opAstNodeToString(opNode: OpAstNode) {
  let s = opNode.root.content;
  if (opNode.children.length > 0) {
    s +=
      "(" + opNode.children.map((e) => opAstNodeToString(e)).join(", ") + ")";
  }
  return s;
}

export interface Node {
  nodetype: NodeTypes;
  range: Range;
  keyword: Token;
}

export interface TypeASTNode extends Node {
  nodetype: NodeTypes.TYPE;
  types: Token[];
}
export interface TermASTNode extends Node {
  nodetype: NodeTypes.TERM;
  type: Token;
  name: Token;
  params: ParamPair[];
  content: Token[];
}
export interface AxiomASTNode extends Node {
  nodetype: NodeTypes.AXIOM;
  name: Token;
  params: ParamPair[];
  targets: OpAstNode[];
  assumptions: OpAstNode[];
  diffs: Token[][];
}
export interface ThmASTNode extends Node {
  nodetype: NodeTypes.THM;
  name: Token;
  params: ParamPair[];
  targets: OpAstNode[];
  assumptions: OpAstNode[];
  proof: OpAstNode[];
  diffs: Token[][];
}
export interface ParamPair {
  type: Token;
  name: Token;
}
export interface OpAstNode {
  root: Token;
  children: OpAstNode[];
  range: Range;
}

export enum ErrorTypes {
  // parse error
  TypeMissing,
  NameMissing,
  LeftParenMissing,
  RightParenMissing,
  ParamTypeMissing,
  ParamNameMissing,
  ParamCommaMissing,
  LeftBraceMissing,
  RightBraceMissing,
  BodyKeywordMissing,
  OpAstRootMissing,
  EmptyBodyStmt,
  DupDiff,
  DiffNotWord,
  TargetMissing,
  ProofEqMissing,
  ProofEmpty,
  // compile error
  DupDefType,
  TypeDefMissing,
  NotType,
  DupName,
  DupArgName,
  DiffIsKeyword,
  TermDefMissing,
  TooManyArg,
  TooLessArg,
  ArgTypeError,
  AxiomThmDefMissing,
}

export interface Error {
  type: ErrorTypes;
  token: Token;
}

export enum CNodeTypes {
  TYPE,
  TERM,
  AXIOM,
  THM,
}
export interface CNode {
  cnodetype: CNodeTypes;
}

export type CompilerNode = TypeCNode | TermCNode | AxiomCNode | ThmCNode;

export interface TypeCNode extends CNode {
  cnodetype: CNodeTypes.TYPE;
  type: Token;
}

export interface TermCNode extends CNode {
  cnodetype: CNodeTypes.TERM;
  astNode: TermASTNode;
  content: (string | number)[];
}

export interface AxiomCNode extends CNode {
  cnodetype: CNodeTypes.AXIOM;
  astNode: AxiomASTNode;
  targets: TermOpCNode[];
  assumptions: TermOpCNode[];
  diffs: string[][];
}

export interface ThmCNode extends CNode {
  cnodetype: CNodeTypes.THM;
  astNode: ThmASTNode;
  targets: TermOpCNode[];
  assumptions: TermOpCNode[];
  diffs: string[][];
  proofs: ProofOpCNode[];
}

export interface TermOpCNode {
  root: Token;
  children: TermOpCNode[];
  range: Range;
  definition: TermCNode | ParamPair;
  type: string;
  content: string;
}

export interface ProofOpCNode {
  root: Token;
  children: TermOpCNode[];
  range: Range;
  definition: CNode;
  targets: TermOpCNode[];
  assumptions: TermOpCNode[];
  diffs: Set<string>[][];
}
