
import { StringLit } from './ast.js'

export stringify = (value) ->
  switch
    when value instanceof StringLit
      value.text
    else
      value.toString()
