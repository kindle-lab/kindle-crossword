#define _POSIX_C_SOURCE 200809L
#include "crossword.h"

#include <ctype.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    const char *p;
    const char *end;
    char *error;
    size_t error_size;
} Json;

static void fail(Json *j, const char *message) {
    if (j->error && j->error_size) {
        snprintf(j->error, j->error_size, "%s", message);
    }
}

static void ws(Json *j) {
    while (j->p < j->end && isspace((unsigned char)*j->p)) j->p++;
}

static int hex(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static int put_utf8(char **out, size_t *left, uint32_t cp) {
    unsigned char b[4];
    size_t n;
    if (cp <= 0x7f) { b[0] = (unsigned char)cp; n = 1; }
    else if (cp <= 0x7ff) {
        b[0] = (unsigned char)(0xc0 | (cp >> 6));
        b[1] = (unsigned char)(0x80 | (cp & 0x3f)); n = 2;
    } else if (cp <= 0xffff) {
        b[0] = (unsigned char)(0xe0 | (cp >> 12));
        b[1] = (unsigned char)(0x80 | ((cp >> 6) & 0x3f));
        b[2] = (unsigned char)(0x80 | (cp & 0x3f)); n = 3;
    } else if (cp <= 0x10ffff) {
        b[0] = (unsigned char)(0xf0 | (cp >> 18));
        b[1] = (unsigned char)(0x80 | ((cp >> 12) & 0x3f));
        b[2] = (unsigned char)(0x80 | ((cp >> 6) & 0x3f));
        b[3] = (unsigned char)(0x80 | (cp & 0x3f)); n = 4;
    } else return 0;
    if (*left <= n) return 0;
    memcpy(*out, b, n); *out += n; *left -= n; return 1;
}

static int string(Json *j, char *out, size_t out_size) {
    char *dst = out;
    size_t left = out_size;
    if (out_size) out[0] = '\0';
    ws(j);
    if (j->p >= j->end || *j->p != '"') { fail(j, "expected JSON string"); return 0; }
    j->p++;
    while (j->p < j->end && *j->p != '"') {
        uint32_t cp;
        unsigned char c = (unsigned char)*j->p++;
        if (c != '\\') {
            if (left <= 1) { fail(j, "JSON string too long"); return 0; }
            *dst++ = (char)c; left--; continue;
        }
        if (j->p >= j->end) { fail(j, "unfinished JSON escape"); return 0; }
        c = (unsigned char)*j->p++;
        switch (c) {
        case '"': cp = '"'; break; case '\\': cp = '\\'; break;
        case '/': cp = '/'; break; case 'b': cp = '\b'; break;
        case 'f': cp = '\f'; break; case 'n': cp = '\n'; break;
        case 'r': cp = '\r'; break; case 't': cp = '\t'; break;
        case 'u': {
            int i, h; unsigned value = 0;
            if ((size_t)(j->end - j->p) < 4) { fail(j, "short unicode escape"); return 0; }
            for (i = 0; i < 4; i++) { h = hex(j->p[i]); if (h < 0) { fail(j, "bad unicode escape"); return 0; } value = (value << 4) | (unsigned)h; }
            j->p += 4; cp = value;
            if (cp >= 0xd800 && cp <= 0xdbff && j->p + 6 <= j->end && j->p[0] == '\\' && j->p[1] == 'u') {
                unsigned low = 0;
                for (i = 0; i < 4; i++) { h = hex(j->p[2 + i]); if (h < 0) { fail(j, "bad surrogate escape"); return 0; } low = (low << 4) | (unsigned)h; }
                if (low >= 0xdc00 && low <= 0xdfff) { cp = 0x10000u + ((cp - 0xd800u) << 10) + (low - 0xdc00u); j->p += 6; }
            }
            break;
        }
        default: fail(j, "unsupported JSON escape"); return 0;
        }
        if (!put_utf8(&dst, &left, cp)) { fail(j, "decoded JSON string too long"); return 0; }
    }
    if (j->p >= j->end) { fail(j, "unterminated JSON string"); return 0; }
    j->p++;
    if (out_size) *dst = '\0';
    return 1;
}

static int integer(Json *j, int *value) {
    char *end = NULL; long n;
    ws(j); errno = 0; n = strtol(j->p, &end, 10);
    if (end == j->p || errno == ERANGE || n < -2147483647L || n > 2147483647L) { fail(j, "expected JSON integer"); return 0; }
    j->p = end; *value = (int)n; return 1;
}

static int skip_value(Json *j);

static int skip_string(Json *j) {
    ws(j);
    if (j->p >= j->end || *j->p != '"') { fail(j, "expected JSON string"); return 0; }
    j->p++;
    while (j->p < j->end) {
        char c = *j->p++;
        if (c == '"') return 1;
        if (c == '\\' && j->p < j->end) {
            if (*j->p++ == 'u') {
                if ((size_t)(j->end - j->p) < 4) { fail(j, "short unicode escape"); return 0; }
                j->p += 4;
            }
        }
    }
    fail(j, "unterminated JSON string");
    return 0;
}

static int skip_value(Json *j) {
    ws(j);
    if (j->p >= j->end) { fail(j, "missing JSON value"); return 0; }
    if (*j->p == '"') return skip_string(j);
    if (*j->p == '{') {
        j->p++; ws(j); if (j->p < j->end && *j->p == '}') { j->p++; return 1; }
        while (j->p < j->end) {
            if (!skip_string(j)) return 0; ws(j);
            if (j->p >= j->end || *j->p++ != ':') { fail(j, "expected JSON colon"); return 0; }
            if (!skip_value(j)) return 0; ws(j);
            if (j->p >= j->end) break; if (*j->p == '}') { j->p++; return 1; }
            if (*j->p++ != ',') { fail(j, "expected JSON comma"); return 0; } ws(j);
        }
        fail(j, "unterminated JSON object"); return 0;
    }
    if (*j->p == '[') {
        j->p++; ws(j); if (j->p < j->end && *j->p == ']') { j->p++; return 1; }
        while (j->p < j->end) {
            if (!skip_value(j)) return 0; ws(j);
            if (j->p >= j->end) break; if (*j->p == ']') { j->p++; return 1; }
            if (*j->p++ != ',') { fail(j, "expected JSON comma"); return 0; } ws(j);
        }
        fail(j, "unterminated JSON array"); return 0;
    }
    if (strncmp(j->p, "true", 4) == 0) { j->p += 4; return 1; }
    if (strncmp(j->p, "false", 5) == 0) { j->p += 5; return 1; }
    if (strncmp(j->p, "null", 4) == 0) { j->p += 4; return 1; }
    { int ignored; return integer(j, &ignored); }
}

static int expect(Json *j, char c) { ws(j); if (j->p >= j->end || *j->p++ != c) { fail(j, "unexpected JSON punctuation"); return 0; } return 1; }

static int utf8_next(const char **p, const char *end, uint32_t *cp) {
    unsigned char c; int n, i; uint32_t v;
    if (*p >= end) return 0; c = (unsigned char)*(*p)++;
    if (c < 0x80) { *cp = c; return 1; }
    if ((c & 0xe0) == 0xc0) { n = 1; v = c & 0x1f; }
    else if ((c & 0xf0) == 0xe0) { n = 2; v = c & 0x0f; }
    else if ((c & 0xf8) == 0xf0) { n = 3; v = c & 0x07; }
    else return 0;
    if ((size_t)(end - *p) < (size_t)n) return 0;
    for (i = 0; i < n; i++) { c = (unsigned char)*(*p)++; if ((c & 0xc0) != 0x80) return 0; v = (v << 6) | (c & 0x3f); }
    *cp = v; return 1;
}

static int copy_codepoints(const char *s, uint32_t *out, size_t *count) {
    const char *p = s, *end = s + strlen(s); size_t n = 0; uint32_t cp;
    while (p < end) { if (n >= CROSSWORD_MAX_ANSWER - 1 || !utf8_next(&p, end, &cp)) return 0; out[n++] = cp; }
    *count = n; return n > 0;
}

static int clue_fields(Json *j, CrosswordClue *clue) {
    char key[64]; int seen = 0;
    if (!expect(j, '{')) return 0;
    ws(j); if (j->p < j->end && *j->p == '}') { j->p++; fail(j, "empty clue"); return 0; }
    while (j->p < j->end) {
        if (!string(j, key, sizeof(key)) || !expect(j, ':')) return 0;
        if (strcmp(key, "answer") == 0) { if (!string(j, clue->answer, sizeof(clue->answer)) || !copy_codepoints(clue->answer, clue->letters, &clue->letter_count)) return 0; seen |= 1; }
        else if (strcmp(key, "row") == 0) { if (!integer(j, &clue->row)) return 0; seen |= 2; }
        else if (strcmp(key, "col") == 0) { if (!integer(j, &clue->col)) return 0; seen |= 4; }
        else if (strcmp(key, "clue") == 0) { if (!string(j, clue->clue, sizeof(clue->clue))) return 0; }
        else if (strcmp(key, "definition") == 0) { if (!string(j, clue->definition, sizeof(clue->definition))) return 0; }
        else if (strcmp(key, "articleUrl") == 0) { if (!string(j, clue->article_url, sizeof(clue->article_url))) return 0; }
        else if (!skip_value(j)) return 0;
        ws(j); if (j->p >= j->end) break; if (*j->p == '}') { j->p++; return seen == 7; }
        if (*j->p++ != ',') { fail(j, "expected clue comma"); return 0; }
    }
    fail(j, "unterminated clue"); return 0;
}

static int section(Json *j, CrosswordPuzzle *p, CrosswordDirection direction) {
    char key[64];
    if (!expect(j, '{')) return 0;
    ws(j); if (j->p < j->end && *j->p == '}') { j->p++; return 1; }
    while (j->p < j->end) {
        CrosswordClue *clue;
        if (p->clue_count >= CROSSWORD_MAX_CLUES) { fail(j, "too many clues"); return 0; }
        if (!string(j, key, sizeof(key)) || !expect(j, ':')) return 0;
        clue = &p->clues[p->clue_count]; memset(clue, 0, sizeof(*clue));
        clue->number = atoi(key); clue->direction = direction;
        if (!clue_fields(j, clue)) return 0;
        p->clue_count++;
        ws(j); if (j->p >= j->end) break; if (*j->p == '}') { j->p++; return 1; }
        if (*j->p++ != ',') { fail(j, "expected section comma"); return 0; }
    }
    fail(j, "unterminated section"); return 0;
}

int crossword_validate(const CrosswordPuzzle *p, char *error, size_t error_size) {
    size_t i, n; int r, c;
    if (!p || p->clue_count == 0) { snprintf(error, error_size, "puzzle has no clues"); return 0; }
    for (i = 0; i < p->clue_count; i++) {
        const CrosswordClue *q = &p->clues[i];
        if (q->row < 0 || q->row >= CROSSWORD_GRID_SIZE || q->col < 0 || q->col >= CROSSWORD_GRID_SIZE) { snprintf(error, error_size, "clue %d starts outside 10x10 grid", q->number); return 0; }
        for (n = 0; n < q->letter_count; n++) {
            r = q->row + (q->direction == CROSSWORD_DOWN ? (int)n : 0);
            c = q->col + (q->direction == CROSSWORD_ACROSS ? (int)n : 0);
            if (r < 0 || r >= CROSSWORD_GRID_SIZE || c < 0 || c >= CROSSWORD_GRID_SIZE) { snprintf(error, error_size, "clue %d leaves 10x10 grid", q->number); return 0; }
            if (p->occupied[r][c] && p->letters[r][c] != q->letters[n]) { snprintf(error, error_size, "clue %d conflicts at %d,%d", q->number, r, c); return 0; }
        }
    }
    return 1;
}

static void build_grid(CrosswordPuzzle *p) {
    size_t i, n; int r, c;
    memset(p->letters, 0, sizeof(p->letters)); memset(p->occupied, 0, sizeof(p->occupied));
    memset(p->across_numbers, 0, sizeof(p->across_numbers)); memset(p->down_numbers, 0, sizeof(p->down_numbers));
    for (i = 0; i < p->clue_count; i++) {
        CrosswordClue *q = &p->clues[i];
        if (q->direction == CROSSWORD_ACROSS) p->across_numbers[q->row][q->col] = (uint8_t)q->number;
        else p->down_numbers[q->row][q->col] = (uint8_t)q->number;
        for (n = 0; n < q->letter_count; n++) {
            r = q->row + (q->direction == CROSSWORD_DOWN ? (int)n : 0);
            c = q->col + (q->direction == CROSSWORD_ACROSS ? (int)n : 0);
            if (r >= 0 && r < CROSSWORD_GRID_SIZE && c >= 0 && c < CROSSWORD_GRID_SIZE) { p->letters[r][c] = q->letters[n]; p->occupied[r][c] = 1; }
        }
    }
}

int crossword_load_payload(const char *payload, size_t payload_size, CrosswordPuzzle *out, char *error, size_t error_size) {
    Json j = {payload, payload + payload_size, error, error_size}; char key[64]; int status = 0; int have_body = 0;
    memset(out, 0, sizeof(*out)); if (error && error_size) error[0] = '\0';
    if (!expect(&j, '{')) return 0;
    ws(&j); while (j.p < j.end && *j.p != '}') {
        if (!string(&j, key, sizeof(key)) || !expect(&j, ':')) return 0;
        if (strcmp(key, "statusCode") == 0) { if (!integer(&j, &status)) return 0; }
        else if (strcmp(key, "body") == 0) {
            if (!expect(&j, '{')) return 0; have_body = 1; ws(&j);
            while (j.p < j.end && *j.p != '}') {
                if (!string(&j, key, sizeof(key)) || !expect(&j, ':')) return 0;
                if (strcmp(key, "across") == 0) { if (!section(&j, out, CROSSWORD_ACROSS)) return 0; }
                else if (strcmp(key, "down") == 0) { if (!section(&j, out, CROSSWORD_DOWN)) return 0; }
                else if (!skip_value(&j)) return 0;
                ws(&j); if (j.p < j.end && *j.p == '}') break; if (!expect(&j, ',')) return 0; ws(&j);
            }
            if (!expect(&j, '}')) return 0;
        } else if (!skip_value(&j)) return 0;
        ws(&j); if (j.p < j.end && *j.p == '}') break; if (!expect(&j, ',')) return 0; ws(&j);
    }
    if (!expect(&j, '}') || status != 200 || !have_body) { if (!error || !error[0]) snprintf(error, error_size, "invalid puzzle status or body"); return 0; }
    build_grid(out);
    if (!crossword_validate(out, error, error_size)) return 0;
    return 1;
}

static int b64(char c) { if (c >= 'A' && c <= 'Z') return c - 'A'; if (c >= 'a' && c <= 'z') return c - 'a' + 26; if (c >= '0' && c <= '9') return c - '0' + 52; if (c == '-' || c == '+') return 62; if (c == '_' || c == '/') return 63; return -1; }

static char *decode_payload(const char *token, size_t size, size_t *out_size) {
    const char *a = memchr(token, '.', size), *b; size_t start, n = 0, i; int v[4], k = 0; char *out;
    if (!a) return NULL; b = memchr(a + 1, '.', (size_t)(token + size - a - 1)); if (!b) b = token + size;
    start = (size_t)(a + 1 - token); out = malloc((size_t)(b - a) * 3 / 4 + 4); if (!out) return NULL;
    for (i = start; i < (size_t)(b - token); i++) { int x = b64(token[i]); if (x < 0) continue; v[k++] = x; if (k == 4) { out[n++] = (char)((v[0] << 2) | (v[1] >> 4)); out[n++] = (char)((v[1] << 4) | (v[2] >> 2)); out[n++] = (char)((v[2] << 6) | v[3]); k = 0; } }
    if (k == 2) out[n++] = (char)((v[0] << 2) | (v[1] >> 4)); else if (k == 3) { out[n++] = (char)((v[0] << 2) | (v[1] >> 4)); out[n++] = (char)((v[1] << 4) | (v[2] >> 2)); }
    out[n] = '\0'; *out_size = n; return out;
}

int crossword_load_file(const char *path, CrosswordPuzzle *out, char *error, size_t error_size) {
    FILE *f; long size; char *data, *payload = NULL; size_t n, payload_size; int ok;
    f = fopen(path, "rb"); if (!f) { snprintf(error, error_size, "cannot open %s", path); return 0; }
    if (fseek(f, 0, SEEK_END) != 0 || (size = ftell(f)) < 0 || fseek(f, 0, SEEK_SET) != 0) { fclose(f); snprintf(error, error_size, "cannot seek %s", path); return 0; }
    data = malloc((size_t)size + 1); if (!data) { fclose(f); snprintf(error, error_size, "out of memory"); return 0; }
    n = fread(data, 1, (size_t)size, f); fclose(f); data[n] = '\0';
    if (strstr(data, "\"encode_data\"") != NULL) {
        char token[65536] = {0}; Json j = {data, data + n, error, error_size}; char key[64];
        if (!expect(&j, '{')) { free(data); return 0; }
        while (j.p < j.end && *j.p != '}') { if (!string(&j, key, sizeof(key)) || !expect(&j, ':')) { free(data); return 0; } if (strcmp(key, "encode_data") == 0) { if (!string(&j, token, sizeof(token))) { free(data); return 0; } } else if (!skip_value(&j)) { free(data); return 0; } ws(&j); if (j.p < j.end && *j.p == '}') break; if (!expect(&j, ',')) { free(data); return 0; } }
        if (!token[0]) { free(data); snprintf(error, error_size, "missing encode_data"); return 0; }
        payload = decode_payload(token, strlen(token), &payload_size); free(data); if (!payload) { snprintf(error, error_size, "invalid encode_data"); return 0; }
        ok = crossword_load_payload(payload, payload_size, out, error, error_size); free(payload); return ok;
    }
    ok = crossword_load_payload(data, n, out, error, error_size); free(data); return ok;
}

static void print_cp(uint32_t cp) {
    if (cp < 0x80) putchar((int)cp);
    else if (cp < 0x800) printf("%c%c", (int)(0xc0 | (cp >> 6)), (int)(0x80 | (cp & 0x3f)));
    else if (cp < 0x10000) printf("%c%c%c", (int)(0xe0 | (cp >> 12)), (int)(0x80 | ((cp >> 6) & 0x3f)), (int)(0x80 | (cp & 0x3f)));
    else printf("%c%c%c%c", (int)(0xf0 | (cp >> 18)), (int)(0x80 | ((cp >> 12) & 0x3f)), (int)(0x80 | ((cp >> 6) & 0x3f)), (int)(0x80 | (cp & 0x3f)));
}

void crossword_print_summary(const CrosswordPuzzle *p) {
    int r, c; size_t i, n;
    printf("grid=10x10 clues=%zu\n", p->clue_count);
    for (r = 0; r < 10; r++) { for (c = 0; c < 10; c++) { if (p->occupied[r][c]) { print_cp(p->letters[r][c]); } else putchar('.'); if (c != 9) putchar(' '); } putchar('\n'); }
    for (i = 0; i < p->clue_count; i++) { const CrosswordClue *q = &p->clues[i]; printf("%s %02d @%d,%d ", q->direction == CROSSWORD_ACROSS ? "across" : "down", q->number, q->row, q->col); for (n = 0; n < q->letter_count; n++) print_cp(q->letters[n]); putchar('\n'); }
}

void crossword_free(CrosswordPuzzle *p) { (void)p; }
