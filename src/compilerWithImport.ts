import { Parser } from './parser';
import { Scanner } from './scanner';
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
  TokenTypes,
} from './types';

export class CompilerWithImport {
  public cNodeListMap: Map<string, CNode[]> = new Map();
  public cNodeMapMap: Map<string, Map<string, CNode>> = new Map();
  public tokenListMap: Map<string, Token[]> = new Map();
  public errors: Error[] = [];
  public depFileList: string[] = [];
  public currentCNodeList: CNode[] = [];
  public currentCNodeMap: Map<string, CNode> = new Map();
  public currentDeps: string[] = [];
  public currentFile: string = '';
  public setImportList(importList: string[]) {
    this.depFileList = importList;
  }
  public compileCode(filename: string, code: string) {
    const scanner = new Scanner();
    const parser = new Parser();
    const tokens = scanner.scan(code);
    this.tokenListMap.set(filename, tokens);
    const astNode = parser.parse(tokens);
    const cNdoes = this.compile(filename, astNode);
    return {
      cNodes: cNdoes,
      errors: [...parser.errors, ...this.errors],
      tokens: tokens,
    };
  }
  private compile(filename: string, astNode: ASTNode[]): CNode[] {
    const cNodeList: CNode[] = [];
    const cNodeMap: Map<string, CNode> = new Map();
    this.currentCNodeList = cNodeList;
    this.currentCNodeMap = cNodeMap;
    this.currentFile = filename;
    this.cNodeListMap.set(filename, cNodeList);
    this.cNodeMapMap.set(filename, cNodeMap);
    const depIndex = this.depFileList.indexOf(filename);
    if (depIndex >= 0 && depIndex < this.depFileList.length) {
      this.currentDeps = this.depFileList.slice(0, depIndex);
    }
    this.errors = [];
    for (const node of astNode) {
      this.compile0(node);
    }
    return cNodeList;
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
  private pushCurrentCNodeList(cNode: CNode) {
    this.currentCNodeList.push(cNode);
  }
  private setCurrentCNodeMap(key: string, value: CNode) {
    this.currentCNodeMap.set(key, value);
  }
  private compileTypeBlock(node: TypeASTNode) {
    for (const type of node.types) {
      if (this.checkNameDup(type)) {
        const nodetype: CNodeTypes.TYPE = CNodeTypes.TYPE;
        const cnode: TypeCNode = {
          cnodetype: nodetype,
          astNode: node,
          type: type,
        };
        this.pushCurrentCNodeList(cnode);
        this.setCurrentCNodeMap(type.content, cnode);
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
        token.type = TokenTypes.ARGNAME;
        content.push(index);
      } else {
        const last = content.pop();
        if (last === undefined) {
          content.push(token.content);
        } else if (typeof last === 'string') {
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
    this.pushCurrentCNodeList(termCNode);
    this.setCurrentCNodeMap(node.name.content, termCNode);
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
      diffArray: node.diffs.map((e) => e.map((e) => e.content)),
      diffMap: this.getDiffMap(node.diffs),
    };

    this.pushCurrentCNodeList(axiomCNode);
    this.setCurrentCNodeMap(node.name.content, axiomCNode);
  }
  private getDiffMap(diffs: Token[][]): Map<string, Set<string>> {
    const rstMap: Map<string, Set<string>> = new Map();
    for (const diffarray of diffs) {
      for (let i = 0; i < diffarray.length - 1; i++) {
        const si = diffarray[i].content;
        for (let j = i + 1; j < diffarray.length; j++) {
          const sj = diffarray[j].content;
          if (si <= sj) {
            let tmpSet = rstMap.get(si);
            if (tmpSet === undefined) {
              tmpSet = new Set();
              rstMap.set(si, tmpSet);
            }
            tmpSet.add(sj);
          } else {
            let tmpSet = rstMap.get(sj);
            if (tmpSet === undefined) {
              tmpSet = new Set();
              rstMap.set(sj, tmpSet);
            }
            tmpSet.add(si);
          }
        }
      }
    }
    return rstMap;
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
    const diffMap = this.getDiffMap(node.diffs);
    for (const opNode of node.proof) {
      const proofOpCNode = this.compileProofOpNode(opNode, argDefMap, diffMap);
      if (proofOpCNode) {
        proofs.push(proofOpCNode);
      }
    }
    const { processes, suggestions } = this.getProofProcess(targets, proofs, assumptions);
    const thmCNode: ThmCNode = {
      cnodetype: CNodeTypes.THM,
      astNode: node,
      assumptions: assumptions,
      targets: targets,
      diffArray: node.diffs.map((e) => e.map((e) => e.content)),
      diffMap: diffMap,
      proofs: proofs,
      proofProcess: processes,
      isValid: this.checkProofValidation(processes.at(-1)),
      suggestions: suggestions,
    };
    this.pushCurrentCNodeList(thmCNode);
    this.setCurrentCNodeMap(node.name.content, thmCNode);
    if (!thmCNode.isValid) {
      this.errors.push({
        type: ErrorTypes.ThmWithoutValidProof,
        token: node.name,
      });
    }
  }
  private checkProofValidation(targets: TermOpCNode[] | undefined): Boolean {
    if (targets === undefined) {
      return false;
    }
    if (targets.length === 0) {
      return true;
    }
    return false;
  }
  private getProofProcess(targets: TermOpCNode[], proofs: ProofOpCNode[], assumptions: TermOpCNode[]) {
    const processes: TermOpCNode[][] = [];
    const suggestions: Map<string, TermOpCNode>[][] = [];
    const assumptionSet: Set<string> = new Set(assumptions.map((ass) => ass.funContent));
    let currentTarget = [...targets];
    for (const proof of proofs) {
      // check target
      const nextTarget = this.getNextProof0(currentTarget, proof, assumptionSet);
      if (nextTarget === undefined) {
        this.errors.push({
          type: ErrorTypes.ProofOpUseless,
          token: proof.root,
        });
        processes.push(currentTarget);
        suggestions.push(this.getSuggestions(currentTarget, proof));
      } else {
        processes.push(nextTarget);
        currentTarget = nextTarget;
        if (proof.useVirtual) {
          suggestions.push([this.getSuggestion2(proof)]);
        } else {
          suggestions.push([]);
        }
      }
    }
    return { processes, suggestions };
  }
  private checkDiffCondition(
    root: Token,
    targetDiffMap: Map<string, Set<string>>,
    newDiffMap: Map<string, Set<string>>,
    blockArgSet: Set<string>,
  ) {
    if (newDiffMap.size === 0) {
      return [];
    }
    const diffError: string[] = [];
    for (const item of newDiffMap) {
      if (item[1].has(item[0])) {
        this.errors.push({
          type: ErrorTypes.ProofDiffError,
          token: root,
        });
        diffError.push(`(${item[0]},${item[0]})`);
      }
      if (!blockArgSet.has(item[0])) {
        continue;
      }
      const bodyDiff = targetDiffMap.get(item[0]);
      for (const v of item[1]) {
        if (!blockArgSet.has(v)) {
          continue;
        }
        if (bodyDiff === undefined || !bodyDiff.has(v)) {
          this.errors.push({
            type: ErrorTypes.ProofDiffError,
            token: root,
          });
          diffError.push(`(${item[0]},${v})`);
          break;
        }
      }
    }
    return diffError;
  }
  private getSuggestion2(proof: ProofOpCNode): Map<string, TermOpCNode> {
    const suggestions: Map<string, TermOpCNode> = new Map();
    for (const child of proof.children) {
      if (child.virtual === true) {
        suggestions.set(child.root.content, child);
      }
    }
    return suggestions;
  }
  private getSuggestions(targets: TermOpCNode[], proof: ProofOpCNode): Map<string, TermOpCNode>[] {
    const suggestions: Map<string, TermOpCNode>[] = [];
    for (const current of proof.targets) {
      for (const target of targets) {
        const suggestion = this.matchTermOpCNode(current, target);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }
    return suggestions;
  }
  private matchTermOpCNode(current: TermOpCNode, target: TermOpCNode): Map<string, TermOpCNode> | undefined {
    const pairStack: [TermOpCNode, TermOpCNode][] = [[current, target]];
    const suggestArgMap: Map<string, TermOpCNode> = new Map();
    while (pairStack.length > 0) {
      const top = pairStack.shift();
      if (top === undefined) {
        break;
      }
      const cCNode = top[0];
      const tCNode = top[1];
      if (cCNode.virtual === true) {
        const preCNode = suggestArgMap.get(cCNode.root.content);
        if (preCNode && preCNode.funContent !== tCNode.funContent) {
          return undefined;
        }
        suggestArgMap.set(cCNode.root.content, tCNode);
      } else if (cCNode.root.content !== tCNode.root.content) {
        return undefined;
      } else {
        for (let i = 0; i < cCNode.children.length; i++) {
          const nextCCNode = cCNode.children[i];
          const nextTCNode = tCNode.children[i];
          pairStack.push([nextCCNode, nextTCNode]);
        }
      }
    }
    return suggestArgMap;
  }
  private getNextProof0(
    targets: TermOpCNode[],
    proof: ProofOpCNode,
    assumptionSet: Set<string>,
  ): TermOpCNode[] | undefined {
    const proofTargetSet = new Set(proof.targets.map((e) => e.funContent));
    const nextTargets: TermOpCNode[] = [];
    let proofSomething = false;
    for (const target of targets) {
      if (proofTargetSet.has(target.funContent)) {
        proofSomething = true;
      } else {
        if (!assumptionSet.has(target.funContent)) {
          nextTargets.push(target);
        }
      }
    }
    if (!proofSomething) {
      return undefined;
    }
    if (proofSomething) {
      for (const assumption of proof.assumptions) {
        if (!assumptionSet.has(assumption.funContent)) {
          nextTargets.push(assumption);
        }
      }
    }
    return nextTargets;
  }
  private getDefinition(name: string): CNode | undefined {
    let definition = this.currentCNodeMap.get(name);
    if (definition) {
      return definition;
    }
    for (const dep of this.currentDeps) {
      const cNodeMap = this.cNodeMapMap.get(dep);
      if (cNodeMap && cNodeMap.has(name)) {
        return cNodeMap.get(name);
      }
    }
    return undefined;
  }
  private compileProofOpNode(
    opNode: OpAstNode,
    blockArgDefMap: Map<string, ParamPair>,
    targetDiffMap: Map<string, Set<string>>,
  ): ProofOpCNode | undefined {
    const root = opNode.root;
    const definition = this.getDefinition(root.content);
    if (
      definition === undefined ||
      (definition.cnodetype !== CNodeTypes.AXIOM && definition.cnodetype !== CNodeTypes.THM)
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
    }
    if (definition2.cnodetype === CNodeTypes.AXIOM) {
      root.type = TokenTypes.AXIOMNAME;
    } else {
      root.type = TokenTypes.THMNAME;
    }

    const children: (TermOpCNode | undefined)[] = opNode.children.map((c) => this.compileTermOpNode(c, blockArgDefMap));
    const argMap: Map<string, TermOpCNode> = new Map();
    let useVirtual = false;
    for (let idx = 0; idx < wantArgs.length; idx++) {
      const opCNode = children.at(idx);
      const wantArg = wantArgs[idx];
      if (opCNode === undefined || opCNode.type !== wantArg.type.content) {
        if (opCNode && opCNode.type !== wantArg.type.content) {
          this.errors.push({
            type: ErrorTypes.ArgTypeError,
            token: opCNode.root,
          });
        }
        const virtualArg: TermOpCNode = {
          root: wantArg.name,
          children: [],
          range: wantArg.name.range,
          definition: wantArg,
          type: wantArg.type.content,
          termContent: wantArg.name.content,
          funContent: wantArg.name.content,
          virtual: true,
        };
        argMap.set(wantArg.name.content, virtualArg);
        useVirtual = true;
        if (children.length > idx) {
          children[idx] = virtualArg;
        } else {
          children.push(virtualArg);
        }
      } else {
        argMap.set(wantArg.name.content, opCNode);
      }
    }

    const targets = definition2.targets.map((e) => this.replaceTermOpCNode(e, argMap));
    const assumptions = definition2.assumptions.map((e) => this.replaceTermOpCNode(e, argMap));
    const blockArgSet: Set<string> = new Set();
    blockArgDefMap.forEach((pair) => blockArgSet.add(pair.name.content));
    const diffs = this.replaceDiffs(definition2.diffArray, argMap);
    const diffErrors = this.checkDiffCondition(root, targetDiffMap, diffs, blockArgSet);

    const proofOpCNode: ProofOpCNode = {
      root: root,
      children: children as TermOpCNode[],
      range: opNode.range,
      definition: definition2,
      targets: targets,
      assumptions: assumptions,
      diffs: diffs,
      useVirtual: useVirtual,
      diffError: diffErrors || undefined,
    };
    return proofOpCNode;
  }
  private replaceDiffs(diffs: string[][], argMap: Map<string, TermOpCNode>): Map<string, Set<string>> {
    if (diffs.length === 0) {
      return new Map();
    }
    const argVars: Map<string, Set<string>> = new Map();
    argMap.forEach((value, key) => {
      const tmp = this.getLeavesOfTermOpCNode(value);
      if (tmp.size > 0) {
        argVars.set(key, tmp);
      }
    });
    const rst: Set<string>[][] = [];
    for (const diffgroup of diffs) {
      const tmp: Set<string>[] = [];
      for (const v of diffgroup) {
        const s = argVars.get(v);
        if (s) {
          tmp.push(s);
        }
      }
      rst.push(tmp);
    }
    const rstMap: Map<string, Set<string>> = new Map();
    for (const diffArray of rst) {
      for (let i = 0; i < diffArray.length - 1; i++) {
        const seti = diffArray[i];
        for (let j = i + 1; j < diffArray.length; j++) {
          const setj = diffArray[j];
          for (const si of seti) {
            for (const sj of setj) {
              if (si <= sj) {
                let tmpSet = rstMap.get(si);
                if (tmpSet === undefined) {
                  tmpSet = new Set();
                  rstMap.set(si, tmpSet);
                }
                tmpSet.add(sj);
              } else {
                let tmpSet = rstMap.get(sj);
                if (tmpSet === undefined) {
                  tmpSet = new Set();
                  rstMap.set(sj, tmpSet);
                }
                tmpSet.add(si);
              }
            }
          }
        }
      }
    }
    return rstMap;
  }
  private getLeavesOfTermOpCNode(term: TermOpCNode): Set<string> {
    if (term.children.length === 0) {
      // 这里之前有bug，只返回了arg参数
      return new Set([term.termContent]);
    }
    const rst: string[] = [];
    for (const child of term.children) {
      rst.push(...this.getLeavesOfTermOpCNode(child));
    }
    return new Set(rst);
  }
  private replaceTermOpCNode(cNode: TermOpCNode, argMap: Map<string, TermOpCNode>): TermOpCNode {
    const root = cNode.root;
    const definition = cNode.definition;

    const termOpCNode = argMap.get(root.content);
    if (termOpCNode) {
      // argument
      return termOpCNode;
    }
    const children = cNode.children.map((e) => this.replaceTermOpCNode(e, argMap));
    const definition2 = definition as TermCNode;
    const opCNode: TermOpCNode = {
      root: root,
      children: children as TermOpCNode[],
      range: cNode.range,
      definition: definition2,
      type: cNode.type,
      termContent: this.getTermContent(definition2, children),
      funContent: this.getFunContent(definition2, children),
    };
    return opCNode;
  }
  private compileTermOpNode(opNode: OpAstNode, argDefMap: Map<string, ParamPair>): TermOpCNode | undefined {
    const root = opNode.root;
    // arg
    const argDef = argDefMap.get(root.content);
    if (argDef !== undefined) {
      root.type = TokenTypes.ARGNAME;
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
        termContent: argDef.name.content,
        funContent: argDef.name.content,
      };
      return opCNode;
    }
    // term
    const definition = this.getDefinition(root.content);
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
    if (wantArgs.length === 0) {
      root.type = TokenTypes.CONSTNAME;
    } else {
      root.type = TokenTypes.TERMNAME;
    }
    const children: (TermOpCNode | undefined)[] = opNode.children.map((c) => this.compileTermOpNode(c, argDefMap));
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
      termContent: this.getTermContent(definition2, children as TermOpCNode[]),
      funContent: this.getFunContent(definition2, children as TermOpCNode[]),
    };
    return opCNode;
  }
  private getTermContent(term: TermCNode, children: TermOpCNode[]): string {
    let s: string = '';
    for (let i = 0; i < term.content.length; i++) {
      const word = term.content[i];
      if (typeof word === 'string') {
        s += word;
      } else {
        s += children[word].termContent;
      }
    }
    return s;
  }
  private getFunContent(term: TermCNode, children: TermOpCNode[]): string {
    let s: string = term.astNode.name.content;
    if (children.length > 0) {
      s += '(' + children.map((c) => c.funContent).join(',') + ')';
    }
    return s;
  }
  private checkTypeDef(token: Token): boolean {
    const defToken = this.getDefinition(token.content);
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
    }

    const defToken = this.getDefinition(token.content);
    if (defToken) {
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
