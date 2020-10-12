
import { tokenize, parse } from './parser.js'
import { Evaluator } from './eval.js'
import { Error } from './error.js'

export class InteractiveEvaluator extends Evaluator {

  print(value) {
    document.querySelector("#output").innerText += value.toString() + "\n";
  }

}

export function run() {
  let text = document.querySelector("#code").value;
  let evaluator = new InteractiveEvaluator();
  try {
    let tokens = tokenize(text);
    let parsed = parse(tokens);
    document.querySelector("#output").innerText = "";
    document.querySelector("#stack").innerText = "";
    evaluator.eval(parsed);
  } catch (e) {
    if (e instanceof Error) {
      document.querySelector("#output").innerText += "\n\n" + e.toString() + "\n";
    } else {
      throw e;
    }
  }
  document.querySelector("#stack").innerText = evaluator.stackToString();
}
