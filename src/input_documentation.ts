
import { DEFAULT_TRANSLATION_TABLE } from './unicode_input.js';

let flippedTableCached: Record<string, string[]> | undefined = undefined;

// DEFAULT_TRANSLATION_TABLE is a mapping from abbreviations to their
// Unicode results. This function compiles the opposite mapping, from
// Unicode values to arrays of possible inputs. The result of this
// function is cached for efficiency.
export function flippedTranslationTable(): Record<string, string[]> {
  if (flippedTableCached === undefined) {
    // Compile the flipped table.
    const flippedTable: Record<string, string[]> = {};
    for (const k in DEFAULT_TRANSLATION_TABLE) {
      const v = DEFAULT_TRANSLATION_TABLE[k];
      if (flippedTable[v] == null) {
        flippedTable[v] = [];
      }
      flippedTable[v].push(k);
    }
    flippedTableCached = flippedTable;
  }
  return flippedTableCached;
}

export function printTable(node: HTMLElement): void {
  let result = "";
  result += `<table class="input-table">
  <tr><th>Character</th><th>To Input</th></tr>`;

  const flippedTable = flippedTranslationTable();

  // Insert the HTML.
  for (const k in flippedTable) {
    const v = flippedTable[k].map((x) => `<code>${x}</code>`).join(", ");
    result += `<tr>
  <td><code>${k}</code></td>
  <td>${v}</td>
</tr>`;
  }

  result += `</table>`;
  node.innerHTML = result;
}
