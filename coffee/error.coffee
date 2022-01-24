
export class Error
  constructor: () ->
  id: () -> -1
  message: () -> "Error"
  toString: () ->
    this.message()

export class UnknownCommandError extends Error
  constructor: (@token) -> super()
  id: () -> 1
  message: () -> "Unknown command #{@token}"

export class StackUnderflowError extends Error
  id: () -> 2
  message: () -> "Stack underflow"

export class CallStackUnderflowError extends Error
  id: () -> 3
  message: () -> "Call stack underflow"

export class UnexpectedEOF extends Error
  id: () -> 4
  message: () -> "Unexpected EOF"

export class UnexpectedParseError extends Error
  constructor: (@token) -> super()
  id: () -> 5
  message: () -> "Unexpected token #{@token}"

export class CallNonFunction extends Error
  constructor: (@object) -> super()
  id: () -> 6
  message: () -> "Attempt to call non-function #{@object}"

export class InvalidModifier extends Error
  constructor: (@token) -> super()
  id: () -> 7
  message: () -> "Invalid modifier(s) on #{@token}"

export class IncompatibleArrayLengths extends Error
  id: () -> 8
  message: () -> "Incompatible array lengths"

export class InvalidInput extends Error
  id: () -> 9
  message: () -> "Invalid input"

export class TypeError extends Error
  constructor: (@expected, @value) -> super()
  id: () -> 10
  message: () -> "Type error (Expected #{@expected} got #{@value})"

export class StrEncodingError extends Error
  constructor: (@str) -> super()
  id: () -> 11
  message: () -> "String encoding error (#{@str})"

export class IncomparableValues extends Error
  constructor: (@lhs, @rhs) -> super()
  id: () -> 12
  message: () -> "Attempt to compare #{@lhs} and #{@rhs}"

export class UserError extends Error
  constructor: (@value) -> super()
  id: () -> 13
  message: () -> "User error #{@value}"
