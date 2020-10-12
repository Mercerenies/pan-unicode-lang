
export class Error
  toString: () -> "Error"

export class UnknownCommandError extends Error
  constructor: (@token) -> super()
  toString: () -> "Unknown command #{@token}"

export class StackUnderflowError extends Error
  toString: () -> "Stack underflow"

export class CallStackUnderflowError extends Error
  toString: () -> "Call stack underflow"

export class UnexpectedEOF extends Error
  toString: () -> "Unexpected EOF"

export class UnexpectedParseError extends Error
  constructor: (@token) -> super()
  toString: () -> "Unexpected token #{@token}"

export class CallNonFunction extends Error
  constructor: (@object) -> super()
  toString: () -> "Attempt to call non-function #{@object}"

export class InvalidModifier extends Error
  constructor: (@token) -> super()
  toString: () -> "Invalid modifier(s) on #{@token}"

export class IncompatibleArrayLengths extends Error
  toString: () -> "Incompatible array lengths"
