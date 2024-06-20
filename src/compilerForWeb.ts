import { Compiler } from "./compiler";

type NoteId = string;
type BlockId = string;

export class CompilerForWeb {
  public compilerMap: Map<NoteId, Map<BlockId, Compiler>> = new Map();
  public noteIdList: NoteId[] = [];
  public blockIdListMap: Map<NoteId, BlockId[]> = new Map();
  public setNoteIdList(noteIdList: NoteId[]) {
    this.noteIdList = noteIdList;

  }
  public setBlockIdList(noteId: NoteId, blockIds: BlockId[]) {
    this.blockIdListMap.set(noteId, blockIds);
  }
  public compileCode(noteId: string, blockId: string, code: string) {
    let compiler = this.compilerMap.get(noteId)?.get(blockId);
    if (compiler === undefined) {
      compiler = new Compiler(this.definitionFinderGenerator(noteId, blockId));
      this.compilerMap.get(noteId)?.set(blockId, compiler);
    }
    return compiler.compileCode(code);
  }
  public getErrors(noteId: string, blockId: string) {
    return this.compilerMap.get(noteId)?.get(blockId)?.errors || [];
  }
  public getCNodes(noteId: string, blockId: string) {
    return this.compilerMap.get(noteId)?.get(blockId)?.cNodeList || [];
  }
  private definitionFinderGenerator(noteId: string, blockId: string) {
    const finder = (name: string) => {
      const noteIndex = this.noteIdList.indexOf(noteId);
      if (noteIndex > 0 || noteIndex < this.noteIdList.length) {
        const preNoteIds = this.noteIdList.slice(0, noteIndex);
        for (const preNoteId of preNoteIds) {
          const blockIds = this.blockIdListMap.get(preNoteId);
          if (blockIds) {
            for (const blockId of blockIds) {
              const rst = this.compilerMap
                .get(preNoteId)
                ?.get(blockId)
                ?.cNodeMap.get(name);
              if (rst) {
                return rst;
              }
            }
          }
        }
      }
      const blockList = this.blockIdListMap.get(noteId);
      if (blockList) {
        const blockIndex = blockList?.indexOf(blockId);
        for (const blockId of blockList.slice(0, blockIndex)) {
          const rst = this.compilerMap
            .get(noteId)
            ?.get(blockId)
            ?.cNodeMap.get(name);
          if (rst) {
            return rst;
          }
        }
      }
      return undefined;
    };
    return finder;
  }
}
