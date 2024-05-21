import path from 'path';
import fs from 'fs';
import Module from 'module';
import { resolveExports } from 'resolve-pkg-maps';

function slash(path) {
	const isExtendedLengthPath = path.startsWith('\\\\?\\');

	if (isExtendedLengthPath) {
		return path;
	}

	return path.replace(/\\/g, '/');
}

const cacheFs = (name) => {
  const method = fs[name];
  return (cache, ...args) => {
    const cacheKey = `${name}:${args.join(":")}`;
    let result = cache == null ? void 0 : cache.get(cacheKey);
    if (result === void 0) {
      result = Reflect.apply(method, fs, args);
      cache == null ? void 0 : cache.set(cacheKey, result);
    }
    return result;
  };
};
const exists = cacheFs("existsSync");
const readFile = cacheFs("readFileSync");
const stat = cacheFs("statSync");

const findUp = (searchPath, fileName, cache) => {
  while (true) {
    const configPath = path.posix.join(searchPath, fileName);
    if (exists(cache, configPath)) {
      return configPath;
    }
    const parentPath = path.dirname(searchPath);
    if (parentPath === searchPath) {
      return;
    }
    searchPath = parentPath;
  }
};

const isRelativePathPattern = /^\.{1,2}(\/.*)?$/;

const normalizePath = (filePath) => {
  const normalizedPath = slash(filePath);
  return isRelativePathPattern.test(normalizedPath) ? normalizedPath : `./${normalizedPath}`;
};

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Creates a JSON scanner on the given text.
 * If ignoreTrivia is set, whitespaces or comments are ignored.
 */
function createScanner(text, ignoreTrivia = false) {
    const len = text.length;
    let pos = 0, value = '', tokenOffset = 0, token = 16 /* SyntaxKind.Unknown */, lineNumber = 0, lineStartOffset = 0, tokenLineStartOffset = 0, prevTokenLineStartOffset = 0, scanError = 0 /* ScanError.None */;
    function scanHexDigits(count, exact) {
        let digits = 0;
        let value = 0;
        while (digits < count || !exact) {
            let ch = text.charCodeAt(pos);
            if (ch >= 48 /* CharacterCodes._0 */ && ch <= 57 /* CharacterCodes._9 */) {
                value = value * 16 + ch - 48 /* CharacterCodes._0 */;
            }
            else if (ch >= 65 /* CharacterCodes.A */ && ch <= 70 /* CharacterCodes.F */) {
                value = value * 16 + ch - 65 /* CharacterCodes.A */ + 10;
            }
            else if (ch >= 97 /* CharacterCodes.a */ && ch <= 102 /* CharacterCodes.f */) {
                value = value * 16 + ch - 97 /* CharacterCodes.a */ + 10;
            }
            else {
                break;
            }
            pos++;
            digits++;
        }
        if (digits < count) {
            value = -1;
        }
        return value;
    }
    function setPosition(newPosition) {
        pos = newPosition;
        value = '';
        tokenOffset = 0;
        token = 16 /* SyntaxKind.Unknown */;
        scanError = 0 /* ScanError.None */;
    }
    function scanNumber() {
        let start = pos;
        if (text.charCodeAt(pos) === 48 /* CharacterCodes._0 */) {
            pos++;
        }
        else {
            pos++;
            while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
            }
        }
        if (pos < text.length && text.charCodeAt(pos) === 46 /* CharacterCodes.dot */) {
            pos++;
            if (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
                while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                    pos++;
                }
            }
            else {
                scanError = 3 /* ScanError.UnexpectedEndOfNumber */;
                return text.substring(start, pos);
            }
        }
        let end = pos;
        if (pos < text.length && (text.charCodeAt(pos) === 69 /* CharacterCodes.E */ || text.charCodeAt(pos) === 101 /* CharacterCodes.e */)) {
            pos++;
            if (pos < text.length && text.charCodeAt(pos) === 43 /* CharacterCodes.plus */ || text.charCodeAt(pos) === 45 /* CharacterCodes.minus */) {
                pos++;
            }
            if (pos < text.length && isDigit(text.charCodeAt(pos))) {
                pos++;
                while (pos < text.length && isDigit(text.charCodeAt(pos))) {
                    pos++;
                }
                end = pos;
            }
            else {
                scanError = 3 /* ScanError.UnexpectedEndOfNumber */;
            }
        }
        return text.substring(start, end);
    }
    function scanString() {
        let result = '', start = pos;
        while (true) {
            if (pos >= len) {
                result += text.substring(start, pos);
                scanError = 2 /* ScanError.UnexpectedEndOfString */;
                break;
            }
            const ch = text.charCodeAt(pos);
            if (ch === 34 /* CharacterCodes.doubleQuote */) {
                result += text.substring(start, pos);
                pos++;
                break;
            }
            if (ch === 92 /* CharacterCodes.backslash */) {
                result += text.substring(start, pos);
                pos++;
                if (pos >= len) {
                    scanError = 2 /* ScanError.UnexpectedEndOfString */;
                    break;
                }
                const ch2 = text.charCodeAt(pos++);
                switch (ch2) {
                    case 34 /* CharacterCodes.doubleQuote */:
                        result += '\"';
                        break;
                    case 92 /* CharacterCodes.backslash */:
                        result += '\\';
                        break;
                    case 47 /* CharacterCodes.slash */:
                        result += '/';
                        break;
                    case 98 /* CharacterCodes.b */:
                        result += '\b';
                        break;
                    case 102 /* CharacterCodes.f */:
                        result += '\f';
                        break;
                    case 110 /* CharacterCodes.n */:
                        result += '\n';
                        break;
                    case 114 /* CharacterCodes.r */:
                        result += '\r';
                        break;
                    case 116 /* CharacterCodes.t */:
                        result += '\t';
                        break;
                    case 117 /* CharacterCodes.u */:
                        const ch3 = scanHexDigits(4, true);
                        if (ch3 >= 0) {
                            result += String.fromCharCode(ch3);
                        }
                        else {
                            scanError = 4 /* ScanError.InvalidUnicode */;
                        }
                        break;
                    default:
                        scanError = 5 /* ScanError.InvalidEscapeCharacter */;
                }
                start = pos;
                continue;
            }
            if (ch >= 0 && ch <= 0x1f) {
                if (isLineBreak(ch)) {
                    result += text.substring(start, pos);
                    scanError = 2 /* ScanError.UnexpectedEndOfString */;
                    break;
                }
                else {
                    scanError = 6 /* ScanError.InvalidCharacter */;
                    // mark as error but continue with string
                }
            }
            pos++;
        }
        return result;
    }
    function scanNext() {
        value = '';
        scanError = 0 /* ScanError.None */;
        tokenOffset = pos;
        lineStartOffset = lineNumber;
        prevTokenLineStartOffset = tokenLineStartOffset;
        if (pos >= len) {
            // at the end
            tokenOffset = len;
            return token = 17 /* SyntaxKind.EOF */;
        }
        let code = text.charCodeAt(pos);
        // trivia: whitespace
        if (isWhiteSpace(code)) {
            do {
                pos++;
                value += String.fromCharCode(code);
                code = text.charCodeAt(pos);
            } while (isWhiteSpace(code));
            return token = 15 /* SyntaxKind.Trivia */;
        }
        // trivia: newlines
        if (isLineBreak(code)) {
            pos++;
            value += String.fromCharCode(code);
            if (code === 13 /* CharacterCodes.carriageReturn */ && text.charCodeAt(pos) === 10 /* CharacterCodes.lineFeed */) {
                pos++;
                value += '\n';
            }
            lineNumber++;
            tokenLineStartOffset = pos;
            return token = 14 /* SyntaxKind.LineBreakTrivia */;
        }
        switch (code) {
            // tokens: []{}:,
            case 123 /* CharacterCodes.openBrace */:
                pos++;
                return token = 1 /* SyntaxKind.OpenBraceToken */;
            case 125 /* CharacterCodes.closeBrace */:
                pos++;
                return token = 2 /* SyntaxKind.CloseBraceToken */;
            case 91 /* CharacterCodes.openBracket */:
                pos++;
                return token = 3 /* SyntaxKind.OpenBracketToken */;
            case 93 /* CharacterCodes.closeBracket */:
                pos++;
                return token = 4 /* SyntaxKind.CloseBracketToken */;
            case 58 /* CharacterCodes.colon */:
                pos++;
                return token = 6 /* SyntaxKind.ColonToken */;
            case 44 /* CharacterCodes.comma */:
                pos++;
                return token = 5 /* SyntaxKind.CommaToken */;
            // strings
            case 34 /* CharacterCodes.doubleQuote */:
                pos++;
                value = scanString();
                return token = 10 /* SyntaxKind.StringLiteral */;
            // comments
            case 47 /* CharacterCodes.slash */:
                const start = pos - 1;
                // Single-line comment
                if (text.charCodeAt(pos + 1) === 47 /* CharacterCodes.slash */) {
                    pos += 2;
                    while (pos < len) {
                        if (isLineBreak(text.charCodeAt(pos))) {
                            break;
                        }
                        pos++;
                    }
                    value = text.substring(start, pos);
                    return token = 12 /* SyntaxKind.LineCommentTrivia */;
                }
                // Multi-line comment
                if (text.charCodeAt(pos + 1) === 42 /* CharacterCodes.asterisk */) {
                    pos += 2;
                    const safeLength = len - 1; // For lookahead.
                    let commentClosed = false;
                    while (pos < safeLength) {
                        const ch = text.charCodeAt(pos);
                        if (ch === 42 /* CharacterCodes.asterisk */ && text.charCodeAt(pos + 1) === 47 /* CharacterCodes.slash */) {
                            pos += 2;
                            commentClosed = true;
                            break;
                        }
                        pos++;
                        if (isLineBreak(ch)) {
                            if (ch === 13 /* CharacterCodes.carriageReturn */ && text.charCodeAt(pos) === 10 /* CharacterCodes.lineFeed */) {
                                pos++;
                            }
                            lineNumber++;
                            tokenLineStartOffset = pos;
                        }
                    }
                    if (!commentClosed) {
                        pos++;
                        scanError = 1 /* ScanError.UnexpectedEndOfComment */;
                    }
                    value = text.substring(start, pos);
                    return token = 13 /* SyntaxKind.BlockCommentTrivia */;
                }
                // just a single slash
                value += String.fromCharCode(code);
                pos++;
                return token = 16 /* SyntaxKind.Unknown */;
            // numbers
            case 45 /* CharacterCodes.minus */:
                value += String.fromCharCode(code);
                pos++;
                if (pos === len || !isDigit(text.charCodeAt(pos))) {
                    return token = 16 /* SyntaxKind.Unknown */;
                }
            // found a minus, followed by a number so
            // we fall through to proceed with scanning
            // numbers
            case 48 /* CharacterCodes._0 */:
            case 49 /* CharacterCodes._1 */:
            case 50 /* CharacterCodes._2 */:
            case 51 /* CharacterCodes._3 */:
            case 52 /* CharacterCodes._4 */:
            case 53 /* CharacterCodes._5 */:
            case 54 /* CharacterCodes._6 */:
            case 55 /* CharacterCodes._7 */:
            case 56 /* CharacterCodes._8 */:
            case 57 /* CharacterCodes._9 */:
                value += scanNumber();
                return token = 11 /* SyntaxKind.NumericLiteral */;
            // literals and unknown symbols
            default:
                // is a literal? Read the full word.
                while (pos < len && isUnknownContentCharacter(code)) {
                    pos++;
                    code = text.charCodeAt(pos);
                }
                if (tokenOffset !== pos) {
                    value = text.substring(tokenOffset, pos);
                    // keywords: true, false, null
                    switch (value) {
                        case 'true': return token = 8 /* SyntaxKind.TrueKeyword */;
                        case 'false': return token = 9 /* SyntaxKind.FalseKeyword */;
                        case 'null': return token = 7 /* SyntaxKind.NullKeyword */;
                    }
                    return token = 16 /* SyntaxKind.Unknown */;
                }
                // some
                value += String.fromCharCode(code);
                pos++;
                return token = 16 /* SyntaxKind.Unknown */;
        }
    }
    function isUnknownContentCharacter(code) {
        if (isWhiteSpace(code) || isLineBreak(code)) {
            return false;
        }
        switch (code) {
            case 125 /* CharacterCodes.closeBrace */:
            case 93 /* CharacterCodes.closeBracket */:
            case 123 /* CharacterCodes.openBrace */:
            case 91 /* CharacterCodes.openBracket */:
            case 34 /* CharacterCodes.doubleQuote */:
            case 58 /* CharacterCodes.colon */:
            case 44 /* CharacterCodes.comma */:
            case 47 /* CharacterCodes.slash */:
                return false;
        }
        return true;
    }
    function scanNextNonTrivia() {
        let result;
        do {
            result = scanNext();
        } while (result >= 12 /* SyntaxKind.LineCommentTrivia */ && result <= 15 /* SyntaxKind.Trivia */);
        return result;
    }
    return {
        setPosition: setPosition,
        getPosition: () => pos,
        scan: ignoreTrivia ? scanNextNonTrivia : scanNext,
        getToken: () => token,
        getTokenValue: () => value,
        getTokenOffset: () => tokenOffset,
        getTokenLength: () => pos - tokenOffset,
        getTokenStartLine: () => lineStartOffset,
        getTokenStartCharacter: () => tokenOffset - prevTokenLineStartOffset,
        getTokenError: () => scanError,
    };
}
function isWhiteSpace(ch) {
    return ch === 32 /* CharacterCodes.space */ || ch === 9 /* CharacterCodes.tab */;
}
function isLineBreak(ch) {
    return ch === 10 /* CharacterCodes.lineFeed */ || ch === 13 /* CharacterCodes.carriageReturn */;
}
function isDigit(ch) {
    return ch >= 48 /* CharacterCodes._0 */ && ch <= 57 /* CharacterCodes._9 */;
}
var CharacterCodes;
(function (CharacterCodes) {
    CharacterCodes[CharacterCodes["lineFeed"] = 10] = "lineFeed";
    CharacterCodes[CharacterCodes["carriageReturn"] = 13] = "carriageReturn";
    CharacterCodes[CharacterCodes["space"] = 32] = "space";
    CharacterCodes[CharacterCodes["_0"] = 48] = "_0";
    CharacterCodes[CharacterCodes["_1"] = 49] = "_1";
    CharacterCodes[CharacterCodes["_2"] = 50] = "_2";
    CharacterCodes[CharacterCodes["_3"] = 51] = "_3";
    CharacterCodes[CharacterCodes["_4"] = 52] = "_4";
    CharacterCodes[CharacterCodes["_5"] = 53] = "_5";
    CharacterCodes[CharacterCodes["_6"] = 54] = "_6";
    CharacterCodes[CharacterCodes["_7"] = 55] = "_7";
    CharacterCodes[CharacterCodes["_8"] = 56] = "_8";
    CharacterCodes[CharacterCodes["_9"] = 57] = "_9";
    CharacterCodes[CharacterCodes["a"] = 97] = "a";
    CharacterCodes[CharacterCodes["b"] = 98] = "b";
    CharacterCodes[CharacterCodes["c"] = 99] = "c";
    CharacterCodes[CharacterCodes["d"] = 100] = "d";
    CharacterCodes[CharacterCodes["e"] = 101] = "e";
    CharacterCodes[CharacterCodes["f"] = 102] = "f";
    CharacterCodes[CharacterCodes["g"] = 103] = "g";
    CharacterCodes[CharacterCodes["h"] = 104] = "h";
    CharacterCodes[CharacterCodes["i"] = 105] = "i";
    CharacterCodes[CharacterCodes["j"] = 106] = "j";
    CharacterCodes[CharacterCodes["k"] = 107] = "k";
    CharacterCodes[CharacterCodes["l"] = 108] = "l";
    CharacterCodes[CharacterCodes["m"] = 109] = "m";
    CharacterCodes[CharacterCodes["n"] = 110] = "n";
    CharacterCodes[CharacterCodes["o"] = 111] = "o";
    CharacterCodes[CharacterCodes["p"] = 112] = "p";
    CharacterCodes[CharacterCodes["q"] = 113] = "q";
    CharacterCodes[CharacterCodes["r"] = 114] = "r";
    CharacterCodes[CharacterCodes["s"] = 115] = "s";
    CharacterCodes[CharacterCodes["t"] = 116] = "t";
    CharacterCodes[CharacterCodes["u"] = 117] = "u";
    CharacterCodes[CharacterCodes["v"] = 118] = "v";
    CharacterCodes[CharacterCodes["w"] = 119] = "w";
    CharacterCodes[CharacterCodes["x"] = 120] = "x";
    CharacterCodes[CharacterCodes["y"] = 121] = "y";
    CharacterCodes[CharacterCodes["z"] = 122] = "z";
    CharacterCodes[CharacterCodes["A"] = 65] = "A";
    CharacterCodes[CharacterCodes["B"] = 66] = "B";
    CharacterCodes[CharacterCodes["C"] = 67] = "C";
    CharacterCodes[CharacterCodes["D"] = 68] = "D";
    CharacterCodes[CharacterCodes["E"] = 69] = "E";
    CharacterCodes[CharacterCodes["F"] = 70] = "F";
    CharacterCodes[CharacterCodes["G"] = 71] = "G";
    CharacterCodes[CharacterCodes["H"] = 72] = "H";
    CharacterCodes[CharacterCodes["I"] = 73] = "I";
    CharacterCodes[CharacterCodes["J"] = 74] = "J";
    CharacterCodes[CharacterCodes["K"] = 75] = "K";
    CharacterCodes[CharacterCodes["L"] = 76] = "L";
    CharacterCodes[CharacterCodes["M"] = 77] = "M";
    CharacterCodes[CharacterCodes["N"] = 78] = "N";
    CharacterCodes[CharacterCodes["O"] = 79] = "O";
    CharacterCodes[CharacterCodes["P"] = 80] = "P";
    CharacterCodes[CharacterCodes["Q"] = 81] = "Q";
    CharacterCodes[CharacterCodes["R"] = 82] = "R";
    CharacterCodes[CharacterCodes["S"] = 83] = "S";
    CharacterCodes[CharacterCodes["T"] = 84] = "T";
    CharacterCodes[CharacterCodes["U"] = 85] = "U";
    CharacterCodes[CharacterCodes["V"] = 86] = "V";
    CharacterCodes[CharacterCodes["W"] = 87] = "W";
    CharacterCodes[CharacterCodes["X"] = 88] = "X";
    CharacterCodes[CharacterCodes["Y"] = 89] = "Y";
    CharacterCodes[CharacterCodes["Z"] = 90] = "Z";
    CharacterCodes[CharacterCodes["asterisk"] = 42] = "asterisk";
    CharacterCodes[CharacterCodes["backslash"] = 92] = "backslash";
    CharacterCodes[CharacterCodes["closeBrace"] = 125] = "closeBrace";
    CharacterCodes[CharacterCodes["closeBracket"] = 93] = "closeBracket";
    CharacterCodes[CharacterCodes["colon"] = 58] = "colon";
    CharacterCodes[CharacterCodes["comma"] = 44] = "comma";
    CharacterCodes[CharacterCodes["dot"] = 46] = "dot";
    CharacterCodes[CharacterCodes["doubleQuote"] = 34] = "doubleQuote";
    CharacterCodes[CharacterCodes["minus"] = 45] = "minus";
    CharacterCodes[CharacterCodes["openBrace"] = 123] = "openBrace";
    CharacterCodes[CharacterCodes["openBracket"] = 91] = "openBracket";
    CharacterCodes[CharacterCodes["plus"] = 43] = "plus";
    CharacterCodes[CharacterCodes["slash"] = 47] = "slash";
    CharacterCodes[CharacterCodes["formFeed"] = 12] = "formFeed";
    CharacterCodes[CharacterCodes["tab"] = 9] = "tab";
})(CharacterCodes || (CharacterCodes = {}));

new Array(20).fill(0).map((_, index) => {
    return ' '.repeat(index);
});
const maxCachedValues = 200;
({
    ' ': {
        '\n': new Array(maxCachedValues).fill(0).map((_, index) => {
            return '\n' + ' '.repeat(index);
        }),
        '\r': new Array(maxCachedValues).fill(0).map((_, index) => {
            return '\r' + ' '.repeat(index);
        }),
        '\r\n': new Array(maxCachedValues).fill(0).map((_, index) => {
            return '\r\n' + ' '.repeat(index);
        }),
    },
    '\t': {
        '\n': new Array(maxCachedValues).fill(0).map((_, index) => {
            return '\n' + '\t'.repeat(index);
        }),
        '\r': new Array(maxCachedValues).fill(0).map((_, index) => {
            return '\r' + '\t'.repeat(index);
        }),
        '\r\n': new Array(maxCachedValues).fill(0).map((_, index) => {
            return '\r\n' + '\t'.repeat(index);
        }),
    }
});

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var ParseOptions;
(function (ParseOptions) {
    ParseOptions.DEFAULT = {
        allowTrailingComma: false
    };
})(ParseOptions || (ParseOptions = {}));
/**
 * Parses the given text and returns the object the JSON content represents. On invalid input, the parser tries to be as fault tolerant as possible, but still return a result.
 * Therefore always check the errors list to find out if the input was valid.
 */
function parse$1(text, errors = [], options = ParseOptions.DEFAULT) {
    let currentProperty = null;
    let currentParent = [];
    const previousParents = [];
    function onValue(value) {
        if (Array.isArray(currentParent)) {
            currentParent.push(value);
        }
        else if (currentProperty !== null) {
            currentParent[currentProperty] = value;
        }
    }
    const visitor = {
        onObjectBegin: () => {
            const object = {};
            onValue(object);
            previousParents.push(currentParent);
            currentParent = object;
            currentProperty = null;
        },
        onObjectProperty: (name) => {
            currentProperty = name;
        },
        onObjectEnd: () => {
            currentParent = previousParents.pop();
        },
        onArrayBegin: () => {
            const array = [];
            onValue(array);
            previousParents.push(currentParent);
            currentParent = array;
            currentProperty = null;
        },
        onArrayEnd: () => {
            currentParent = previousParents.pop();
        },
        onLiteralValue: onValue,
        onError: (error, offset, length) => {
            errors.push({ error, offset, length });
        }
    };
    visit(text, visitor, options);
    return currentParent[0];
}
/**
 * Parses the given text and invokes the visitor functions for each object, array and literal reached.
 */
function visit(text, visitor, options = ParseOptions.DEFAULT) {
    const _scanner = createScanner(text, false);
    // Important: Only pass copies of this to visitor functions to prevent accidental modification, and
    // to not affect visitor functions which stored a reference to a previous JSONPath
    const _jsonPath = [];
    function toNoArgVisit(visitFunction) {
        return visitFunction ? () => visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter()) : () => true;
    }
    function toNoArgVisitWithPath(visitFunction) {
        return visitFunction ? () => visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter(), () => _jsonPath.slice()) : () => true;
    }
    function toOneArgVisit(visitFunction) {
        return visitFunction ? (arg) => visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter()) : () => true;
    }
    function toOneArgVisitWithPath(visitFunction) {
        return visitFunction ? (arg) => visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter(), () => _jsonPath.slice()) : () => true;
    }
    const onObjectBegin = toNoArgVisitWithPath(visitor.onObjectBegin), onObjectProperty = toOneArgVisitWithPath(visitor.onObjectProperty), onObjectEnd = toNoArgVisit(visitor.onObjectEnd), onArrayBegin = toNoArgVisitWithPath(visitor.onArrayBegin), onArrayEnd = toNoArgVisit(visitor.onArrayEnd), onLiteralValue = toOneArgVisitWithPath(visitor.onLiteralValue), onSeparator = toOneArgVisit(visitor.onSeparator), onComment = toNoArgVisit(visitor.onComment), onError = toOneArgVisit(visitor.onError);
    const disallowComments = options && options.disallowComments;
    const allowTrailingComma = options && options.allowTrailingComma;
    function scanNext() {
        while (true) {
            const token = _scanner.scan();
            switch (_scanner.getTokenError()) {
                case 4 /* ScanError.InvalidUnicode */:
                    handleError(14 /* ParseErrorCode.InvalidUnicode */);
                    break;
                case 5 /* ScanError.InvalidEscapeCharacter */:
                    handleError(15 /* ParseErrorCode.InvalidEscapeCharacter */);
                    break;
                case 3 /* ScanError.UnexpectedEndOfNumber */:
                    handleError(13 /* ParseErrorCode.UnexpectedEndOfNumber */);
                    break;
                case 1 /* ScanError.UnexpectedEndOfComment */:
                    if (!disallowComments) {
                        handleError(11 /* ParseErrorCode.UnexpectedEndOfComment */);
                    }
                    break;
                case 2 /* ScanError.UnexpectedEndOfString */:
                    handleError(12 /* ParseErrorCode.UnexpectedEndOfString */);
                    break;
                case 6 /* ScanError.InvalidCharacter */:
                    handleError(16 /* ParseErrorCode.InvalidCharacter */);
                    break;
            }
            switch (token) {
                case 12 /* SyntaxKind.LineCommentTrivia */:
                case 13 /* SyntaxKind.BlockCommentTrivia */:
                    if (disallowComments) {
                        handleError(10 /* ParseErrorCode.InvalidCommentToken */);
                    }
                    else {
                        onComment();
                    }
                    break;
                case 16 /* SyntaxKind.Unknown */:
                    handleError(1 /* ParseErrorCode.InvalidSymbol */);
                    break;
                case 15 /* SyntaxKind.Trivia */:
                case 14 /* SyntaxKind.LineBreakTrivia */:
                    break;
                default:
                    return token;
            }
        }
    }
    function handleError(error, skipUntilAfter = [], skipUntil = []) {
        onError(error);
        if (skipUntilAfter.length + skipUntil.length > 0) {
            let token = _scanner.getToken();
            while (token !== 17 /* SyntaxKind.EOF */) {
                if (skipUntilAfter.indexOf(token) !== -1) {
                    scanNext();
                    break;
                }
                else if (skipUntil.indexOf(token) !== -1) {
                    break;
                }
                token = scanNext();
            }
        }
    }
    function parseString(isValue) {
        const value = _scanner.getTokenValue();
        if (isValue) {
            onLiteralValue(value);
        }
        else {
            onObjectProperty(value);
            // add property name afterwards
            _jsonPath.push(value);
        }
        scanNext();
        return true;
    }
    function parseLiteral() {
        switch (_scanner.getToken()) {
            case 11 /* SyntaxKind.NumericLiteral */:
                const tokenValue = _scanner.getTokenValue();
                let value = Number(tokenValue);
                if (isNaN(value)) {
                    handleError(2 /* ParseErrorCode.InvalidNumberFormat */);
                    value = 0;
                }
                onLiteralValue(value);
                break;
            case 7 /* SyntaxKind.NullKeyword */:
                onLiteralValue(null);
                break;
            case 8 /* SyntaxKind.TrueKeyword */:
                onLiteralValue(true);
                break;
            case 9 /* SyntaxKind.FalseKeyword */:
                onLiteralValue(false);
                break;
            default:
                return false;
        }
        scanNext();
        return true;
    }
    function parseProperty() {
        if (_scanner.getToken() !== 10 /* SyntaxKind.StringLiteral */) {
            handleError(3 /* ParseErrorCode.PropertyNameExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
            return false;
        }
        parseString(false);
        if (_scanner.getToken() === 6 /* SyntaxKind.ColonToken */) {
            onSeparator(':');
            scanNext(); // consume colon
            if (!parseValue()) {
                handleError(4 /* ParseErrorCode.ValueExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
            }
        }
        else {
            handleError(5 /* ParseErrorCode.ColonExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
        }
        _jsonPath.pop(); // remove processed property name
        return true;
    }
    function parseObject() {
        onObjectBegin();
        scanNext(); // consume open brace
        let needsComma = false;
        while (_scanner.getToken() !== 2 /* SyntaxKind.CloseBraceToken */ && _scanner.getToken() !== 17 /* SyntaxKind.EOF */) {
            if (_scanner.getToken() === 5 /* SyntaxKind.CommaToken */) {
                if (!needsComma) {
                    handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
                }
                onSeparator(',');
                scanNext(); // consume comma
                if (_scanner.getToken() === 2 /* SyntaxKind.CloseBraceToken */ && allowTrailingComma) {
                    break;
                }
            }
            else if (needsComma) {
                handleError(6 /* ParseErrorCode.CommaExpected */, [], []);
            }
            if (!parseProperty()) {
                handleError(4 /* ParseErrorCode.ValueExpected */, [], [2 /* SyntaxKind.CloseBraceToken */, 5 /* SyntaxKind.CommaToken */]);
            }
            needsComma = true;
        }
        onObjectEnd();
        if (_scanner.getToken() !== 2 /* SyntaxKind.CloseBraceToken */) {
            handleError(7 /* ParseErrorCode.CloseBraceExpected */, [2 /* SyntaxKind.CloseBraceToken */], []);
        }
        else {
            scanNext(); // consume close brace
        }
        return true;
    }
    function parseArray() {
        onArrayBegin();
        scanNext(); // consume open bracket
        let isFirstElement = true;
        let needsComma = false;
        while (_scanner.getToken() !== 4 /* SyntaxKind.CloseBracketToken */ && _scanner.getToken() !== 17 /* SyntaxKind.EOF */) {
            if (_scanner.getToken() === 5 /* SyntaxKind.CommaToken */) {
                if (!needsComma) {
                    handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
                }
                onSeparator(',');
                scanNext(); // consume comma
                if (_scanner.getToken() === 4 /* SyntaxKind.CloseBracketToken */ && allowTrailingComma) {
                    break;
                }
            }
            else if (needsComma) {
                handleError(6 /* ParseErrorCode.CommaExpected */, [], []);
            }
            if (isFirstElement) {
                _jsonPath.push(0);
                isFirstElement = false;
            }
            else {
                _jsonPath[_jsonPath.length - 1]++;
            }
            if (!parseValue()) {
                handleError(4 /* ParseErrorCode.ValueExpected */, [], [4 /* SyntaxKind.CloseBracketToken */, 5 /* SyntaxKind.CommaToken */]);
            }
            needsComma = true;
        }
        onArrayEnd();
        if (!isFirstElement) {
            _jsonPath.pop(); // remove array index
        }
        if (_scanner.getToken() !== 4 /* SyntaxKind.CloseBracketToken */) {
            handleError(8 /* ParseErrorCode.CloseBracketExpected */, [4 /* SyntaxKind.CloseBracketToken */], []);
        }
        else {
            scanNext(); // consume close bracket
        }
        return true;
    }
    function parseValue() {
        switch (_scanner.getToken()) {
            case 3 /* SyntaxKind.OpenBracketToken */:
                return parseArray();
            case 1 /* SyntaxKind.OpenBraceToken */:
                return parseObject();
            case 10 /* SyntaxKind.StringLiteral */:
                return parseString(true);
            default:
                return parseLiteral();
        }
    }
    scanNext();
    if (_scanner.getToken() === 17 /* SyntaxKind.EOF */) {
        if (options.allowEmptyContent) {
            return true;
        }
        handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
        return false;
    }
    if (!parseValue()) {
        handleError(4 /* ParseErrorCode.ValueExpected */, [], []);
        return false;
    }
    if (_scanner.getToken() !== 17 /* SyntaxKind.EOF */) {
        handleError(9 /* ParseErrorCode.EndOfFileExpected */, [], []);
    }
    return true;
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var ScanError;
(function (ScanError) {
    ScanError[ScanError["None"] = 0] = "None";
    ScanError[ScanError["UnexpectedEndOfComment"] = 1] = "UnexpectedEndOfComment";
    ScanError[ScanError["UnexpectedEndOfString"] = 2] = "UnexpectedEndOfString";
    ScanError[ScanError["UnexpectedEndOfNumber"] = 3] = "UnexpectedEndOfNumber";
    ScanError[ScanError["InvalidUnicode"] = 4] = "InvalidUnicode";
    ScanError[ScanError["InvalidEscapeCharacter"] = 5] = "InvalidEscapeCharacter";
    ScanError[ScanError["InvalidCharacter"] = 6] = "InvalidCharacter";
})(ScanError || (ScanError = {}));
var SyntaxKind;
(function (SyntaxKind) {
    SyntaxKind[SyntaxKind["OpenBraceToken"] = 1] = "OpenBraceToken";
    SyntaxKind[SyntaxKind["CloseBraceToken"] = 2] = "CloseBraceToken";
    SyntaxKind[SyntaxKind["OpenBracketToken"] = 3] = "OpenBracketToken";
    SyntaxKind[SyntaxKind["CloseBracketToken"] = 4] = "CloseBracketToken";
    SyntaxKind[SyntaxKind["CommaToken"] = 5] = "CommaToken";
    SyntaxKind[SyntaxKind["ColonToken"] = 6] = "ColonToken";
    SyntaxKind[SyntaxKind["NullKeyword"] = 7] = "NullKeyword";
    SyntaxKind[SyntaxKind["TrueKeyword"] = 8] = "TrueKeyword";
    SyntaxKind[SyntaxKind["FalseKeyword"] = 9] = "FalseKeyword";
    SyntaxKind[SyntaxKind["StringLiteral"] = 10] = "StringLiteral";
    SyntaxKind[SyntaxKind["NumericLiteral"] = 11] = "NumericLiteral";
    SyntaxKind[SyntaxKind["LineCommentTrivia"] = 12] = "LineCommentTrivia";
    SyntaxKind[SyntaxKind["BlockCommentTrivia"] = 13] = "BlockCommentTrivia";
    SyntaxKind[SyntaxKind["LineBreakTrivia"] = 14] = "LineBreakTrivia";
    SyntaxKind[SyntaxKind["Trivia"] = 15] = "Trivia";
    SyntaxKind[SyntaxKind["Unknown"] = 16] = "Unknown";
    SyntaxKind[SyntaxKind["EOF"] = 17] = "EOF";
})(SyntaxKind || (SyntaxKind = {}));
/**
 * Parses the given text and returns the object the JSON content represents. On invalid input, the parser tries to be as fault tolerant as possible, but still return a result.
 * Therefore, always check the errors list to find out if the input was valid.
 */
const parse = parse$1;
var ParseErrorCode;
(function (ParseErrorCode) {
    ParseErrorCode[ParseErrorCode["InvalidSymbol"] = 1] = "InvalidSymbol";
    ParseErrorCode[ParseErrorCode["InvalidNumberFormat"] = 2] = "InvalidNumberFormat";
    ParseErrorCode[ParseErrorCode["PropertyNameExpected"] = 3] = "PropertyNameExpected";
    ParseErrorCode[ParseErrorCode["ValueExpected"] = 4] = "ValueExpected";
    ParseErrorCode[ParseErrorCode["ColonExpected"] = 5] = "ColonExpected";
    ParseErrorCode[ParseErrorCode["CommaExpected"] = 6] = "CommaExpected";
    ParseErrorCode[ParseErrorCode["CloseBraceExpected"] = 7] = "CloseBraceExpected";
    ParseErrorCode[ParseErrorCode["CloseBracketExpected"] = 8] = "CloseBracketExpected";
    ParseErrorCode[ParseErrorCode["EndOfFileExpected"] = 9] = "EndOfFileExpected";
    ParseErrorCode[ParseErrorCode["InvalidCommentToken"] = 10] = "InvalidCommentToken";
    ParseErrorCode[ParseErrorCode["UnexpectedEndOfComment"] = 11] = "UnexpectedEndOfComment";
    ParseErrorCode[ParseErrorCode["UnexpectedEndOfString"] = 12] = "UnexpectedEndOfString";
    ParseErrorCode[ParseErrorCode["UnexpectedEndOfNumber"] = 13] = "UnexpectedEndOfNumber";
    ParseErrorCode[ParseErrorCode["InvalidUnicode"] = 14] = "InvalidUnicode";
    ParseErrorCode[ParseErrorCode["InvalidEscapeCharacter"] = 15] = "InvalidEscapeCharacter";
    ParseErrorCode[ParseErrorCode["InvalidCharacter"] = 16] = "InvalidCharacter";
})(ParseErrorCode || (ParseErrorCode = {}));

const readJsonc = (jsonPath, cache) => parse(readFile(cache, jsonPath, "utf8"));

const implicitBaseUrlSymbol = Symbol("implicitBaseUrl");

const getPnpApi = () => {
  const { findPnpApi } = Module;
  return findPnpApi && findPnpApi(process.cwd());
};
const resolveFromPackageJsonPath = (packageJsonPath, subpath, ignoreExports, cache) => {
  const cacheKey = `resolveFromPackageJsonPath:${packageJsonPath}:${subpath}:${ignoreExports}`;
  if (cache == null ? void 0 : cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  const packageJson = readJsonc(packageJsonPath, cache);
  if (!packageJson) {
    return;
  }
  let resolvedPath = subpath || "tsconfig.json";
  if (!ignoreExports && packageJson.exports) {
    try {
      const [resolvedExport] = resolveExports(packageJson.exports, subpath, ["require", "types"]);
      resolvedPath = resolvedExport;
    } catch {
      return false;
    }
  } else if (!subpath && packageJson.tsconfig) {
    resolvedPath = packageJson.tsconfig;
  }
  resolvedPath = path.join(
    packageJsonPath,
    "..",
    resolvedPath
  );
  cache == null ? void 0 : cache.set(cacheKey, resolvedPath);
  return resolvedPath;
};
const PACKAGE_JSON = "package.json";
const TS_CONFIG_JSON = "tsconfig.json";
const resolveExtendsPath = (requestedPath, directoryPath, cache) => {
  let filePath = requestedPath;
  if (requestedPath === "..") {
    filePath = path.join(filePath, TS_CONFIG_JSON);
  }
  if (requestedPath[0] === ".") {
    filePath = path.resolve(directoryPath, filePath);
  }
  if (path.isAbsolute(filePath)) {
    if (exists(cache, filePath)) {
      if (stat(cache, filePath).isFile()) {
        return filePath;
      }
    } else if (!filePath.endsWith(".json")) {
      const jsonPath = `${filePath}.json`;
      if (exists(cache, jsonPath)) {
        return jsonPath;
      }
    }
    return;
  }
  const [orgOrName, ...remaining] = requestedPath.split("/");
  const packageName = orgOrName[0] === "@" ? `${orgOrName}/${remaining.shift()}` : orgOrName;
  const subpath = remaining.join("/");
  const pnpApi = getPnpApi();
  if (pnpApi) {
    const { resolveRequest: resolveWithPnp } = pnpApi;
    try {
      if (packageName === requestedPath) {
        const packageJsonPath2 = resolveWithPnp(
          path.join(packageName, PACKAGE_JSON),
          directoryPath
        );
        if (packageJsonPath2) {
          const resolvedPath = resolveFromPackageJsonPath(
            packageJsonPath2,
            subpath,
            false,
            cache
          );
          if (resolvedPath && exists(cache, resolvedPath)) {
            return resolvedPath;
          }
        }
      } else {
        let resolved;
        try {
          resolved = resolveWithPnp(
            requestedPath,
            directoryPath,
            { extensions: [".json"] }
          );
        } catch {
          resolved = resolveWithPnp(
            path.join(requestedPath, TS_CONFIG_JSON),
            directoryPath
          );
        }
        if (resolved) {
          return resolved;
        }
      }
    } catch {
    }
  }
  const packagePath = findUp(
    path.resolve(directoryPath),
    path.join("node_modules", packageName),
    cache
  );
  if (!packagePath || !stat(cache, packagePath).isDirectory()) {
    return;
  }
  const packageJsonPath = path.join(packagePath, PACKAGE_JSON);
  if (exists(cache, packageJsonPath)) {
    const resolvedPath = resolveFromPackageJsonPath(
      packageJsonPath,
      subpath,
      false,
      cache
    );
    if (resolvedPath === false) {
      return;
    }
    if (resolvedPath && exists(cache, resolvedPath) && stat(cache, resolvedPath).isFile()) {
      return resolvedPath;
    }
  }
  const fullPackagePath = path.join(packagePath, subpath);
  const jsonExtension = fullPackagePath.endsWith(".json");
  if (!jsonExtension) {
    const fullPackagePathWithJson = `${fullPackagePath}.json`;
    if (exists(cache, fullPackagePathWithJson)) {
      return fullPackagePathWithJson;
    }
  }
  if (!exists(cache, fullPackagePath)) {
    return;
  }
  if (stat(cache, fullPackagePath).isDirectory()) {
    const fullPackageJsonPath = path.join(fullPackagePath, PACKAGE_JSON);
    if (exists(cache, fullPackageJsonPath)) {
      const resolvedPath = resolveFromPackageJsonPath(
        fullPackageJsonPath,
        "",
        true,
        cache
      );
      if (resolvedPath && exists(cache, resolvedPath)) {
        return resolvedPath;
      }
    }
    const tsconfigPath = path.join(fullPackagePath, TS_CONFIG_JSON);
    if (exists(cache, tsconfigPath)) {
      return tsconfigPath;
    }
  } else if (jsonExtension) {
    return fullPackagePath;
  }
};

class TsconfigError extends Error {
}
const resolveExtends = (extendsPath, tsconfigPath, circularExtendsTracker, cache) => {
  const fromDirectoryPath = path.dirname(tsconfigPath);
  const resolvedExtendsPath = resolveExtendsPath(
    extendsPath,
    fromDirectoryPath,
    cache
  );
  if (!resolvedExtendsPath) {
    throw new TsconfigError(`${path.relative(process.cwd(), tsconfigPath)}: File '${extendsPath}' not found.`);
  }
  if (circularExtendsTracker.has(resolvedExtendsPath)) {
    throw new TsconfigError(`Circularity detected while resolving configuration: ${resolvedExtendsPath}`);
  }
  circularExtendsTracker.add(resolvedExtendsPath);
  const extendsDirectoryPath = path.dirname(resolvedExtendsPath);
  const extendsConfig = _parseTsconfig(resolvedExtendsPath, cache, circularExtendsTracker);
  delete extendsConfig.references;
  const { compilerOptions } = extendsConfig;
  if (compilerOptions) {
    const resolvePaths = ["baseUrl", "outDir"];
    for (const property of resolvePaths) {
      const unresolvedPath = compilerOptions[property];
      if (unresolvedPath) {
        compilerOptions[property] = slash(path.relative(
          fromDirectoryPath,
          path.join(extendsDirectoryPath, unresolvedPath)
        )) || "./";
      }
    }
  }
  if (extendsConfig.files) {
    extendsConfig.files = extendsConfig.files.map(
      (file) => slash(path.relative(
        fromDirectoryPath,
        path.join(extendsDirectoryPath, file)
      ))
    );
  }
  if (extendsConfig.include) {
    extendsConfig.include = extendsConfig.include.map(
      (file) => slash(path.relative(
        fromDirectoryPath,
        path.join(extendsDirectoryPath, file)
      ))
    );
  }
  if (extendsConfig.exclude) {
    extendsConfig.exclude = extendsConfig.exclude.map(
      (file) => slash(path.relative(
        fromDirectoryPath,
        path.join(extendsDirectoryPath, file)
      ))
    );
  }
  return extendsConfig;
};
const _parseTsconfig = (tsconfigPath, cache, circularExtendsTracker = /* @__PURE__ */ new Set()) => {
  let config;
  try {
    config = readJsonc(tsconfigPath, cache) || {};
  } catch {
    throw new TsconfigError(`Cannot resolve tsconfig at path: ${tsconfigPath}`);
  }
  if (typeof config !== "object") {
    throw new SyntaxError(`Failed to parse tsconfig at: ${tsconfigPath}`);
  }
  const directoryPath = path.dirname(tsconfigPath);
  if (config.compilerOptions) {
    const { compilerOptions } = config;
    if (compilerOptions.paths && !compilerOptions.baseUrl) {
      compilerOptions[implicitBaseUrlSymbol] = directoryPath;
    }
  }
  if (config.extends) {
    const extendsPathList = Array.isArray(config.extends) ? config.extends : [config.extends];
    delete config.extends;
    for (const extendsPath of extendsPathList.reverse()) {
      const extendsConfig = resolveExtends(
        extendsPath,
        tsconfigPath,
        new Set(circularExtendsTracker),
        cache
      );
      const merged = {
        ...extendsConfig,
        ...config,
        compilerOptions: {
          ...extendsConfig.compilerOptions,
          ...config.compilerOptions
        }
      };
      if (extendsConfig.watchOptions) {
        merged.watchOptions = {
          ...extendsConfig.watchOptions,
          ...config.watchOptions
        };
      }
      config = merged;
    }
  }
  if (config.compilerOptions) {
    const { compilerOptions } = config;
    const normalizedPaths = [
      "baseUrl",
      "rootDir"
    ];
    for (const property of normalizedPaths) {
      const unresolvedPath = compilerOptions[property];
      if (unresolvedPath) {
        const resolvedBaseUrl = path.resolve(directoryPath, unresolvedPath);
        const relativeBaseUrl = normalizePath(path.relative(
          directoryPath,
          resolvedBaseUrl
        ));
        compilerOptions[property] = relativeBaseUrl;
      }
    }
    const { outDir } = compilerOptions;
    if (outDir) {
      if (!Array.isArray(config.exclude)) {
        config.exclude = [];
      }
      if (!config.exclude.includes(outDir)) {
        config.exclude.push(outDir);
      }
      compilerOptions.outDir = normalizePath(outDir);
    }
  } else {
    config.compilerOptions = {};
  }
  if (config.files) {
    config.files = config.files.map(normalizePath);
  }
  if (config.include) {
    config.include = config.include.map(slash);
  }
  if (config.watchOptions) {
    const { watchOptions } = config;
    if (watchOptions.excludeDirectories) {
      watchOptions.excludeDirectories = watchOptions.excludeDirectories.map(
        (excludePath) => slash(path.resolve(directoryPath, excludePath))
      );
    }
  }
  return config;
};
const parseTsconfig = (tsconfigPath, cache = /* @__PURE__ */ new Map()) => _parseTsconfig(tsconfigPath, cache);

const getTsconfig = (searchPath = process.cwd(), configName = "tsconfig.json", cache = /* @__PURE__ */ new Map()) => {
  const configFile = findUp(
    slash(searchPath),
    configName,
    cache
  );
  if (!configFile) {
    return null;
  }
  const config = parseTsconfig(configFile, cache);
  return {
    path: configFile,
    config
  };
};

const starPattern = /\*/g;
const assertStarCount = (pattern, errorMessage) => {
  const starCount = pattern.match(starPattern);
  if (starCount && starCount.length > 1) {
    throw new Error(errorMessage);
  }
};
const parsePattern = (pattern) => {
  if (pattern.includes("*")) {
    const [prefix, suffix] = pattern.split("*");
    return {
      prefix,
      suffix
    };
  }
  return pattern;
};
const isPatternMatch = ({ prefix, suffix }, candidate) => candidate.startsWith(prefix) && candidate.endsWith(suffix);

const parsePaths = (paths, baseUrl, absoluteBaseUrl) => Object.entries(paths).map(([pattern, substitutions]) => {
  assertStarCount(pattern, `Pattern '${pattern}' can have at most one '*' character.`);
  return {
    pattern: parsePattern(pattern),
    substitutions: substitutions.map((substitution) => {
      assertStarCount(
        substitution,
        `Substitution '${substitution}' in pattern '${pattern}' can have at most one '*' character.`
      );
      if (!baseUrl && !isRelativePathPattern.test(substitution)) {
        throw new Error("Non-relative paths are not allowed when 'baseUrl' is not set. Did you forget a leading './'?");
      }
      return path.resolve(absoluteBaseUrl, substitution);
    })
  };
});
const createPathsMatcher = (tsconfig) => {
  if (!tsconfig.config.compilerOptions) {
    return null;
  }
  const { baseUrl, paths } = tsconfig.config.compilerOptions;
  const implicitBaseUrl = implicitBaseUrlSymbol in tsconfig.config.compilerOptions && tsconfig.config.compilerOptions[implicitBaseUrlSymbol];
  if (!baseUrl && !paths) {
    return null;
  }
  const resolvedBaseUrl = path.resolve(
    path.dirname(tsconfig.path),
    baseUrl || implicitBaseUrl || "."
  );
  const pathEntries = paths ? parsePaths(paths, baseUrl, resolvedBaseUrl) : [];
  return (specifier) => {
    if (isRelativePathPattern.test(specifier)) {
      return [];
    }
    const patternPathEntries = [];
    for (const pathEntry of pathEntries) {
      if (pathEntry.pattern === specifier) {
        return pathEntry.substitutions.map(slash);
      }
      if (typeof pathEntry.pattern !== "string") {
        patternPathEntries.push(pathEntry);
      }
    }
    let matchedValue;
    let longestMatchPrefixLength = -1;
    for (const pathEntry of patternPathEntries) {
      if (isPatternMatch(pathEntry.pattern, specifier) && pathEntry.pattern.prefix.length > longestMatchPrefixLength) {
        longestMatchPrefixLength = pathEntry.pattern.prefix.length;
        matchedValue = pathEntry;
      }
    }
    if (!matchedValue) {
      return baseUrl ? [slash(path.join(resolvedBaseUrl, specifier))] : [];
    }
    const matchedPath = specifier.slice(
      matchedValue.pattern.prefix.length,
      specifier.length - matchedValue.pattern.suffix.length
    );
    return matchedValue.substitutions.map(
      (substitution) => slash(substitution.replace("*", matchedPath))
    );
  };
};

const s=e=>{let o="";for(let t=0;t<e.length;t+=1){const r=e[t],n=r.toUpperCase();o+=r===n?r.toLowerCase():n;}return o},c=65,a=97,m=()=>Math.floor(Math.random()*26),S=e=>Array.from({length:e},()=>String.fromCodePoint(m()+(Math.random()>.5?c:a))).join(""),l=(e=fs)=>{const o=process.execPath;if(e.existsSync(o))return !e.existsSync(s(o));const t=`/${S(10)}`;e.writeFileSync(t,"");const r=!e.existsSync(s(t));return e.unlinkSync(t),r};

const { join: pathJoin } = path.posix;
const baseExtensions = {
  ts: [".ts", ".tsx", ".d.ts"],
  cts: [".cts", ".d.cts"],
  mts: [".mts", ".d.mts"]
};
const getSupportedExtensions = (compilerOptions) => {
  const ts = [...baseExtensions.ts];
  const cts = [...baseExtensions.cts];
  const mts = [...baseExtensions.mts];
  if (compilerOptions == null ? void 0 : compilerOptions.allowJs) {
    ts.push(".js", ".jsx");
    cts.push(".cjs");
    mts.push(".mjs");
  }
  return [
    ...ts,
    ...cts,
    ...mts
  ];
};
const getDefaultExcludeSpec = (compilerOptions) => {
  const excludesSpec = [];
  if (!compilerOptions) {
    return excludesSpec;
  }
  const { outDir, declarationDir } = compilerOptions;
  if (outDir) {
    excludesSpec.push(outDir);
  }
  if (declarationDir) {
    excludesSpec.push(declarationDir);
  }
  return excludesSpec;
};
const escapeForRegexp = (string) => string.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dependencyDirectories = ["node_modules", "bower_components", "jspm_packages"];
const implicitExcludePathRegexPattern = `(?!(${dependencyDirectories.join("|")})(/|$))`;
const isImplicitGlobPattern = /(?:^|\/)[^.*?]+$/;
const matchAllGlob = "**/*";
const anyCharacter = "[^/]";
const noPeriodOrSlash = "[^./]";
const isWindows = process.platform === "win32";
const createFilesMatcher = ({
  config,
  path: tsconfigPath
}, caseSensitivePaths = l()) => {
  if ("extends" in config) {
    throw new Error("tsconfig#extends must be resolved. Use getTsconfig or parseTsconfig to resolve it.");
  }
  if (!path.isAbsolute(tsconfigPath)) {
    throw new Error("The tsconfig path must be absolute");
  }
  if (isWindows) {
    tsconfigPath = slash(tsconfigPath);
  }
  const projectDirectory = path.dirname(tsconfigPath);
  const {
    files,
    include,
    exclude,
    compilerOptions
  } = config;
  const filesList = files == null ? void 0 : files.map((file) => pathJoin(projectDirectory, file));
  const extensions = getSupportedExtensions(compilerOptions);
  const regexpFlags = caseSensitivePaths ? "" : "i";
  const excludeSpec = exclude || getDefaultExcludeSpec(compilerOptions);
  const excludePatterns = excludeSpec.map((filePath) => {
    const projectFilePath = pathJoin(projectDirectory, filePath);
    const projectFilePathPattern = escapeForRegexp(projectFilePath).replaceAll("\\*\\*/", "(.+/)?").replaceAll("\\*", `${anyCharacter}*`).replaceAll("\\?", anyCharacter);
    return new RegExp(
      `^${projectFilePathPattern}($|/)`,
      regexpFlags
    );
  });
  const includeSpec = files || include ? include : [matchAllGlob];
  const includePatterns = includeSpec ? includeSpec.map((filePath) => {
    let projectFilePath = pathJoin(projectDirectory, filePath);
    if (isImplicitGlobPattern.test(projectFilePath)) {
      projectFilePath = pathJoin(projectFilePath, matchAllGlob);
    }
    const projectFilePathPattern = escapeForRegexp(projectFilePath).replaceAll("/\\*\\*", `(/${implicitExcludePathRegexPattern}${noPeriodOrSlash}${anyCharacter}*)*?`).replaceAll(/(\/)?\\\*/g, (_, hasSlash) => {
      const pattern = `(${noPeriodOrSlash}|(\\.(?!min\\.js$))?)*`;
      if (hasSlash) {
        return `/${implicitExcludePathRegexPattern}${noPeriodOrSlash}${pattern}`;
      }
      return pattern;
    }).replaceAll(/(\/)?\\\?/g, (_, hasSlash) => {
      const pattern = anyCharacter;
      if (hasSlash) {
        return `/${implicitExcludePathRegexPattern}${pattern}`;
      }
      return pattern;
    });
    return new RegExp(
      `^${projectFilePathPattern}$`,
      regexpFlags
    );
  }) : void 0;
  return (filePath) => {
    if (!path.isAbsolute(filePath)) {
      throw new Error("filePath must be absolute");
    }
    if (isWindows) {
      filePath = slash(filePath);
    }
    if (filesList == null ? void 0 : filesList.includes(filePath)) {
      return config;
    }
    if (
      // Invalid extension (case sensitive)
      !extensions.some((extension) => filePath.endsWith(extension)) || excludePatterns.some((pattern) => pattern.test(filePath))
    ) {
      return;
    }
    if (includePatterns && includePatterns.some((pattern) => pattern.test(filePath))) {
      return config;
    }
  };
};

export { createFilesMatcher, createPathsMatcher, getTsconfig, parseTsconfig };
