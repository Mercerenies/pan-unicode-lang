import { DEFAULT_TRANSLATION_TABLE } from './unicode_input.js';
export function printTable(node) {
    let result = "";
    result += `<table class="input-table">
  <tr><th>Character</th><th>To Input</th></tr>`;
    // Compile the flipped table.
    const flippedTable = {};
    for (const k in DEFAULT_TRANSLATION_TABLE) {
        const v = DEFAULT_TRANSLATION_TABLE[k];
        if (flippedTable[v] == null) {
            flippedTable[v] = [];
        }
        flippedTable[v].push(k);
    }
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
;
