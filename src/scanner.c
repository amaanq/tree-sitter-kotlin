#include <tree_sitter/parser.h>
#include <wctype.h>

enum TokenType {
  AUTOMATIC_SEMICOLON,
  MULTILINE_COMMENT,
};

void *tree_sitter_kotlin_external_scanner_create() { return NULL; }
void tree_sitter_kotlin_external_scanner_destroy(void *payload) {}
void tree_sitter_kotlin_external_scanner_reset(void *payload) {}
unsigned tree_sitter_kotlin_external_scanner_serialize(void *payload,
                                                       char *buffer) {
  return 0;
}
void tree_sitter_kotlin_external_scanner_deserialize(void *payload,
                                                     const char *buffer,
                                                     unsigned length) {}

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }
static void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

bool scan_multiline_comment(TSLexer *lexer) {
  if (lexer->lookahead != '/')
    return false;
  advance(lexer);
  if (lexer->lookahead != '*')
    return false;
  advance(lexer);

  bool after_star = false;
  unsigned nesting_depth = 1;
  for (;;) {
    switch (lexer->lookahead) {
    case '*':
      advance(lexer);
      after_star = true;
      break;
    case '/':
      advance(lexer);
      if (after_star) {
        after_star = false;
        nesting_depth--;
        // if (nesting_depth == 0) {
        lexer->result_symbol = MULTILINE_COMMENT;
        mark_end(lexer);
        return true;
        // }
      } else {
        after_star = false;
        if (lexer->lookahead == '*') {
          nesting_depth++;
          advance(lexer);
        }
      }
      break;
    case '\0':
      return false;
    default:
      advance(lexer);
      after_star = false;
      break;
    }
  }
}

static bool scan_whitespace_and_comments(TSLexer *lexer) {
  for (;;) {
    while (iswspace(lexer->lookahead)) {
      skip(lexer);
    }

    if (lexer->lookahead == '/') {
      skip(lexer);

      if (lexer->lookahead == '/') {
        skip(lexer);
        while (lexer->lookahead != 0 && lexer->lookahead != '\n') {
          skip(lexer);
        }
      } else if (lexer->lookahead == '*') {
        skip(lexer);
        while (lexer->lookahead != 0) {
          if (lexer->lookahead == '*') {
            skip(lexer);
            if (lexer->lookahead == '/') {
              skip(lexer);
              break;
            }
          } else {
            skip(lexer);
          }
        }
      } else {
        return false;
      }
    } else {
      return true;
    }
  }
}

static bool scan_automatic_semicolon(TSLexer *lexer) {
  lexer->result_symbol = AUTOMATIC_SEMICOLON;
  lexer->mark_end(lexer);

  for (;;) {
    if (lexer->lookahead == 0)
      return true;
    if (lexer->lookahead == '}')
      return true;
    if (lexer->is_at_included_range_start(lexer))
      return true;
    if (lexer->lookahead == '\n')
      break;
    if (!iswspace(lexer->lookahead))
      return false;
    skip(lexer);
  }

  skip(lexer);

  if (!scan_whitespace_and_comments(lexer))
    return false;

  switch (lexer->lookahead) {
  case ',':
  case '.':
  case ':':
  case ';':
  case '*':
  case '%':
  case '>':
  case '<':
  case '=':
  case '[':
  case '(':
  case '?':
  case '^':
  case '|':
  case '&':
  case '/':
    return false;

  // Insert a semicolon before `--` and `++`, but not before binary `+` or `-`.
  case '+':
    skip(lexer);
    return lexer->lookahead == '+';
  case '-':
    skip(lexer);
    return lexer->lookahead == '-';

  // Don't insert a semicolon before `!=`, but do insert one before a unary `!`.
  case '!':
    skip(lexer);
    return lexer->lookahead != '=';

  // Don't insert a semicolon before `in` or `instanceof`, but do insert one
  // before an identifier.
  case 'i':
    skip(lexer);

    if (lexer->lookahead != 'n')
      return true;
    skip(lexer);

    if (!iswalpha(lexer->lookahead))
      return false;

    for (unsigned i = 0; i < 8; i++) {
      if (lexer->lookahead != "stanceof"[i])
        return true;
      skip(lexer);
    }

    if (!iswalpha(lexer->lookahead))
      return false;
    break;
  }

  return true;
}

bool tree_sitter_kotlin_external_scanner_scan(void *payload, TSLexer *lexer,
                                              const bool *valid_symbols) {
  if (valid_symbols[AUTOMATIC_SEMICOLON]) {
    return scan_automatic_semicolon(lexer);
  }

  // a string might follow after some whitespace, so we can't lookahead
  // until we get rid of it
  while (iswspace(lexer->lookahead)) {
    skip(lexer);
  }

  if (valid_symbols[MULTILINE_COMMENT] && scan_multiline_comment(lexer)) {
    return true;
  }

  return false;
}
