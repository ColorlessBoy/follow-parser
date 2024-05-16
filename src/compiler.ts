import {
  ASTNode,
  AxiomASTNode,
  AxiomCNode,
  CNode,
  CNodeTypes,
  Error,
  ErrorTypes,
  Keywords,
  NodeTypes,
  OpAstNode,
  TermOpCNode,
  ParamPair,
  TermASTNode,
  TermCNode,
  ThmASTNode,
  Token,
  TypeASTNode,
  TypeCNode,
  ProofOpCNode,
  ThmCNode,
} from "./types";

export class Compiler {
  public cNodeList: CNode[] = [];
  public cNodeMap: Map<string, CNode> = new Map();
  public errors: Error[] = [];
  public compile(astNode: ASTNode[]): CNode[] {
    for (const node of astNode) {
      this.compile0(node);
    }
    return this.cNodeList;
  }
  private compile0(node: ASTNode) {
    switch (node.nodetype) {
      case NodeTypes.TYPE:
        this.compileTypeBlock(node);
        return;
      case NodeTypes.TERM:
        this.compileTermBlock(node);
        return;
      case NodeTypes.AXIOM:
        this.compileAxiomBlock(node);
        return;
      case NodeTypes.THM:
        this.compileThmBlock(node);
        return;
    }
  }
  private compileTypeBlock(node: TypeASTNode) {
    for (const type of node.types) {
      if (this.checkNameDup(type)) {
        const nodetype: CNodeTypes.TYPE = CNodeTypes.TYPE;
        const cnode: TypeCNode = {
          cnodetype: nodetype,
          type: type,
        };
        this.cNodeList.push(cnode);
        this.cNodeMap.set(type.content, cnode);
      }
    }
  }
  private compileTermBlock(node: TermASTNode) {
    if (!this.checkTypeDef(node.type)) {
      return;
    }
    if (!this.checkNameDup(node.name)) {
      return;
    }
    if (!this.checkParams(node.params)) {
      return;
    }
    const argIndexMap: Map<string, number> = new Map();
    node.params.forEach((p, idx) => {
      argIndexMap.set(p.name.content, idx);
    });
    const content: (string | number)[] = [];
    for (const token of node.content) {
      const index = argIndexMap.get(token.content);
      if (index !== undefined) {
        content.push(index);
      } else {
        const last = content.pop();
        if (last === undefined) {
          content.push(token.content);
        } else if (typeof last === "string") {
          content.push(last + token.content);
        } else {
          content.push(last, token.content);
        }
      }
    }
    const termCNode: TermCNode = {
      cnodetype: CNodeTypes.TERM,
      astNode: node,
      content: content,
    };
    this.cNodeList.push(termCNode);
    this.cNodeMap.set(node.name.content, termCNode);
  }
  private compileAxiomBlock(node: AxiomASTNode) {
    if (!this.checkNameDup(node.name)) {
      return;
    }
    if (!this.checkParams(node.params)) {
      return;
    }
    const argDefMap: Map<string, ParamPair> = new Map();
    node.params.forEach((p) => {
      argDefMap.set(p.name.content, p);
    });

    const targets: TermOpCNode[] = [];
    for (const t of node.targets) {
      const ct = this.compileTermOpNode(t, argDefMap);
      if (ct === undefined) {
        // Parsing opNode failed.
        return;
      } else {
        targets.push(ct);
      }
    }
    const assumptions: TermOpCNode[] = [];
    for (const a of node.assumptions) {
      const ca = this.compileTermOpNode(a, argDefMap);
      if (ca === undefined) {
        // Parsing opNode failed.
        return;
      } else {
        assumptions.push(ca);
      }
    }
    const axiomCNode: AxiomCNode = {
      cnodetype: CNodeTypes.AXIOM,
      astNode: node,
      targets: targets,
      assumptions: assumptions,
      diffs: node.diffs.map((e) => e.map((e) => e.content)),
    };
    this.cNodeList.push(axiomCNode);
    this.cNodeMap.set(axiomCNode.astNode.name.content, axiomCNode);
  }
  private compileThmBlock(node: ThmASTNode) {
    if (!this.checkNameDup(node.name)) {
      return;
    }
    if (!this.checkParams(node.params)) {
      return;
    }
    const argDefMap: Map<string, ParamPair> = new Map();
    node.params.forEach((p) => {
      argDefMap.set(p.name.content, p);
    });

    const targets: TermOpCNode[] = [];
    for (const t of node.targets) {
      const ct = this.compileTermOpNode(t, argDefMap);
      if (ct === undefined) {
        // Parsing opNode failed.
        return;
      } else {
        targets.push(ct);
      }
    }
    const assumptions: TermOpCNode[] = [];
    for (const a of node.assumptions) {
      const ca = this.compileTermOpNode(a, argDefMap);
      if (ca === undefined) {
        // Parsing opNode failed.
        return;
      } else {
        assumptions.push(ca);
      }
    }

    const proofs: ProofOpCNode[] = [];
    for (const opNode of node.proof) {
      const proofOpCnNode = this.compileProofOpNode(opNode, argDefMap);
      if (proofOpCnNode) {
        proofs.push(proofOpCnNode);
      } else {
        // parse proof error
        return;
      }
    }

    const thmCNode: ThmCNode = {
      cnodetype: CNodeTypes.THM,
      astNode: node,
      assumptions: assumptions,
      targets: targets,
      diffs: node.diffs.map((e) => e.map((e) => e.content)),
      proofs: proofs,
    };
    this.cNodeList.push(thmCNode);
    this.cNodeMap.set(node.name.content, thmCNode);
  }
  private compileProofOpNode(
    opNode: OpAstNode,
    argDefMap: Map<string, ParamPair>
  ): ProofOpCNode | undefined {
    const root = opNode.root;
    const definition = this.cNodeMap.get(root.content);
    if (
      definition === undefined ||
      (definition.cnodetype !== CNodeTypes.AXIOM &&
        definition.cnodetype !== CNodeTypes.THM)
    ) {
      this.errors.push({
        type: ErrorTypes.AxiomThmDefMissing,
        token: root,
      });
      return;
    }
    const definition2 = definition as AxiomCNode | ThmCNode;
    const wantArgs = definition2.astNode.params;
    if (wantArgs.length !== opNode.children.length) {
      if (wantArgs.length < opNode.children.length) {
        this.errors.push({
          type: ErrorTypes.TooManyArg,
          token: root,
        });
      } else {
        this.errors.push({
          type: ErrorTypes.TooLessArg,
          token: root,
        });
      }
      return;
    }

    const children: (TermOpCNode | undefined)[] = opNode.children.map((c) =>
      this.compileTermOpNode(c, argDefMap)
    );
    const argMap: Map<string, TermOpCNode> = new Map();
    for (let idx = 0; idx < children.length; idx++) {
      const opCNode = children[idx];
      const wantArg = wantArgs[idx];
      if (opCNode === undefined || wantArg.type.content !== opCNode.type) {
        this.errors.push({
          type: ErrorTypes.ArgTypeError,
          token: root,
        });
        return;
      } else {
        argMap.set(wantArg.name.content, opCNode);
      }
    }

    const targets = definition2.targets.map((e) =>
      this.replaceTermOpCNode(e, argMap)
    );
    const assumptions = definition2.assumptions.map((e) =>
      this.replaceTermOpCNode(e, argMap)
    );
    const diffs = this.replaceDiffs(definition2.diffs, argMap);

    const proofOpCNode: ProofOpCNode = {
      root: root,
      children: children as TermOpCNode[],
      range: opNode.range,
      definition: definition2,
      targets: targets,
      assumptions: assumptions,
      diffs: diffs,
    };
    return proofOpCNode;
  }
  private replaceDiffs(
    diffs: string[][],
    argMap: Map<string, TermOpCNode>
  ): Set<string>[][] {
    const argVars: Map<string, Set<string>> = new Map();
    argMap.forEach((value, key) => {
      argVars.set(key, this.getLeavesOfTermOpCNode(value));
    });
    const rst: Set<string>[][] = [];
    for (const diffgroup of diffs) {
      const tmp: Set<string>[] = [];
      for (const v of diffgroup) {
        const s = argVars.get(v);
        if (s) {
          tmp.push(s);
        } else {
          tmp.push(new Set(v));
        }
      }
      rst.push(tmp);
    }
    return rst;
  }
  private getLeavesOfTermOpCNode(term: TermOpCNode): Set<string> {
    if (term.children.length === 0) {
      return new Set([term.content]);
    }
    const rst: string[] = [];
    for (const child of term.children) {
      rst.push(...this.getLeavesOfTermOpCNode(child));
    }
    return new Set(rst);
  }
  private replaceTermOpCNode(
    cNode: TermOpCNode,
    argMap: Map<string, TermOpCNode>
  ): TermOpCNode {
    const root = cNode.root;
    const definition = cNode.definition;

    const termOpCNode = argMap.get(root.content);
    if (termOpCNode) {
      // argument
      return termOpCNode;
    }
    const children = cNode.children.map((e) =>
      this.replaceTermOpCNode(e, argMap)
    );
    const definition2 = definition as TermCNode;
    const opCNode: TermOpCNode = {
      root: root,
      children: children as TermOpCNode[],
      range: cNode.range,
      definition: definition2,
      type: cNode.type,
      content: this.getTermContent(definition2, children),
    };
    return opCNode;
  }
  private compileTermOpNode(
    opNode: OpAstNode,
    argDefMap: Map<string, ParamPair>
  ): TermOpCNode | undefined {
    const root = opNode.root;
    // arg
    const argDef = argDefMap.get(root.content);
    if (argDef !== undefined) {
      if (opNode.children.length > 0) {
        this.errors.push({
          type: ErrorTypes.TooManyArg,
          token: root,
        });
        return;
      }
      const opCNode: TermOpCNode = {
        root: opNode.root,
        children: [],
        range: opNode.range,
        definition: argDef,
        type: argDef.type.content,
        content: argDef.name.content,
      };
      return opCNode;
    }
    // term
    const definition = this.cNodeMap.get(root.content);
    if (definition === undefined || definition.cnodetype !== CNodeTypes.TERM) {
      this.errors.push({
        type: ErrorTypes.TermDefMissing,
        token: root,
      });
      return undefined;
    }
    const definition2 = definition as TermCNode;
    const wantArgs = definition2.astNode.params;
    if (wantArgs.length !== opNode.children.length) {
      if (wantArgs.length < opNode.children.length) {
        this.errors.push({
          type: ErrorTypes.TooManyArg,
          token: root,
        });
      } else {
        this.errors.push({
          type: ErrorTypes.TooLessArg,
          token: root,
        });
      }
      return;
    }
    const children: (TermOpCNode | undefined)[] = opNode.children.map((c) =>
      this.compileTermOpNode(c, argDefMap)
    );
    for (let idx = 0; idx < children.length; idx++) {
      const opCNode = children[idx];
      const wantArg = wantArgs[idx];
      if (opCNode === undefined || wantArg.type.content !== opCNode.type) {
        this.errors.push({
          type: ErrorTypes.ArgTypeError,
          token: root,
        });
        return;
      }
    }
    const opCNode: TermOpCNode = {
      root: root,
      children: children as TermOpCNode[],
      range: opNode.range,
      definition: definition2,
      type: definition2.astNode.type.content,
      content: this.getTermContent(definition2, children as TermOpCNode[]),
    };
    return opCNode;
  }
  private getTermContent(term: TermCNode, children: TermOpCNode[]) {
    let s: string = "";
    for (let i = 0; i < term.content.length; i++) {
      const word = term.content[i];
      if (typeof word === "string") {
        s += word;
      } else {
        s += children[word].content;
      }
    }
    return s;
  }
  private checkTypeDef(token: Token): boolean {
    const defToken = this.cNodeMap.get(token.content);
    if (defToken === undefined) {
      this.errors.push({
        type: ErrorTypes.TypeDefMissing,
        token: token,
      });
      return false;
    } else if (defToken.cnodetype != CNodeTypes.TYPE) {
      this.errors.push({
        type: ErrorTypes.NotType,
        token: token,
      });
      return false;
    }
    return true;
  }
  private checkNameDup(token: Token): boolean {
    if (Keywords.DIFF === token.content) {
      this.errors.push({
        type: ErrorTypes.DiffIsKeyword,
        token: token,
      });
      return false;
    } else if (this.cNodeMap.has(token.content)) {
      this.errors.push({
        type: ErrorTypes.DupName,
        token: token,
      });
      return false;
    }
    return true;
  }
  private checkParams(params: ParamPair[]): boolean {
    const paramSet: Set<string> = new Set();
    for (const param of params) {
      if (!this.checkTypeDef(param.type)) {
        return false;
      } else if (!this.checkNameDup(param.name)) {
        return false;
      } else if (paramSet.has(param.name.content)) {
        this.errors.push({
          type: ErrorTypes.DupArgName,
          token: param.name,
        });
        return false;
      }
      paramSet.add(param.name.content);
    }
    return true;
  }
}
