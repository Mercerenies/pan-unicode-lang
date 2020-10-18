
export class Error
  constructor: () ->
  message: () -> "Error"
  toString: () ->
    this.message()

export class UnknownCommandError extends Error
  constructor: (@token) -> super()
  message: () -> "Unknown command #{@token}"

export class StackUnderflowError extends Error
  message: () -> "Stack underflow"

export class CallStackUnderflowError extends Error
  message: () -> "Call stack underflow"

export class UnexpectedEOF extends Error
  message: () -> "Unexpected EOF"

export class UnexpectedParseError extends Error
  constructor: (@token) -> super()
  message: () -> "Unexpected token #{@token}"

export class CallNonFunction extends Error
  constructor: (@object) -> super()
  message: () -> "Attempt to call non-function #{@object}"

export class InvalidModifier extends Error
  constructor: (@token) -> super()
  message: () -> "Invalid modifier(s) on #{@token}"

export class IncompatibleArrayLengths extends Error
  message: () -> "Incompatible array lengths"

export class InvalidInput extends Error
  message: () -> "Invalid input"

export class TypeError extends Error
  constructor: (@expected, @value) -> super()
  message: () -> "Type error (Expected #{@expected} got #{@value})"

export class StrEncodingError extends Error
  constructor: (@str) -> super()
  message: () -> "String encoding error (#{@str})"

export class IncomparableValues extends Error
  constructor: (@lhs, @rhs) -> super()
  message: () -> "Attempt to compare #{@lhs} and #{@rhs}"

export class UserError extends Error
  constructor: (@value) -> super()
  message: () -> "User error #{@value}"
