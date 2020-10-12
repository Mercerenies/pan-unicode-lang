
export class Error {
  toString() {
    return "Error";
  }
}

export class UnknownCommandError extends Error {
  constructor(token) {
    super();
    this.token = token;
  }
  toString() {
    return "Unknown command " + this.token;
  }
}

export class StackUnderflowError extends Error {
  toString() {
    return "Stack underflow";
  }
}

export class CallStackUnderflowError extends Error {
  toString() {
    return "Call stack underflow";
  }
}

export class UnexpectedEOF extends Error {
  toString() {
    return "Unexpected EOF";
  }
}

export class UnexpectedParseError extends Error {
  constructor(token) {
    super();
    this.token = token;
  }
  toString() {
    return "Unexpected token " + this.token;
  }
}

export class CallNonFunction extends Error {
  constructor(object) {
    super();
    this.object = object;
  }
  toString() {
    return "Attempt to call non-function " + this.object.toString();
  }
}
