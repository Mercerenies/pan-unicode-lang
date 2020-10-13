
export zip = (a, b) ->
  a.map((v, i) -> [v, b[i]])

export arrayEq = (a, b, fn = (x, y) -> x == y) ->
  return false unless Array.isArray(a) and Array.isArray(b)
  return false unless a.length == b.length
  for [x, y] from zip(a, b)
    return false unless fn(x, y)
  true
