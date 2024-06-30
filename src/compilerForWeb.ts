import { Compiler } from "./compiler";

type NoteId = string;
type BlockId = string;

export class CompilerForWeb {
  public compilerMap: Map<NoteId, Map<BlockId, Compiler>> = new Map();
  public noteIdList: NoteId[] = [];
  public blockIdListMap: Map<NoteId, BlockId[]> = new Map();

  public setNoteIdList(noteIdList: NoteId[]) {
    this.noteIdList = noteIdList;
    console.log("setNoteIdList", this.noteIdList);
  }
  public setBlockIdList(noteId: NoteId, blockIds: BlockId[]) {
    this.blockIdListMap.set(noteId, blockIds);
  }
  public compileCode(noteId: string, blockId: string, code: string) {
    let noteMap = this.compilerMap.get(noteId);
    if (noteMap === undefined) {
      noteMap = new Map();
      this.compilerMap.set(noteId, noteMap);
    }
    let compiler = noteMap.get(blockId);
    if (compiler === undefined) {
      compiler = new Compiler(
        this.definitionFinderGenerator(
          noteId,
          blockId,
          this.noteIdList,
          this.blockIdListMap
        )
      );
      noteMap.set(blockId, compiler);
    }
    return compiler.compileCode(code);
  }
  public getErrors(noteId: string, blockId: string) {
    return this.compilerMap.get(noteId)?.get(blockId)?.errors || [];
  }
  public getCNodes(noteId: string, blockId: string) {
    return this.compilerMap.get(noteId)?.get(blockId)?.cNodeList || [];
  }
  private definitionFinderGenerator(
    noteId: string,
    blockId: string,
    noteIdList: NoteId[],
    blockIdListMap: Map<NoteId, BlockId[]>
  ) {
    const finder = (name: string) => {
      const noteIndex = noteIdList.indexOf(noteId);
      if (noteIndex > 0 && noteIndex < this.noteIdList.length) {
        const preNoteIds = noteIdList.slice(0, noteIndex);
        for (const preNoteId of preNoteIds) {
          const blockIds = blockIdListMap.get(preNoteId);
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
      const blockList = blockIdListMap.get(noteId);
      if (blockList) {
        const blockIndex = blockList.indexOf(blockId);
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
