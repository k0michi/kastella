export namespace RegExpression {
  export const tag = /^[a-zA-Z0-9]+$/;
  export const suffixedTag = /\s+#([a-zA-Z0-9]+)$/;
  export const path = /^\/(([^\/]+)\/)*([^\/]+)?$/;
}