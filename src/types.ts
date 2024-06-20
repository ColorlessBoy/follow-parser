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
  TYPE = 'type',
  TERM = 'term',
  AXIOM = 'axiom',
  THM = 'thm',
  TARGET = '|-',
  ASSUME = '-|',
  DIFF = 'diff',
}

export enum TokenTypes {
  KEY,
  WORD,
  COMMENT,
  SEP,
  IGNORE,

  TYPENAME,
  ARGNAME,
  TERMNAME,
  CONSTNAME,
  AXIOMNAME,
  THMNAME,
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
      return 'type ' + typeNode.types.map((e) => e.content).join(' ');
    case NodeTypes.TERM:
      const termNode = node as TermASTNode;
      let s1 =
        'term ' +
        termNode.type.content +
        ' ' +
        termNode.name.content +
        '(' +
        termNode.params.map((e) => e.type.content + ' ' + e.name.content).join(', ') +
        ')';
      if (termNode.content.length > 0) {
        s1 += ' {' + termNode.content.map((e) => e.content).join(' ') + '}';
      }
      return s1;
    case NodeTypes.AXIOM:
      const axiomNode = node as AxiomASTNode;
      let s2 =
        'axiom ' +
        axiomNode.name.content +
        '(' +
        axiomNode.params.map((e) => e.type.content + ' ' + e.name.content).join(', ') +
        ')' +
        '{';
      if (axiomNode.diffs.length > 0) {
        s2 += '\n' + axiomNode.diffs.map((e) => '  diff ' + e.map((t) => t.content).join(' ')).join('\n');
      }
      if (axiomNode.assumptions.length > 0) {
        s2 += '\n' + axiomNode.assumptions.map((e) => '  -| ' + opAstNodeToString(e)).join('\n');
      }
      s2 += '\n' + axiomNode.targets.map((e) => '  |- ' + opAstNodeToString(e)).join('\n') + '\n}';
      return s2;
    case NodeTypes.THM:
      const thmNode = node as ThmASTNode;
      let s3 =
        'thm ' +
        thmNode.name.content +
        '(' +
        thmNode.params.map((e) => e.type.content + ' ' + e.name.content).join(', ') +
        ')' +
        '{';
      if (thmNode.diffs.length > 0) {
        s3 += '\n' + thmNode.diffs.map((e) => '  diff ' + e.map((t) => t.content).join(' ')).join('\n');
      }
      if (thmNode.assumptions.length > 0) {
        s3 += '\n' + thmNode.assumptions.map((e) => '  -| ' + opAstNodeToString(e)).join('\n');
      }
      s3 += '\n' + thmNode.targets.map((e) => '  |- ' + opAstNodeToString(e)).join('\n') + '\n}' + ' = {\n';
      s3 += thmNode.proof.map((e) => '  ' + opAstNodeToString(e)).join('\n') + '\n}';
      return s3;
    default:
      return '';
  }
}

function opAstNodeToString(opNode: OpAstNode) {
  let s = opNode.root.content;
  if (opNode.children.length > 0) {
    s += '(' + opNode.children.map((e) => opAstNodeToString(e)).join(', ') + ')';
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
  SingleDiff,
  DiffNotWord,
  TargetMissing,
  ProofEqMissing,
  // ProofEmpty, empty proof 继续进入compile阶段，被当成axiom
  // compile error
  DupDefType,
  TypeDefMissing,
  NotType,
  DupName,
  DupArgName,
  DiffIsKeyword,
  DiffIsNotArg,
  TermDefMissing,
  TooManyArg,
  TooLessArg,
  ArgTypeError,
  AxiomThmDefMissing,
  ProofDiffError,
  ProofOpUseless,
  ThmWithoutValidProof,
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
  astNode: Node;
}

export type CompilerNode = TypeCNode | TermCNode | AxiomCNode | ThmCNode;

export interface TypeCNode extends CNode {
  cnodetype: CNodeTypes.TYPE;
  astNode: TypeASTNode;
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
  diffArray: string[][];
  diffMap: Map<string, Set<string>>;
}

export interface ThmCNode extends CNode {
  cnodetype: CNodeTypes.THM;
  astNode: ThmASTNode;
  targets: TermOpCNode[];
  assumptions: TermOpCNode[];
  diffArray: string[][];
  diffMap: Map<string, Set<string>>;
  proofs: ProofOpCNode[];
  proofProcess: TermOpCNode[][];
  isValid: Boolean;
  suggestions: Map<string, TermOpCNode>[][];
}

export interface TermOpCNode {
  root: Token;
  children: TermOpCNode[];
  range: Range;
  definition: TermCNode | ParamPair;
  type: string;
  termContent: string;
  funContent: string;
  virtual?: boolean;
}

export interface ProofOpCNode {
  root: Token;
  children: TermOpCNode[];
  range: Range;
  definition: CNode;
  targets: TermOpCNode[];
  assumptions: TermOpCNode[];
  diffs: Map<string, Set<string>>;
  useVirtual: boolean;
  diffError?: string[];
}

export const CONTENT_FILE = 'content.follow.json';

export function getFollowErrorMsg(errorType: ErrorTypes): string {
  switch (errorType) {
    case ErrorTypes.TypeMissing:
      return "TypeMissing";
    case ErrorTypes.NameMissing:
      return "NameMissing";
    case ErrorTypes.LeftParenMissing:
      return "LeftParenMissing";
    case ErrorTypes.RightParenMissing:
      return "RightParenMissing";
    case ErrorTypes.ParamTypeMissing:
      return "ParamTypeMissing";
    case ErrorTypes.ParamNameMissing:
      return "ParamNameMissing";
    case ErrorTypes.ParamCommaMissing:
      return "ParamCommaMissing";
    case ErrorTypes.LeftBraceMissing:
      return "LeftBraceMissing";
    case ErrorTypes.RightBraceMissing:
      return "RightBraceMissing";
    case ErrorTypes.BodyKeywordMissing:
      return "BodyKeywordMissing";
    case ErrorTypes.OpAstRootMissing:
      return "OpAstRootMissing";
    case ErrorTypes.EmptyBodyStmt:
      return "EmptyBodyStmt";
    case ErrorTypes.DupDiff:
      return "DupDiff";
    case ErrorTypes.SingleDiff:
      return "SingleDiff";
    case ErrorTypes.DiffNotWord:
      return "DiffNotWord";
    case ErrorTypes.TargetMissing:
      return "TargetMissing";
    case ErrorTypes.ProofEqMissing:
      return "ProofEqMissing";
    case ErrorTypes.DupDefType:
      return "DupDefType";
    case ErrorTypes.TypeDefMissing:
      return "TypeDefMissing";
    case ErrorTypes.NotType:
      return "NotType";
    case ErrorTypes.DupName:
      return "DupName";
    case ErrorTypes.DupArgName:
      return "DupArgName";
    case ErrorTypes.DiffIsKeyword:
      return "DiffIsKeyword";
    case ErrorTypes.DiffIsNotArg:
      return "DiffIsNotArg";
    case ErrorTypes.TermDefMissing:
      return "TermDefMissing";
    case ErrorTypes.TooManyArg:
      return "TooManyArg";
    case ErrorTypes.TooLessArg:
      return "TooLessArg";
    case ErrorTypes.ArgTypeError:
      return "ArgTypeError";
    case ErrorTypes.AxiomThmDefMissing:
      return "AxiomThmDefMissing";
    case ErrorTypes.ProofDiffError:
      return "ProofDiffError";
    case ErrorTypes.ProofOpUseless:
      return "ProofOpUseless";
    case ErrorTypes.ThmWithoutValidProof:
      return "ThmWithoutValidProof";
  }
  return "";
}
