
import Str from './str.js'

export toNumber = (ch) ->
  switch ch.charAt(0)
    when '⁰', '₀' then 0
    when '¹', '₁' then 1
    when '²', '₂' then 2
    when '³', '₃' then 3
    when '⁴', '₄' then 4
    when '⁵', '₅' then 5
    when '⁶', '₆' then 6
    when '⁷', '₇' then 7
    when '⁸', '₈' then 8
    when '⁹', '₉' then 9
    else undefined

export toSub = (n) ->
  switch n
    when 0 then '₀'
    when 1 then '₁'
    when 2 then '₂'
    when 3 then '₃'
    when 4 then '₄'
    when 5 then '₅'
    when 6 then '₆'
    when 7 then '₇'
    when 8 then '₈'
    when 9 then '₉'
    else undefined

export toSuper = (n) ->
  switch n
    when 0 then '⁰'
    when 1 then '¹'
    when 2 then '²'
    when 3 then '³'
    when 4 then '⁴'
    when 5 then '⁵'
    when 6 then '⁶'
    when 7 then '⁷'
    when 8 then '⁸'
    when 9 then '⁹'
    else undefined

# TODO Note that ₀ is unassigned for the moment. Haven't decided what to do with it yet.
