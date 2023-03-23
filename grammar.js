/**
 * @file Kotlin grammar for tree-sitter
 * @author Amaan Qureshi <amaanq12@gmail.com>
 * @license MIT
 * @see {@link https://harelang.org|official website}
 * @see {@link https://sr.ht/~sircmpwn/hare|official repository}
 * @see {@link https://harelang.org/specification|official spec}
 */

/* eslint-disable arrow-parens */
/* eslint-disable camelcase */
/* eslint-disable-next-line spaced-comment */
/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  PARENTHESES: -1,
  ASSIGNMENT: 1,
  SPREAD: 2,
  DISJUNCTION: 3,
  CONJUNCTION: 4,
  EQUALITY: 5,
  COMPARISON: 6,
  NAMED_CHECKS: 7,
  ELVIS: 8,
  INFIX: 9,
  RANGE: 10,
  ADDITIVE: 11,
  MULTIPLICATIVE: 12,
  AS: 13,
  PREFIX: 14,
  POSTFIX: 15,
  INDEX: 16,
  MEMBER: 17,
  CALL: 18,
};

module.exports = grammar({
  name: 'kotlin',

  conflicts: $ => [
    // [$.type, $.receiver_type],
    // [$.receiver_type],
    [$.class_body, $.enum_class_body], // both can be empty {}
    // [$.variable_declaration],
    // [$.function_type],
    // [$.type, $.receiver_type],
    // [$.receiver_type],
    // [$.delegation_specifiers, $.receiver_type],
    // [$.definitely_non_nullable_type],
    // [$.parameters_with_optional_type, $.function_type_parameters],
  ],

  externals: $ => [
    $._semi,
  ],

  extras: $ => [
    $.comment,
    /\s/,
  ],

  inline: $ => [
    // $.delegation_specifier,
    // $.annotation_delegation_specifier,
    // $.receiver_type,
    // $.type_reference,
    // $.definitely_non_nullable_type,
    // $.parameters_with_optional_type,
    // $.function_type_parameters,
  ],

  supertypes: $ => [
    $.declaration,
    $.expression,
    $.literal,
  ],

  word: $ => $.identifier,

  rules: {
    kotlin_file: $ => seq(
      optional($.shebang_line),
      repeat($.file_annotation),
      optional($.package_header),
      optional($.import_list),
      choice(
        repeat(seq($.statement, $._semi)),
      ),
    ),

    shebang_line: _ => seq('#!', /[^\r\n]*/),

    file_annotation: $ => seq(
      '@',
      'file',
      ':',
      choice(seq('[', repeat1($.unescaped_annotation), ']'), $.unescaped_annotation),
    ),
    package_header: $ => seq('package', $._header_identifier, optional($._semi)),

    import_list: $ => repeat1($.import),
    import: $ => seq(
      'import',
      $._header_identifier,
      optional(choice(seq('.', '*'), $.import_alias)),
      optional($._semi),
    ),
    import_alias: $ => seq('as', $.identifier),

    type_alias: $ => seq(
      optional($.modifiers),
      'typealias',
      $.identifier,
      optional($.type_parameters),
      '=',
      $.type,
    ),

    declaration: $ => choice(
      $.class_declaration,
      $.object_declaration,
      $.function_declaration,
      $.property_declaration,
      $.type_alias,
    ),

    // Classes

    class_declaration: $ => prec.right(seq(
      optional($.modifiers),
      choice('class', seq(optional('fun'), 'interface')),
      $.identifier,
      optional($.type_parameters),
      optional($.primary_constructor),
      // optional(seq(':', $.delegation_specifiers)),
      optional($.type_constraints),
      optional(choice($.class_body, $.enum_class_body)),
    )),

    primary_constructor: $ => seq(
      optional(seq(optional($.modifiers), 'constructor')),
      $.class_parameters,
    ),
    //
    class_body: $ => seq(
      '{',
      repeat(seq($.class_member_declaration, optional($._semi))),
      '}',
    ),

    class_parameters: $ => seq(
      '(',
      optionalCommaSep($.class_parameter),
      ')',
    ),

    class_parameter: $ => seq(
      optional($.modifiers),
      optional(choice('val', 'var')),
      $.identifier,
      ':',
      $.type,
      optional(seq('=', $.expression)),
    ),

    // delegation_specifiers: $ => prec.right(commaSep1(
    //   $.annotation_delegation_specifier,
    // )),
    //
    // delegation_specifier: $ => prec.right(choice(
    //   $.constructor_invocation,
    //   $.explicit_delegation,
    //   $.user_type,
    //   $.function_type,
    //   seq('suspend', $.function_type),
    // )),
    //
    constructor_invocation: $ => seq(
      $.user_type,
      $.value_arguments,
    ),
    //
    // annotation_delegation_specifier: $ => prec.right(seq(
    //   // repeat($.annotation),
    //   $.delegation_specifier,
    // )),
    //
    // explicit_delegation: $ => seq(
    //   choice($.user_type, $.function_type),
    //   'by',
    //   $.expression,
    // ),
    //
    type_parameters: $ => seq(
      '<',
      $.type_parameter,
      repeat(seq(',', $.type_parameter)),
      optional(','),
      '>',
    ),

    type_parameter: $ => seq(
      repeat($.type_parameter_modifier),
      $.identifier,
      optional(seq(':', $.type)),
    ),

    type_constraints: $ => prec.right(seq(
      'where',
      commaSep1($.type_constraint),
    )),

    type_constraint: $ => seq(/* repeat($.annotation),*/ $.identifier, ':', $.type),

    // Class Members

    class_member_declaration: $ => choice(
      $.declaration,
      $.companion_object,
      $.anonymous_initializer,
      $.secondary_constructor,
    ),

    anonymous_initializer: $ => seq(
      'init',
      $.block,
    ),

    companion_object: $ => prec.right(seq(
      optional($.modifiers),
      'companion',
      'object',
      optional($.identifier),
      // optional(seq(':', $.delegation_specifiers)),
      optional($.class_body),
    )),

    function_value_parameters: $ => seq(
      '(',
      optionalCommaSep($.function_value_parameter),
      ')',
    ),

    function_value_parameter: $ => seq(
      optional($.parameter_modifiers),
      $.parameter,
      optional(seq('=', $.expression)),
    ),

    function_declaration: $ => prec.right(seq(
      optional($.modifiers),
      'fun',
      optional($.type_parameters),
      // optional(seq($.receiver_type, '.')),
      $.identifier,
      $.function_value_parameters,
      optional(seq(':', $.type)),
      optional($.type_constraints),
      optional($.function_body),
    )),

    function_body: $ => choice(
      $.block,
      seq('=', $.expression),
    ),

    variable_declaration: $ => prec.right(seq(
      // repeat($.annotation),
      $.identifier,
      optional(seq(':', $.type)),
    )),

    multi_variable_declaration: $ => seq(
      '(',
      optionalCommaSep1($.variable_declaration),
      ')',
    ),

    property_declaration: $ => prec.right(seq(
      optional($.modifiers),
      choice('val', 'var'),
      optional($.type_parameters),
      // optional(seq($.receiver_type, '.')),
      choice($.multi_variable_declaration, $.variable_declaration),
      optional($.type_constraints),
      optional(choice(seq('=', $.expression), $.property_delegate)),
      optional(';'),
      // ((getter? (semi? setter)?) | (setter? (semi? getter)?))
      optional(choice(
        seq(
          optional($.getter),
          optional(seq(optional($._semi), $.setter)),
        ),
        seq(
          optional($.setter),
          optional(seq(optional($._semi), $.getter)),
        ),
      )),
    )),

    property_delegate: $ => seq(
      'by',
      $.expression,
    ),

    getter: $ => prec.right(seq(
      optional($.modifiers),
      'get',
      optional(seq(
        '(',
        ')',
        optional(seq(':', $.type)),
        $.function_body,
      )),
    )),

    setter: $ => prec.right(seq(
      optional($.modifiers),
      'set',
      optional(seq(
        '(',
        // $.function_value_parameter_with_optional_type,
        optional(','),
        ')',
        optional(seq(':', $.type)),
        $.function_body,
      )),
    )),

    // parameters_with_optional_type: $ => prec.right(-1, seq(
    //   '(',
    //   optionalCommaSep($.function_value_parameter_with_optional_type),
    //   ')',
    // )),
    //
    // function_value_parameter_with_optional_type: $ => seq(
    //   repeat($.parameter_modifiers),
    //   $.parameter_with_optional_type,
    //   optional(seq('=', $.expression)),
    // ),
    //
    // parameter_with_optional_type: $ => seq(
    //   $.identifier,
    //   optional(seq(':', $.type)),
    // ),
    //
    // // NOTE: prec for parameter_with_optional_type
    parameter: $ => seq($.identifier, ':', $.type),

    object_declaration: $ => prec.right(seq(
      optional($.modifiers),
      'object',
      $.identifier,
      // optional(seq(':', $.delegation_specifiers)),
      optional($.class_body),
    )),

    secondary_constructor: $ => prec.right(seq(
      optional($.modifiers),
      'constructor',
      $.function_value_parameters,
      optional(seq(':', $.constructor_delegation_call)),
      optional($.block),
    )),

    constructor_delegation_call: $ => seq(
      choice('this', 'super'),
      $.value_arguments,
    ),

    // // Enum Classes

    enum_class_body: $ => seq(
      '{',
      optionalCommaSep($.enum_entry),
      optional(seq(';', repeat(seq($.class_member_declaration, optional($._semi))))),
      '}',
    ),

    enum_entry: $ => seq(
      optional($.modifiers),
      $.identifier,
      optional($.value_arguments),
      optional($.class_body),
    ),

    // Types

    type: $ => prec.right(seq(
      repeat($.type_modifier),
      choice(
        // $.function_type,
        $.parenthesized_type,
        $.nullable_type,
        $.type_reference,
        $.definitely_non_nullable_type,
      ),
    )),

    type_reference: $ => prec.right(1, choice($.user_type, 'dynamic')),

    nullable_type: $ => prec.right(seq(
      choice($.type_reference, $.parenthesized_type),
      repeat1('?'),
    )),

    user_type: $ => prec.right(seq(
      $.simple_user_type,
      repeat(seq('.', $.simple_user_type)),
    )),
    simple_user_type: $ => prec.right(1, seq(
      $.identifier,
      // optional($.type_arguments),
    )),
    //
    // type_projection: $ => choice(
    //   seq(repeat($.type_projection_modifier), $.type),
    //   '*',
    // ),
    //
    // type_projection_modifier: $ => choice($.variance_modifier/* , $.annotation*/),
    //
    // function_type: $ => seq(
    //   // optional(seq($.receiver_type, '.')),
    //   $.function_type_parameters,
    //   '->',
    //   $.type,
    // ),
    //
    // function_type_parameters: $ => seq(
    //   '(',
    //   optionalCommaSep(choice($.parameter, $.type)),
    //   ')',
    // ),

    parenthesized_type: $ => prec.right(PREC.PARENTHESES, seq(
      '(',
      $.type,
      ')',
    )),
    //
    // // receiver_type: $ => prec(1, seq(
    // //   repeat($.type_modifier),
    // //   choice($.parenthesized_type, $.nullable_type, $.type_reference),
    // // )),
    //
    parenthesized_user_type: $ => seq('(', choice($.user_type, $.parenthesized_user_type), ')'),

    definitely_non_nullable_type: $ => seq(
      // repeat($.type_modifier),
      choice($.user_type, $.parenthesized_user_type),
      '&',
      // repeat($.type_modifier),
      choice($.user_type, $.parenthesized_user_type),
    ),

    // Statements

    statements: $ => seq(
      $.statement,
      repeat(seq($._semi, $.statement)),
      optional($._semi),
    ),

    statement: $ => seq(
      // repeat(choice($.label, $.annotation)),
      choice(
        $.declaration,
        // $.loop_statement,
        // $.expression,
      ),
    ),

    label: $ => prec.right(-1, seq($.identifier, optional('@'))),

    control_structure_body: $ => choice(
      $.block,
      $.statement,
    ),

    // // prec over lambda literal
    block: $ => seq(
      '{',
      // $.statements,
      optional(
        seq(
          $.statement,
          repeat(seq($._semi, $.statement)),
        ),
      ),
      optional($._semi),
      '}',
    ),
    //
    // loop_statement: $ => choice(
    //   $.for_statement,
    //   $.while_statement,
    //   $.do_while_statement,
    // ),
    //
    // for_statement: $ => prec.right(seq(
    //   'for',
    //   '(',
    //   // repeat($.annotation),
    //   choice($.variable_declaration, $.multi_variable_declaration),
    //   'in',
    //   $.expression,
    //   ')',
    //   optional($.control_structure_body),
    // )),
    //
    // while_statement: $ => seq(
    //   'while',
    //   '(',
    //   $.expression,
    //   ')',
    //   choice($.control_structure_body, ';'),
    // ),
    //
    // do_while_statement: $ => prec.right(seq(
    //   'do',
    //   optional($.control_structure_body),
    //   'while',
    //   '(',
    //   $.expression,
    //   ')',
    // )),
    //
    // // Expressions
    //
    expression: $ => choice(
      $.assignment_expression,
      $.unary_expression,
      $.binary_expression,
      // $.in_expression,
      // $.is_expression,
      // $.range_expression,
      // $.as_expression,
      // $.index_expression,
      // $.member_expression,
      // $.call_expression,
      $.primary_expression,
    ),

    assignment_expression: $ => prec.left(PREC.ASSIGNMENT, seq(
      choice(
        seq($.expression, '='),
        seq($.primary_expression, choice('+=', '-=', '*=', '/=', '%=')),
      ),
      $.expression,
    )),

    primary_expression: $ => prec.right(choice(
      $.parenthesized_expression,
      $.identifier,
      $.literal,
      $.string,
      // $.callable_reference,
      $.function_literal,
      $.object_literal,
      $.collection_literal,
      $.this_expression,
      $.super_expression,
      $.if_expression,
      $.when_expression,
      $.try_expression,
      $.jump_expression,
    )),

    unary_expression: $ => choice(
      prec.right(PREC.PREFIX, seq(
        field('operator', choice('+', '-', '++', '--', '!', $.label)),
        field('argument', $.primary_expression),
      )),
      prec.right(PREC.POSTFIX, seq(
        field('argument', $.primary_expression),
        field('operator', choice('++', '--', '.', '?.', '?')),
      )),
    ),

    binary_expression: $ => {
      const table = [
        ['*', PREC.SPREAD],
        ['||', PREC.DISJUNCTION],
        ['&&', PREC.CONJUNCTION],
        ['==', PREC.EQUALITY],
        ['!=', PREC.EQUALITY],
        ['===', PREC.EQUALITY],
        ['!==', PREC.EQUALITY],
        ['<', PREC.COMPARISON],
        ['>', PREC.COMPARISON],
        ['<=', PREC.COMPARISON],
        ['>=', PREC.COMPARISON],
        ['?:', PREC.ELVIS],
        ['..', PREC.RANGE],
        ['+', PREC.ADDITIVE],
        ['-', PREC.ADDITIVE],
        ['*', PREC.MULTIPLICATIVE],
        ['/', PREC.MULTIPLICATIVE],
        ['%', PREC.MULTIPLICATIVE],
      ];

      return choice(...table.map(([operator, precedence]) => {
        return prec.left(precedence, seq(
          field('left', $.primary_expression),
          // @ts-ignore
          field('operator', operator),
          field('right', $.primary_expression),
        ));
      }));
    },

    // in_expression: $ => prec.right(PREC.INFIX, seq(
    //   field('left', $.expression),
    //   seq(
    //     field('operator', choice('in', '!in')),
    //     field('right', $.expression),
    //   ),
    // )),
    //
    // is_expression: $ => prec.right(PREC.INFIX, seq(
    //   field('left', $.expression),
    //   seq(
    //     field('operator', choice('is', '!is')),
    //     field('right', $.type),
    //   ),
    // )),
    //
    // range_expression: $ => prec.right(PREC.RANGE, seq(
    //   field('left', $.expression),
    //   field('operator', '..'),
    //   field('right', $.expression),
    // )),
    //
    // as_expression: $ => prec.right(PREC.AS, seq(
    //   field('left', $.expression),
    //   field('operator', choice('as', 'as?')),
    //   field('right', $.type),
    // )),
    //
    // index_expression: $ => prec.right(PREC.INDEX, seq(
    //   $.expression,
    //   '[',
    //   optionalCommaSep($.expression),
    //   ']',
    // )),
    //
    // member_expression: $ => prec.right(PREC.MEMBER, seq(
    //   $.expression,
    //   choice('.', '?.', '::'),
    //   $.expression,
    // )),
    //
    // call_expression: $ => prec.right(PREC.CALL, seq(
    //   $.expression,
    //   optional($.type_arguments),
    //   choice(
    //     seq(optional($.value_arguments), $.annotated_lambda),
    //     $.value_arguments,
    //   ),
    // )),
    //
    // annotated_lambda: $ => seq(
    //   // repeat($.annotation),
    //   optional($.label),
    //   $.lambda_literal,
    // ),
    //
    // type_arguments: $ => seq(
    //   '<',
    //   optionalCommaSep1($.type_projection),
    //   '>',
    // ),
    //
    value_arguments: $ => seq(
      '(',
      optionalCommaSep($.value_argument),
      ')',
    ),

    value_argument: $ => seq(
      // optional($.annotation),
      optional(seq($.identifier, '=')),
      optional('*'),
      $.identifier, // FIXME: REMOVE
      $.expression,
    ),

    parenthesized_expression: $ => prec(PREC.PARENTHESES, seq(
      '(',
      $.expression,
      ')',
    )),

    collection_literal: $ => seq(
      '[',
      optionalCommaSep($.expression),
      ']',
    ),

    lambda_literal: $ => seq(
      '{',
      optional(
        seq(optionalCommaSep($.lambda_parameter), '->'),
      ),
      // $.statements
      optional(
        seq(
          $.statement,
          repeat(seq($._semi, $.statement)),
        ),
      ),
      optional($._semi),
      '}',
    ),

    lambda_parameter: $ => choice(
      $.variable_declaration,
      seq($.multi_variable_declaration, optional(seq(':', $.type))),
    ),

    anonymous_function: $ => prec.right(seq(
      'fun',
      optional(seq($.type, '.')),
      // $.parameters_with_optional_type,
      optional(seq(':', $.type)),
      // optional($.type_constraints),
      optional($.function_body),
    )),


    function_literal: $ => choice(
      $.lambda_literal,
      $.anonymous_function,
    ),

    object_literal: $ => prec.right(seq(
      'object',
      // optional(seq(':', $.delegation_specifiers)),
      optional($.class_body),
    )),

    this_expression: _ => choice('this', 'this@'),

    super_expression: $ => prec.right(choice(
      seq(
        'super',
        optional(seq('<', $.type, '>')),
        optional(seq('@', $.identifier)),
      ),
      'super@',
    )),

    if_expression: $ => prec.right(seq(
      'if',
      '(',
      $.expression,
      ')',
      choice(
        $.control_structure_body,
        seq(
          optional($.control_structure_body),
          optional(';'),
          'else',
          choice($.control_structure_body, ';'),
        ),
        ';',
      ),
    )),

    when_subject: $ => seq(
      '(',
      optional(seq(
        // repeat($.annotation),
        'val',
        $.variable_declaration,
        '=',
      )),
      $.expression,
      ')',
    ),

    when_expression: $ => seq(
      'when',
      optional($.when_subject),
      '{',
      repeat($.when_entry),
      '}',
    ),

    when_entry: $ => choice(
      seq(optionalCommaSep1($.expression), '->', $.control_structure_body, optional($._semi)),
      seq('else', '->', $.control_structure_body, optional($._semi)),
    ),

    try_expression: $ => seq(
      'try',
      $.block,
      choice(
        seq(repeat1($.catch_block), optional($.finally_block)),
        $.finally_block,
      ),
    ),

    catch_block: $ => seq(
      'catch',
      '(',
      // repeat($.annotation),
      $.identifier,
      ':',
      $.type,
      optional(','),
      ')',
      $.block,
    ),

    finally_block: $ => seq(
      'finally',
      $.block,
    ),

    jump_expression: $ => prec.right(choice(
      seq('throw', $.expression),
      seq(choice('return', 'return@'), optional($.expression)),
      'continue', 'continue@',
      'break', 'break@',
    )),

    // callable_reference: $ => seq(
    //   // optional($.receiver_type),
    //   '::',
    //   choice($.identifier, 'class'),
    // ),

    // // Modifiers

    parameter_modifiers: $ => prec.right(choice(
      // $.annotation,
      repeat1($.parameter_modifier),
    )),

    modifiers: $ => prec(1, choice(/* $.annotation,*/ repeat1($.modifier))),
    //
    // // FIXME: check prec later
    type_modifier: $ => choice(/* $.annotation, */'suspend'),
    //
    modifier: $ => choice(
      $.class_modifier,
      $.member_modifier,
      $.visibility_modifier,
      $.function_modifier,
      $.property_modifier,
      $.inheritance_modifier,
      $.parameter_modifier,
      $.platform_modifier,
    ),

    class_modifier: _ => choice(
      'enum',
      'sealed',
      'annotation',
      'data',
      'inner',
      'value',
    ),

    member_modifier: _ => choice(
      'override',
      'lateinit',
    ),

    visibility_modifier: _ => choice(
      'public',
      'private',
      'internal',
      'protected',
    ),

    variance_modifier: _ => choice(
      'in',
      'out',
    ),

    type_parameter_modifier: $ => choice(
      $.reification_modifier,
      $.variance_modifier,
      // $.annotation,
    ),

    function_modifier: _ => choice(
      'tailrec',
      'operator',
      'infix',
      'inline',
      'external',
      'suspend',
    ),

    property_modifier: _ => 'const',

    inheritance_modifier: _ => choice(
      'abstract',
      'final',
      'open',
    ),

    parameter_modifier: _ => choice(
      'vararg',
      'noinline',
      'crossinline',
    ),

    reification_modifier: _ => 'reified',

    platform_modifier: _ => choice(
      'expect',
      'actual',
    ),

    // // Annotations
    //
    // // annotation: $ => choice(
    // //   $.single_annotation,
    // //   $.multi_annotation,
    // // ),
    //
    // single_annotation: $ => seq(
    //   choice($.annotation_use_site_target, '@'),
    //   $.unescaped_annotation,
    // ),
    //
    // multi_annotation: $ => seq(
    //   choice($.annotation_use_site_target, '@'),
    //   '[',
    //   repeat1($.unescaped_annotation),
    //   ']',
    // ),
    //
    // annotation_use_site_target: _ => seq(
    //   '@',
    //   choice(
    //     'field',
    //     'property',
    //     'get',
    //     'set',
    //     'receiver',
    //     'param',
    //     'setparam',
    //     'delegate',
    //   ),
    //   ':',
    // ),
    //
    unescaped_annotation: $ => prec.right(choice(
      $.constructor_invocation,
      $.user_type,
    )),
    //
    literal: $ => choice(
      $.number,
      $.float,
      $.character,
      $.boolean,
      $.null,
    ),

    string: $ => choice($._string_literal, $._multiline_string_literal),

    _string_literal: $ => seq(
      '"',
      repeat(choice(
        $.string_content,
        $._escape_sequence,
      )),
      '"',
    ),
    _multiline_string_literal: $ => seq(
      '"""',
      repeat(choice(
        alias($._multiline_string_content, $.string_content),
        $._escape_sequence,
      )),
      '"""',
    ),

    character: $ => seq(
      '\'',
      choice(
        /[^'\\]/,
        $._escape_sequence,
      ),
    ),

    // Workaround to https://github.com/tree-sitter/tree-sitter/issues/1156
    // We give names to the token_ constructs containing a regexp
    // so as to obtain a node in the CST.
    //
    string_content: _ => token.immediate(prec(1, /[^"\\]+/)),
    _multiline_string_content: _ => prec.right(choice(
      /[^"]+/,
      seq(/"[^"]*"/, repeat(/[^"]+/)),
    )),

    _escape_sequence: $ => choice(
      prec(2, token.immediate(seq('\\', /[^abfnrtvxu'\"\\\?]/))),
      prec(1, $.escape_sequence),
    ),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(
        /[^xu0-7]/,
        /[0-7]{1,3}/,
        /x[0-9a-fA-F]{2}/,
        /u[0-9a-fA-F]{4}/,
        /u{[0-9a-fA-F]+}/,
        /U[0-9a-fA-F]{8}/,
      ),
    )),

    number: _ => {
      const decimal = /[0-9][0-9_]*/;
      const hex = /0[xX][0-9a-fA-F][0-9a-fA-F_]*/;
      const bin = /0[bB][01][01_]*/;

      return token(seq(
        choice(decimal, hex, bin),
        optional(/[uU][lL]?|[lL]/),
      ));
    },

    float: _ => {
      const decimal = /[0-9][0-9_]*/;
      const exponent = seq(/[eE][+-]?/, decimal);

      return token(choice(
        seq(
          choice(
            seq(optional(decimal), '.', decimal, optional(exponent)),
            seq(decimal, exponent),
          ),
          optional(choice('f', 'F')),
        ),
        seq(decimal, choice('f', 'F')),
      ));
    },

    boolean: _ => choice('true', 'false'),

    null: _ => 'null',

    _header_identifier: $ => prec.right(seq($.identifier, repeat(seq('.', $.identifier)))),
    identifier: _ => token(choice(
      /[a-zA-Z_][a-zA-Z0-9_]*/,
      /`[^`\r\n]+`/,
    )),

    // _semi: _ => choice(':', ';'),

    comment: _ => token(seq('//', /.*/)),
  },
});

/**
 * Creates a rule to match zero or more of the rules separated by a comma
 * optionally followed by a comma.
 *
 * @param {Rule} rule
 *
 * @return {SeqRule}
 *
 */
function optionalCommaSep(rule) {
  return seq(commaSep(rule), optional(','));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 * optionally followed by a comma.
 *
 * @param {Rule} rule
 *
 * @return {SeqRule}
 *
 */
function optionalCommaSep1(rule) {
  return seq(commaSep1(rule), optional(','));
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @return {ChoiceRule}
 *
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @return {SeqRule}
 *
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
