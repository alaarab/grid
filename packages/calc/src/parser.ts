import FastFormulaParser from "fast-formula-parser";
import { DepParser } from "fast-formula-parser/grammar/dependency/hooks";
import FormulaError from "fast-formula-parser/formulas/error";
import { detectDataType, DATATYPES, castToString, isNull } from "./helpers";
import { CellsBySheet } from "./calc";
import merge from "lodash.merge";
import { CellConfig, CellConfigGetter } from "./types";

export type Sheet = string;

export interface CellPosition {
  sheet: Sheet;
  row: number;
  col: number;
}

export interface CellRange {
  sheet: Sheet;
  from: Omit<CellPosition, "sheet">;
  to: Omit<CellPosition, "sheet">;
}

export type ResultArray = any[][];

export const DEFAULT_HYPERLINK_COLOR = "#1155CC";

// Should match SpreadSheet CellConfig
export interface ParseResults {
  result?: React.ReactText | undefined | ResultArray;
  resultType?: DATATYPES;
  error?: string;
  hyperlink?: string;
  errorMessage?: string;
  color?: string;
  underline?: boolean;
}

const basePosition: CellPosition = { row: 1, col: 1, sheet: "Sheet1" };

export interface CellInterface {
  rowIndex: number;
  columnIndex: number;
}

export type GetValue = (sheet: Sheet, cell: CellInterface) => CellConfig;

export type Functions = Record<string, (...args: any[]) => any>;

export interface FormulaProps {
  getValue?: CellConfigGetter | undefined;
  functions?: Functions;
}

function extractIfJSON(str: string) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

/**
 * Create a formula parser
 * @param param0
 */
class FormulaParser {
  formulaParser: FastFormulaParser;
  dependencyParser: DepParser;
  getValue: CellConfigGetter | undefined;
  currentValues: CellsBySheet | undefined;
  constructor(options?: FormulaProps) {
    if (options?.getValue) {
      this.getValue = options.getValue;
    }
    this.formulaParser = new FastFormulaParser({
      functions: options?.functions,
      onCell: this.getCellValue,
      onRange: this.getRangeValue
    });
    this.dependencyParser = new DepParser();
  }

  cacheValues = (changes: CellsBySheet) => {
    this.currentValues = merge(this.currentValues, changes);
  };

  clearCachedValues = () => {
    this.currentValues = undefined;
  };

  getCellConfig = (position: CellPosition) => {
    const sheet = position.sheet;
    const cell = { rowIndex: position.row, columnIndex: position.col };
    const config =
      this.currentValues?.[position.sheet]?.[position.row]?.[position.col] ??
      this.getValue?.(sheet, cell) ??
      null;
    if (config === null) return config;
    if (config?.datatype === "formula" || !isNull(config?.resultType)) {
      return config?.resultType === "number"
        ? Number(castToString(config?.result) ?? "0")
        : config?.result;
    }
    return config && config.datatype === "number"
      ? Number(castToString(config.text) ?? "0")
      : config.text ?? null;
  };

  getCellValue = (pos: CellPosition) => {
    return this.getCellConfig(pos);
  };

  getRangeValue = (ref: CellRange) => {
    const arr = [];
    for (let row = ref.from.row; row <= ref.to.row; row++) {
      const innerArr = [];
      for (let col = ref.from.col; col <= ref.to.col; col++) {
        innerArr.push(this.getCellValue({ sheet: ref.sheet, row, col }));
      }
      arr.push(innerArr);
    }
    return arr;
  };
  parse = async (
    text: string | null,
    position: CellPosition = basePosition,
    getValue?: CellConfigGetter
  ): Promise<ParseResults> => {
    /* Update getter */
    if (getValue !== void 0) this.getValue = getValue;
    let result;
    let error;
    let errorMessage;
    let hyperlink;
    let underline;
    let color;
    let resultType: DATATYPES | undefined;
    try {
      result = await this.formulaParser
        .parseAsync(text, position, true)
        .catch((err: FormulaError) => {
          error = err.error || err.message;
          errorMessage = err.message;
        });

      /* Check if its JSON */
      result = extractIfJSON(result);

      /**
       * Parse special types
       * 1. Hyperlink
       */
      if (!Array.isArray(result) && typeof result === "object") {
        // Hyperlink
        if (result?.datatype === "hyperlink") {
          resultType = result.datatype;
          hyperlink = result.hyperlink;
          result = result.title || result.hyperlink;
          color = DEFAULT_HYPERLINK_COLOR;
          underline = true;
        }
      } else {
        resultType = detectDataType(result);
      }

      if ((result as any) instanceof FormulaError) {
        error = ((result as unknown) as FormulaError).error;
        errorMessage = ((result as unknown) as FormulaError).message;
      }
    } catch (err) {
      error = err.toString();
      resultType = "error";
    }
    return {
      result,
      resultType,
      hyperlink,
      color,
      underline,
      error,
      errorMessage
    };
  };
  getDependencies = (
    text: string,
    position: CellPosition = basePosition
  ): CellRange[] | CellPosition[] => {
    return this.dependencyParser.parse(text, position);
  };
}

export { FormulaParser };
