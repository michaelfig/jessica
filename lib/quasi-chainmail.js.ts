/// <reference path="peg.d.ts"/>

const makeChainmail = (peg: IPegTag<IParserTag<any>>) => {
    const {FAIL, HOLE, SKIP} = peg;
    return peg`
# start production
start <- _WS typeDecl**(SEMI?) _EOF;

typeDecl <- enumDecl / structDecl / interfaceDecl / constDecl;

type <- (primType / "List" _WS / "AnyPointer" _WS / IDENT) typeParameterization?;

LPAREN <- "(" _WS;
RPAREN <- ")" _WS;
COMMA <- "," _WS;

typeParameterization <- LPAREN type**COMMA RPAREN;

primType <- "Void" _WS / "Bool" _WS / intType / floatType / "Text" _WS / "Data" _WS;

# Only "BigInt" is relevant to CapTP.
# Only "BigInt" is not in Cap'n Proto itself, nor maps to anything
# obvious in WASM.
intType <- ("Int8" / "Int16" / "Int32" / "Int64"
/           "UInt8" / "UInt16" / "UInt32" / "UInt64"
/           "BigInt") _WS;

# Only "Float64" is relevant to CapTP
floatType <- ("Float32" / "Float64" / "Float128") _WS;

ENUM <- "enum" _WS;
LBRACE <- "{" _WS;
RBRACE <- "}" _WS;
SEMI <- ";" _WS;
enumDecl <- ENUM type LBRACE (IDENT SEMI)* RBRACE;

STRUCT <- "struct" _WS;
structDecl <- STRUCT type LBRACE memberDecl* RBRACE;

memberDecl <- paramDecl SEMI / typeDecl;

INTERFACE <- "interface" _WS;
interfaceDecl <- INTERFACE type extends? LBRACE methodDecl* RBRACE;

EXTENDS <- "extends" _WS;
extends <- EXTENDS LPAREN type**COMMA RPAREN;

RARROW <- "->" _WS;
methodDecl <- IDENT methodTypeParams? LPAREN paramDecl**COMMA RPAREN (RARROW LPAREN resultDecl**COMMA RPAREN)? SEMI;

LBRACKET <- "[" _WS;
RBRACKET <- "]" _WS;
methodTypeParams <- LBRACKET type**COMMA RBRACKET;

COLON <- ":" _WS;
EQUALS <- "=" _WS;
paramDecl <- IDENT COLON type (EQUALS expr)?;

resultDecl <- (IDENT COLON)? type;

CONST <- "const" _WS;
constDecl <- CONST IDENT COLON type EQUALS expr SEMI;

expr <- STRING / NUMBER;


_EOF <- ~.;

STRING <- < '"' (~'"' character)* '"' > _WS
  / < "'" (~"'" character)* "'" > _WS;

utf8 <-
  [\xc2-\xdf] utf8cont
/ [\xe0-\xef] utf8cont utf8cont
/ [\xf0-\xf4] utf8cont utf8cont utf8cont;

utf8cont <- [\x80-\xbf];

character <-
  escape
/ '\\u' hex hex hex hex
/ ~'\\' ([\x20-\x7f] / utf8);

escape <- '\\' ['"\\bfnrt];
hex <- digit / [a-fA-F];

NUMBER <- < int frac? exp? > _WSN;

MINUS <- "-" _WS;
int <- [1-9] digit+
/ digit
/ MINUS digit
/ MINUS [1-9] digit+;

digit <- [0-9];

frac <- '.' digit+;
exp <- [Ee] [+\-]? digit+;

IDENT <-
< [$A-Za-z_] [$A-Za-z0-9_]* > _WSN;

# _WSN is whitespace or a non-ident character.
_WSN <- ~[$A-Za-z_] _WS    ${_ => SKIP};

# Define Javascript-style comments.
_WS <- [\t\n\r ]* (EOL_COMMENT / MULTILINE_COMMENT)?   ${_ => SKIP};
EOL_COMMENT <- "//" (~[\n\r] .)* _WS;
MULTILINE_COMMENT <- "/*" (~"*/" .)* "*/" _WS;

`;

};

export default makeChainmail;
