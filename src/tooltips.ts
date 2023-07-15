
import Str from './str.js';
import { leftPad } from './util.js';
import { flippedTranslationTable } from './input_documentation.js';

export function addTooltipsToDocs(): void {
  for (const inputtable of document.querySelectorAll(".inputtable")) {
    inputtable.className += " tooltip";
    const tooltipContents = createTooltipContents(inputtable.textContent ?? "");
    inputtable.appendChild(createTooltipSpan(tooltipContents));
  }
}

function createTooltipContents(char: string): Node[] {
  const codePoint = Str.fromString(char).codePointAt(0);
  const codePointStr = `U+${leftPad(codePoint.toString(16).toUpperCase(), 4, '0')}`;
  const result: Node[] = [];
  result.push(document.createTextNode(codePointStr));

  const inputForms = flippedTranslationTable()[char];
  if (inputForms !== undefined) {
    const inputFormsHtml = inputForms.map((x) => `<code>${x}</code>`).join(", ");
    result.push(document.createElement("br"));
    const inputSpan = document.createElement("span");
    inputSpan.innerHTML = `To input: ${inputFormsHtml}`;
    result.push(inputSpan);
  } else {
    console.warn(`inputtable class on ${char}, which has no input forms`);
  }

  return result;
}

function createTooltipSpan(nodes: Node[]): Node {
  const span = document.createElement("span");
  span.className += "tooltiptext";
  for (const node of nodes) {
    span.appendChild(node);
  }
  return span;
}
