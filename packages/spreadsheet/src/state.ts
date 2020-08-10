import produce, { enablePatches, applyPatches, Patch, original } from "immer";
import {
  uuid,
  cellsInSelectionVariant,
  createCustomValidation,
  cloneCellConfig,
  cloneRow,
  formattingTypeKeys,
  detectDataType
} from "./constants";
import { Sheet, SheetID, CellConfig, CellsBySheet } from "./Spreadsheet";
import {
  PatchInterface,
  CellInterface,
  SelectionArea,
  AreaProps,
  selectionFromActiveCell,
  ScrollCoords,
  Filter,
  FilterDefinition,
  isNull,
  Direction
} from "@rowsncolumns/grid";
import {
  CellFormatting,
  FORMATTING_TYPE,
  STROKE_FORMATTING,
  AXIS,
  BORDER_STYLE,
  BORDER_VARIANT,
  DATATYPES
} from "./types";

/* Enabled patches in immer */
enablePatches();

/* Delete cell config, but keep formatting rules */
export const clearCellKeepFormatting = (config: CellConfig) => {
  for (let key in config) {
    if (key in formattingTypeKeys) continue;
    delete config[key];
  }
};

export const defaultSheets: Sheet[] = [
  {
    id: uuid(),
    name: "Sheet1",
    frozenColumns: 0,
    frozenRows: 0,
    activeCell: {
      rowIndex: 1,
      columnIndex: 1
    },
    mergedCells: [],
    selections: [],
    cells: {},
    scrollState: { scrollTop: 0, scrollLeft: 0 },
    filterViews: []
  }
];

export interface StateInterface {
  selectedSheet: React.ReactText | undefined;
  sheets: Sheet[];
  currentActiveCell?: CellInterface | null;
  currentSelections?: SelectionArea[] | null;
}

export enum ACTION_TYPE {
  SELECT_SHEET = "SELECT_SHEET",
  APPLY_PATCHES = "APPLY_PATCHES",
  CHANGE_SHEET_NAME = "CHANGE_SHEET_NAME",
  NEW_SHEET = "NEW_SHEET",
  CHANGE_SHEET_CELL = "CHANGE_SHEET_CELL",
  UPDATE_FILL = "UPDATE_FILL",
  DELETE_SHEET = "DELETE_SHEET",
  SHEET_SELECTION_CHANGE = "SHEET_SELECTION_CHANGE",
  FORMATTING_CHANGE_AUTO = "FORMATTING_CHANGE_AUTO",
  FORMATTING_CHANGE_PLAIN = "FORMATTING_CHANGE_PLAIN",
  FORMATTING_CHANGE = "FORMATTING_CHANGE",
  DELETE_CELLS = "DELETE_CELLS",
  CLEAR_FORMATTING = "CLEAR_FORMATTING",
  RESIZE = "RESIZE",
  MERGE_CELLS = "MERGE_CELLS",
  FROZEN_ROW_CHANGE = "FROZEN_ROW_CHANGE",
  FROZEN_COLUMN_CHANGE = "FROZEN_COLUMN_CHANGE",
  SET_BORDER = "SET_BORDER",
  UPDATE_SCROLL = "UPDATE_SCROLL",
  CHANGE_FILTER = "CHANGE_FILTER",
  DELETE_COLUMN = "DELETE_COLUMN",
  DELETE_ROW = "DELETE_ROW",
  INSERT_COLUMN = "INSERT_COLUMN",
  INSERT_ROW = "INSERT_ROW",
  REMOVE_CELLS = "REMOVE_CELLS",
  PASTE = "PASTE",
  COPY = "COPY",
  REPLACE_SHEETS = "REPLACE_SHEETS",
  VALIDATION_SUCCESS = "VALIDATION_SUCCESS",
  SHOW_SHEET = "SHOW_SHEET",
  HIDE_SHEET = "HIDE_SHEET",
  PROTECT_SHEET = "PROTECT_SHEET",
  UNPROTECT_SHEET = "UNPROTECT_SHEET",
  UPDATE_CELLS = "UPDATE_CELLS",
  CHANGE_TAB_COLOR = "CHANGE_TAB_COLOR",
  SET_LOADING = "SET_LOADING"
}

export type ActionTypes =
  | {
      type: ACTION_TYPE.SELECT_SHEET;
      id: React.ReactText;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.APPLY_PATCHES;
      patches: Patch[];
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.CHANGE_SHEET_NAME;
      id: SheetID;
      name: string;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.NEW_SHEET;
      sheet: Sheet;
      index?: number;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.CHANGE_SHEET_CELL;
      id: SheetID;
      cell: CellInterface;
      value: React.ReactText;
      datatype?: DATATYPES;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.UPDATE_FILL;
      id: SheetID;
      activeCell: CellInterface;
      fillSelection: SelectionArea;
      selections: SelectionArea[];
      undoable?: boolean;
    }
  | { type: ACTION_TYPE.DELETE_SHEET; id: SheetID; undoable?: boolean }
  | {
      type: ACTION_TYPE.SHEET_SELECTION_CHANGE;
      id: SheetID;
      activeCell: CellInterface | null;
      selections: SelectionArea[];
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.FORMATTING_CHANGE_AUTO;
      id: SheetID;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.FORMATTING_CHANGE_PLAIN;
      id: SheetID;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.FORMATTING_CHANGE;
      id: SheetID;
      key: keyof CellFormatting;
      value: any;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.DELETE_CELLS;
      id: SheetID;
      activeCell: CellInterface | null;
      selections: SelectionArea[];
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.REMOVE_CELLS;
      id: SheetID;
      activeCell: CellInterface | null;
      selections: SelectionArea[];
      undoable?: boolean;
    }
  | { type: ACTION_TYPE.CLEAR_FORMATTING; id: SheetID; undoable?: boolean }
  | {
      type: ACTION_TYPE.RESIZE;
      id: SheetID;
      axis: AXIS;
      dimension: number;
      index: number;
      undoable?: boolean;
    }
  | { type: ACTION_TYPE.MERGE_CELLS; id: SheetID; undoable?: boolean }
  | { type: ACTION_TYPE.COPY; id: SheetID; undoable?: boolean }
  | {
      type: ACTION_TYPE.FROZEN_ROW_CHANGE;
      id: SheetID;
      count: number;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.FROZEN_COLUMN_CHANGE;
      id: SheetID;
      count: number;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.SET_BORDER;
      id: SheetID;
      color: string | undefined;
      borderStyle: BORDER_STYLE;
      variant?: BORDER_VARIANT;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.UPDATE_SCROLL;
      id: SheetID;
      scrollState: ScrollCoords;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.CHANGE_FILTER;
      id: SheetID;
      filterViewIndex: number;
      columnIndex: number;
      filter?: FilterDefinition;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.DELETE_COLUMN;
      id: SheetID;
      activeCell: CellInterface;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.DELETE_ROW;
      id: SheetID;
      activeCell: CellInterface;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.INSERT_COLUMN;
      id: SheetID;
      activeCell: CellInterface;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.INSERT_ROW;
      id: SheetID;
      activeCell: CellInterface;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.PASTE;
      id: SheetID;
      rows: (string | null | CellConfig)[][];
      activeCell: CellInterface;
      selection?: SelectionArea;
      undoable?: boolean;
    }
  | { type: ACTION_TYPE.REPLACE_SHEETS; sheets: Sheet[]; undoable?: boolean }
  | {
      type: ACTION_TYPE.VALIDATION_SUCCESS;
      id: SheetID;
      cell: CellInterface;
      valid?: boolean;
      prompt?: string;
      undoable?: boolean;
    }
  | { type: ACTION_TYPE.SHOW_SHEET; id: SheetID; undoable?: boolean }
  | { type: ACTION_TYPE.HIDE_SHEET; id: SheetID; undoable?: boolean }
  | { type: ACTION_TYPE.PROTECT_SHEET; id: SheetID; undoable?: boolean }
  | { type: ACTION_TYPE.UNPROTECT_SHEET; id: SheetID; undoable?: boolean }
  | {
      type: ACTION_TYPE.UPDATE_CELLS;
      changes: CellsBySheet;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.CHANGE_TAB_COLOR;
      id: SheetID;
      color?: string;
      undoable?: boolean;
    }
  | {
      type: ACTION_TYPE.SET_LOADING;
      id: SheetID;
      cell: CellInterface;
      value?: boolean;
      undoable?: boolean;
    };

export interface StateReducerProps {
  addUndoPatch: <T>(patches: PatchInterface<T>) => void;
  getCellBounds: (cell: CellInterface | null) => AreaProps | undefined;
  stateReducer?: (state: StateInterface, action: ActionTypes) => StateInterface;
}

const defaultStateReducer = (state: StateInterface) => state;

export const createStateReducer = ({
  addUndoPatch,
  getCellBounds,
  stateReducer = defaultStateReducer
}: StateReducerProps) => {
  return (state: StateInterface, action: ActionTypes): StateInterface => {
    const newState = produce(
      state,
      draft => {
        switch (action.type) {
          case ACTION_TYPE.SELECT_SHEET:
            draft.selectedSheet = action.id;
            break;

          case ACTION_TYPE.CHANGE_SHEET_NAME: {
            const sheet = draft.sheets.find(sheet => sheet.id === action.id);
            if (sheet) {
              sheet.name = action.name;
            }
            break;
          }

          case ACTION_TYPE.NEW_SHEET: {
            const { sheet, index } = action;
            if (index === void 0) {
              (draft.sheets as Sheet[]).push(action.sheet);
            } else {
              draft.sheets.splice(index + 1, 0, sheet);
            }
            draft.selectedSheet = action.sheet.id;
            break;
          }

          case ACTION_TYPE.CHANGE_SHEET_CELL: {
            const sheet = draft.sheets.find(sheet => sheet.id === action.id);
            if (sheet) {
              const { activeCell, selections } = sheet;
              const { cell, value, datatype } = action;
              sheet.cells[cell.rowIndex] = sheet.cells[cell.rowIndex] ?? {};
              sheet.cells[cell.rowIndex][cell.columnIndex] =
                sheet.cells[cell.rowIndex][cell.columnIndex] ?? {};
              const currentCell =
                sheet.cells[cell.rowIndex][cell.columnIndex] ?? {};
              const hasFormulaChanged = currentCell.text !== value;
              currentCell.text = value;
              currentCell.datatype = datatype;
              delete currentCell.parentCell;
              delete currentCell.resultType;
              delete currentCell.result;

              /* Check for formula range */
              const formulaRange = currentCell.formulaRange;
              if (hasFormulaChanged && formulaRange) {
                const [right, bottom] = formulaRange;
                for (let a = 0; a < bottom; a++) {
                  for (let b = 0; b < right; b++) {
                    if (a === 0 && b === 0) continue;
                    delete sheet.cells?.[cell.rowIndex + a]?.[
                      cell.columnIndex + b
                    ];
                  }
                }
              }
              /* Delete formula range */
              delete currentCell.formulaRange;

              /* Keep reference of active cell, so we can focus back */
              draft.currentActiveCell = activeCell;
              draft.currentSelections = selections;
            }
            break;
          }

          case ACTION_TYPE.UPDATE_CELLS: {
            const { changes } = action;
            for (const name in changes) {
              const sheet = draft.sheets.find(sheet => sheet.name == name);
              if (sheet) {
                for (const rowIndex in changes[name]) {
                  sheet.cells[rowIndex] = sheet.cells[rowIndex] ?? {};
                  for (const columnIndex in changes[name][rowIndex]) {
                    sheet.cells[rowIndex][columnIndex] =
                      sheet.cells[rowIndex][columnIndex] ?? {};
                    const values = changes[name][rowIndex][columnIndex];
                    for (const key in values) {
                      const value = values[key];
                      if (value === void 0) {
                        delete sheet.cells[rowIndex][columnIndex]?.[key];
                      } else {
                        /* Exclude formatting values if it has been changed by user */
                        if (
                          Object.values(FORMATTING_TYPE).includes(
                            key as FORMATTING_TYPE
                          ) &&
                          sheet.cells[rowIndex][columnIndex]?.[key] !== void 0
                        ) {
                          continue;
                        }
                        sheet.cells[rowIndex][columnIndex][key] = value;
                      }
                    }
                  }
                }
              }
            }
            break;
          }

          case ACTION_TYPE.VALIDATION_SUCCESS: {
            const sheet = draft.sheets.find(sheet => sheet.id === action.id);
            if (sheet) {
              const { valid, cell, prompt } = action;
              sheet.cells[cell.rowIndex] = sheet.cells[cell.rowIndex] ?? {};
              sheet.cells[cell.rowIndex][cell.columnIndex] =
                sheet.cells[cell.rowIndex][cell.columnIndex] ?? {};
              const currentCell = sheet.cells[cell.rowIndex][cell.columnIndex];
              if (valid !== void 0) {
                currentCell.valid = valid;
              }
              if (prompt !== void 0) {
                currentCell.dataValidation =
                  currentCell.dataValidation ?? createCustomValidation();
                currentCell.dataValidation.prompt = prompt;
              }
            }
            break;
          }

          /**
           * Todo Move logic to action handler
           */
          case ACTION_TYPE.UPDATE_FILL: {
            const sheet = draft.sheets.find(sheet => sheet.id === action.id);
            if (sheet) {
              const { activeCell, fillSelection, selections } = action;
              const sel = selections.length
                ? selections[selections.length - 1]
                : { bounds: getCellBounds(activeCell) as AreaProps };
              const { bounds: fillBounds } = fillSelection;
              const direction =
                fillBounds.bottom > sel.bounds?.bottom
                  ? Direction.Down
                  : fillBounds.top < sel.bounds.top
                  ? Direction.Up
                  : fillBounds.left < sel.bounds.left
                  ? Direction.Left
                  : Direction.Right;
              if (direction === Direction.Down) {
                const start = sel.bounds.bottom + 1;
                const end = fillBounds.bottom;
                let counter = 0;
                for (let i = start; i <= end; i++) {
                  let curSelRowIndex = sel.bounds.top + counter;
                  if (curSelRowIndex > sel.bounds.bottom) {
                    counter = 0;
                    curSelRowIndex = sel.bounds.top;
                  }
                  sheet.cells[i] = sheet.cells[i] ?? {};
                  for (let j = sel.bounds.left; j <= sel.bounds.right; j++) {
                    sheet.cells[i][j] = sheet.cells?.[curSelRowIndex]?.[j];
                  }
                  counter++;
                }
              }
              if (direction === Direction.Up) {
                const start = sel.bounds.top - 1;
                const end = fillBounds.top;
                let counter = 0;
                for (let i = start; i >= end; i--) {
                  let curSelRowIndex = sel.bounds.bottom + counter;
                  if (curSelRowIndex > sel.bounds.top) {
                    counter = 0;
                    curSelRowIndex = sel.bounds.bottom;
                  }
                  sheet.cells[i] = sheet.cells[i] ?? {};
                  for (let j = sel.bounds.left; j <= sel.bounds.right; j++) {
                    sheet.cells[i][j] = sheet.cells?.[curSelRowIndex]?.[j];
                  }
                  counter--;
                }
              }
              if (direction === Direction.Left) {
                for (let i = sel.bounds.top; i <= sel.bounds.bottom; i++) {
                  sheet.cells[i] = sheet.cells[i] ?? {};
                  const start = sel.bounds.left - 1;
                  const end = fillBounds.left;
                  let counter = 0;
                  for (let j = start; j >= end; j--) {
                    let curSelColumnIndex = sel.bounds.right + counter;
                    if (curSelColumnIndex < sel.bounds.left) {
                      counter = 0;
                      curSelColumnIndex = sel.bounds.right;
                    }
                    sheet.cells[i][j] = sheet.cells?.[i]?.[curSelColumnIndex];
                    counter--;
                  }
                }
              }
              if (direction === Direction.Right) {
                for (let i = sel.bounds.top; i <= sel.bounds.bottom; i++) {
                  sheet.cells[i] = sheet.cells[i] ?? {};
                  const start = sel.bounds.right + 1;
                  const end = fillBounds.right;
                  let counter = 0;
                  for (let j = start; j <= end; j++) {
                    let curSelColumnIndex = sel.bounds.left + counter;
                    if (curSelColumnIndex > sel.bounds.right) {
                      counter = 0;
                      curSelColumnIndex = sel.bounds.left;
                    }
                    sheet.cells[i][j] = sheet.cells?.[i]?.[curSelColumnIndex];
                    counter++;
                  }
                }
              }
              /* Keep reference of active cell, so we can focus back */
              draft.currentActiveCell = activeCell;
              draft.currentSelections = [fillSelection];
            }
            break;
          }

          case ACTION_TYPE.DELETE_SHEET: {
            const { id } = action;
            const index = draft.sheets.findIndex(sheet => sheet.id === id);
            const newSheets = draft.sheets.filter(sheet => sheet.id !== id);
            const newSelectedSheet =
              draft.selectedSheet === draft.sheets[index].id
                ? newSheets[Math.max(0, index - 1)].id
                : draft.selectedSheet;
            draft.selectedSheet = newSelectedSheet;
            draft.sheets.splice(index, 1);
            break;
          }

          case ACTION_TYPE.SHEET_SELECTION_CHANGE: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.activeCell = action.activeCell;
              sheet.selections = action.selections;
            }
            break;
          }

          case ACTION_TYPE.FORMATTING_CHANGE_AUTO: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell, selections } = sheet;
              const sel = selections.length
                ? selections
                : activeCell
                ? [
                    {
                      bounds: getCellBounds?.(activeCell) as AreaProps
                    }
                  ]
                : [];
              for (let i = 0; i < sel.length; i++) {
                const { bounds } = sel[i];
                if (!bounds) continue;
                for (let j = bounds.top; j <= bounds.bottom; j++) {
                  for (let k = bounds.left; k <= bounds.right; k++) {
                    delete sheet.cells[j]?.[k]?.plaintext;
                  }
                }
              }
            }
            break;
          }

          case ACTION_TYPE.FORMATTING_CHANGE_PLAIN: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell, selections } = sheet;
              const sel = selections.length
                ? selections
                : activeCell
                ? [
                    {
                      bounds: getCellBounds?.(activeCell) as AreaProps
                    }
                  ]
                : [];
              for (let i = 0; i < sel.length; i++) {
                const { bounds } = sel[i];
                if (!bounds) continue;
                for (let j = bounds.top; j <= bounds.bottom; j++) {
                  sheet.cells[j] = sheet.cells[j] ?? {};
                  for (let k = bounds.left; k <= bounds.right; k++) {
                    sheet.cells[j][k] = sheet.cells[j][k] ?? {};
                    sheet.cells[j][k].plaintext = true;
                  }
                }
              }
            }
            break;
          }

          case ACTION_TYPE.FORMATTING_CHANGE: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            const { key, value } = action;
            if (sheet) {
              const { selections, activeCell } = sheet;
              const sel =
                selections && selections.length
                  ? selections
                  : [{ bounds: getCellBounds(activeCell) }];
              for (let i = 0; i < sel.length; i++) {
                const { bounds } = sel[i];
                if (!bounds) continue;
                for (let j = bounds.top; j <= bounds.bottom; j++) {
                  sheet.cells[j] = sheet.cells[j] ?? {};
                  for (let k = bounds.left; k <= bounds.right; k++) {
                    sheet.cells[j][k] = sheet.cells[j][k] ?? {};
                    sheet.cells[j][k][key] = value;

                    /* if user is applying a custom number format, remove plaintext */
                    if (key === FORMATTING_TYPE.CUSTOM_FORMAT) {
                      delete sheet.cells[j]?.[k]?.plaintext;
                    }
                  }
                }
              }
              /* Keep reference of active cell, so we can focus back */
              draft.currentActiveCell = activeCell;
              draft.currentSelections = selections;
            }
            break;
          }

          case ACTION_TYPE.DELETE_CELLS: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell, selections } = action;
              const sel = selections.length
                ? selections
                : [{ bounds: getCellBounds(activeCell) }];
              for (let i = 0; i < sel.length; i++) {
                const { bounds } = sel[i];
                if (!bounds) continue;

                for (let j = bounds.top; j <= bounds.bottom; j++) {
                  if (sheet.cells[j] === void 0) continue;
                  for (let k = bounds.left; k <= bounds.right; k++) {
                    if (sheet.cells[j][k] === void 0) continue;
                    const formulaRange = sheet.cells?.[j]?.[k]?.formulaRange;

                    clearCellKeepFormatting(sheet.cells[j][k]);

                    /* Check for formula range */
                    if (formulaRange) {
                      const [right, bottom] = formulaRange;
                      for (let a = 0; a < bottom; a++) {
                        for (let b = 0; b < right; b++) {
                          clearCellKeepFormatting(
                            sheet.cells?.[j + a]?.[k + b]
                          );
                        }
                      }
                    }
                  }
                }

                /* Keep reference of active cell, so we can focus back */
                draft.currentActiveCell = activeCell;
                draft.currentSelections = selections;
              }
            }
            break;
          }

          case ACTION_TYPE.REMOVE_CELLS: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell, selections } = action;
              if (selections.length) {
                selections.forEach(sel => {
                  const { bounds } = sel;
                  for (let i = bounds.top; i <= bounds.bottom; i++) {
                    for (let j = bounds.left; j <= bounds.right; j++) {
                      delete sheet.cells?.[i]?.[j];
                    }
                  }
                });
              } else if (activeCell) {
                const { rowIndex, columnIndex } = activeCell;
                delete sheet.cells?.[rowIndex]?.[columnIndex];
              }
            }
            break;
          }

          /* Clear formatting */
          case ACTION_TYPE.CLEAR_FORMATTING: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell, selections } = sheet;
              if (selections.length) {
                selections.forEach(sel => {
                  const { bounds } = sel;
                  for (let i = bounds.top; i <= bounds.bottom; i++) {
                    if (sheet.cells[i] === void 0) continue;
                    for (let j = bounds.left; j <= bounds.right; j++) {
                      if (sheet.cells[i][j] === void 0) continue;
                      Object.values(FORMATTING_TYPE).forEach(key => {
                        delete sheet.cells[i]?.[j]?.[key];
                      });
                      Object.values(STROKE_FORMATTING).forEach(key => {
                        delete sheet.cells[i]?.[j]?.[key];
                      });
                    }
                  }
                });
              } else if (activeCell) {
                const { rowIndex, columnIndex } = activeCell;
                if (sheet.cells?.[rowIndex]?.[columnIndex]) {
                  Object.values(FORMATTING_TYPE).forEach(key => {
                    delete sheet.cells[rowIndex]?.[columnIndex]?.[key];
                  });
                  Object.values(STROKE_FORMATTING).forEach(key => {
                    delete sheet.cells[rowIndex]?.[columnIndex]?.[key];
                  });
                }
              }
            }
            break;
          }

          case ACTION_TYPE.RESIZE: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { axis, index, dimension } = action;
              if (axis === AXIS.X) {
                sheet.columnSizes = sheet.columnSizes ?? {};
                sheet.columnSizes[index] = dimension;
              } else {
                sheet.rowSizes = sheet.rowSizes ?? {};
                sheet.rowSizes[index] = dimension;
              }
            }
            break;
          }

          case ACTION_TYPE.MERGE_CELLS: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { selections, activeCell } = sheet;
              const { bounds } = selections.length
                ? selections[selections.length - 1]
                : { bounds: getCellBounds(activeCell) };
              if (!bounds) return;
              if (
                (bounds.top === bounds.bottom &&
                  bounds.left === bounds.right) ||
                bounds.top === 0 ||
                bounds.left === 0
              ) {
                return;
              }
              sheet.mergedCells = sheet.mergedCells ?? [];
              /* Check if cell is already merged */
              const index = sheet.mergedCells.findIndex(area => {
                return (
                  area.left === bounds.left &&
                  area.right === bounds.right &&
                  area.top === bounds.top &&
                  area.bottom === bounds.bottom
                );
              });
              if (index !== -1) {
                sheet.mergedCells.splice(index, 1);
                return;
              }
              sheet.mergedCells.push(bounds);
            }
            break;
          }

          case ACTION_TYPE.FROZEN_ROW_CHANGE: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.frozenRows = action.count;
            }
            break;
          }

          case ACTION_TYPE.FROZEN_COLUMN_CHANGE: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.frozenColumns = action.count;
            }
            break;
          }

          case ACTION_TYPE.SET_BORDER: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { color, variant, borderStyle } = action;
              const { selections, cells, activeCell } = sheet;
              const sel = selections.length
                ? selections
                : selectionFromActiveCell(activeCell);
              const boundedCells = cellsInSelectionVariant(
                sel as SelectionArea[],
                variant,
                borderStyle,
                color,
                getCellBounds
              );
              for (const row in boundedCells) {
                for (const col in boundedCells[row]) {
                  if (variant === BORDER_VARIANT.NONE) {
                    // Delete all stroke formatting rules
                    Object.values(STROKE_FORMATTING).forEach(key => {
                      delete sheet.cells[row]?.[col]?.[key];
                    });
                  } else {
                    const styles = boundedCells[row][col];
                    Object.keys(styles).forEach(key => {
                      sheet.cells[row] = cells[row] ?? {};
                      sheet.cells[row][col] = cells[row][col] ?? {};
                      // @ts-ignore
                      sheet.cells[row][col][key] = styles[key];
                    });
                  }
                }
              }
            }
            break;
          }

          case ACTION_TYPE.UPDATE_SCROLL: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.scrollState = action.scrollState;
            }
            break;
          }

          case ACTION_TYPE.CHANGE_FILTER: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { columnIndex, filterViewIndex, filter } = action;
              if (filter === void 0) {
                delete sheet?.filterViews?.[filterViewIndex]?.filters?.[
                  columnIndex
                ];
              } else {
                sheet.filterViews = sheet.filterViews ?? [];
                if (!sheet.filterViews[filterViewIndex].filters) {
                  sheet.filterViews[filterViewIndex].filters = {
                    [columnIndex]: filter
                  };
                } else {
                  (sheet.filterViews[filterViewIndex].filters as Filter)[
                    columnIndex
                  ] = filter;
                }
              }
            }
            break;
          }

          case ACTION_TYPE.DELETE_COLUMN: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell } = action;
              const { columnIndex } = activeCell;
              const { cells } = sheet;

              const changes: { [key: string]: any } = {};
              for (const row in cells) {
                const maxCol = Math.max(
                  ...Object.keys(cells[row] ?? {}).map(Number)
                );
                changes[row] = changes[row] ?? {};
                for (let i = columnIndex; i <= maxCol; i++) {
                  changes[row][i] = changes[row][i] ?? {};
                  changes[row][i] = cells[row]?.[i + 1];
                }
              }

              for (const row in changes) {
                for (const col in changes[row]) {
                  cells[row][col] = changes[row][col];
                }
              }
            }
            break;
          }

          case ACTION_TYPE.DELETE_ROW: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell } = action;
              const { rowIndex } = activeCell;
              const { cells } = sheet;
              const maxRow = Math.max(...Object.keys(cells).map(Number));
              const changes: { [key: string]: any } = {};
              for (let i = rowIndex; i <= maxRow; i++) {
                changes[i] = cells[i + 1];
              }
              for (const index in changes) {
                cells[index] = changes[index];
              }
            }
            break;
          }

          case ACTION_TYPE.INSERT_COLUMN: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell } = action;
              const { columnIndex } = activeCell;
              const { cells } = sheet;
              const changes: { [key: string]: any } = {};
              for (const row in cells) {
                const maxCol = Math.max(
                  ...Object.keys(cells[row] ?? {}).map(Number)
                );
                changes[row] = changes[row] ?? {};
                changes[row][columnIndex] = cloneCellConfig(
                  cells[row][columnIndex] ?? {}
                );
                for (let i = columnIndex; i <= maxCol; i++) {
                  changes[row][i + 1] = cells[row]?.[i];
                }
              }

              for (const row in changes) {
                for (const col in changes[row]) {
                  cells[row][col] = changes[row][col];
                }
              }
            }
            break;
          }

          case ACTION_TYPE.INSERT_ROW: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell } = action;
              const { rowIndex } = activeCell;
              const { cells } = sheet;
              const maxRow = Math.max(...Object.keys(cells).map(Number));
              const changes: { [key: string]: any } = {};
              changes[rowIndex] = cloneRow({ ...cells[rowIndex] });
              for (let i = rowIndex; i <= maxRow; i++) {
                changes[i + 1] = cells[i];
              }
              for (const index in changes) {
                cells[index] = changes[index];
              }
            }
            break;
          }

          case ACTION_TYPE.PASTE: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { selections } = sheet;
              const { rows, activeCell, selection } = action;
              const { rowIndex, columnIndex } = activeCell;
              const { cells } = sheet;
              for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const r = rowIndex + i;
                cells[r] = cells[r] ?? {};
                for (let j = 0; j < row.length; j++) {
                  const text = row[j];
                  const c = columnIndex + j;
                  cells[r][c] = cells[r][c] ?? {};
                  if (typeof text === "object") {
                    // Empty cells in JSON will be `null`
                    if (isNull(text)) {
                      continue;
                    }
                    delete text?.formulaRange;
                    delete text?.result;
                    delete text?.parentCell;
                    delete text?.resultType;

                    // TODO: Array formulas does not work well with copy/paste
                    // const { parentCell, ...config } = text as CellConfig;
                    cells[r][c] = text as CellConfig;
                  } else {
                    cells[r][c].text =
                      text === null || isNull(text) ? "" : text;
                    cells[r][c].datatype = detectDataType(cells[r][c].text);
                  }
                }
              }
              /* Remove cut selections */
              if (selection) {
                const { bounds } = selection;
                for (let i = bounds.top; i <= bounds.bottom; i++) {
                  for (let j = bounds.left; j <= bounds.right; j++) {
                    delete sheet.cells?.[i]?.[j];
                  }
                }
              }

              /* Keep reference of active cell, so we can focus back */
              draft.currentActiveCell = activeCell;
              draft.currentSelections = selections;
            }
            break;
          }

          case ACTION_TYPE.COPY: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { activeCell, selections } = sheet;
              draft.currentActiveCell = activeCell;
              draft.currentSelections = selections;
            }
            break;
          }

          case ACTION_TYPE.SET_LOADING: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              const { value, cell } = action;
              sheet.cells[cell.rowIndex][cell.columnIndex].loading = value;
            }
            break;
          }

          case ACTION_TYPE.REPLACE_SHEETS: {
            (draft.sheets as Sheet[]) = action.sheets;
            draft.selectedSheet = action.sheets[0].id;
            break;
          }

          case ACTION_TYPE.HIDE_SHEET: {
            const visibleSheets = draft.sheets.filter(sheet => !sheet.hidden);
            const index = visibleSheets.findIndex(
              sheet => sheet.id === action.id
            );
            if (index !== -1) {
              const newSelectedSheet =
                visibleSheets[index === 0 ? 1 : Math.max(0, index - 1)].id;
              draft.selectedSheet = newSelectedSheet;
              visibleSheets[index].hidden = true;
            }
            break;
          }

          case ACTION_TYPE.SHOW_SHEET: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.hidden = false;
            }
            break;
          }

          case ACTION_TYPE.PROTECT_SHEET: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.locked = true;
            }
            break;
          }

          case ACTION_TYPE.UNPROTECT_SHEET: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.locked = false;
            }
            break;
          }

          case ACTION_TYPE.CHANGE_TAB_COLOR: {
            const sheet = draft.sheets.find(
              sheet => sheet.id === action.id
            ) as Sheet;
            if (sheet) {
              sheet.tabColor = action.color;
            }
            break;
          }

          case ACTION_TYPE.APPLY_PATCHES:
            return applyPatches(state, action.patches);
        }
      },
      (patches, inversePatches) => {
        const { undoable = true } = action;
        if (undoable === false) {
          return;
        }
        requestAnimationFrame(() =>
          addUndoPatch<Patch[]>({ patches, inversePatches })
        );
      }
    );

    return stateReducer(newState, action);
  };
};
