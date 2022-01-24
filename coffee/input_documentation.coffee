
import { DEFAULT_TRANSLATION_TABLE } from './unicode_input.js'

export printTable = (node) ->
  result = ""
  result += """
    <table class="input-table">
      <tr><th>Character</th><th>To Input</th></tr>
  """
  flippedTable = {}
  for k, v of DEFAULT_TRANSLATION_TABLE
    flippedTable[v] ?= []
    flippedTable[v].push(k)
  for k, v of flippedTable
    v1 = v.map((x) -> "<code>#{x}</code>").join(", ")
    result += """
      <tr>
        <td><code>#{k}</code></td>
        <td>#{v1}</td>
      </tr>
    """
  result += """
    </table>
  """
  node.innerHTML = result
